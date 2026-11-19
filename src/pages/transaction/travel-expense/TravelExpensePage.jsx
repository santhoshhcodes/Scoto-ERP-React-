import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Wallet,
  Receipt,
  Plus,
  Search,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  MapPin,
  Users,
  Fuel,
  Utensils,
  Hotel,
  Bus,
  FileSpreadsheet,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Building2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useCustomerClients } from '../../../api/customerReportApi';
import {
  useTravelEmployees,
  useTravelClaims,
  useTravelClaim,
  useTravelSummary,
  useCreateTravelClaim,
  useUpdateTravelClaimStatus,
  useDeleteTravelClaim,
} from '../../../api/travelexpenseApi';
import { useExpenseBalance } from '../../../api/expenseApi';
import {
  exportExecutiveTravelExcel,
  exportStaffTravelExcel,
} from './travelExcelUtils';
import { useSortableData, SortableHeader } from '../../../utils/sortUtils';

// Month Names for Monthly Mode
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Category Definitions
const CATEGORY_CONFIG = {
  PETROL: {
    label: 'Petrol / Fuel',
    shortLabel: 'Petrol',
    icon: Fuel,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  FOOD: {
    label: 'Food / Meals',
    shortLabel: 'Food',
    icon: Utensils,
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  ROOM: {
    label: 'Room Stay',
    shortLabel: 'Room',
    icon: Hotel,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    dotColor: 'bg-indigo-500',
  },
  BUS_TICKET: {
    label: 'Bus / Transit',
    shortLabel: 'Bus',
    icon: Bus,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  OTHER: {
    label: 'Other Misc',
    shortLabel: 'Other',
    icon: CreditCard,
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    dotColor: 'bg-slate-500',
  },
};

const formatINR = (val) => {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const TravelExpensePage = () => {
  const navigate = useNavigate();

  // Active Main Tab: 'matrix' (Frequent Traveler Matrix) | 'claims' (Trip Register) | 'analytics'
  const [activeTab, setActiveTab] = useState('matrix');

  // Period View Mode: 'overall' (All-Time) | 'year' (Annual) | 'month' (Single Month)
  const currentDate = new Date();
  const [periodMode, setPeriodMode] = useState('overall');
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  // Derived Date Bounds & Period Label
  const { filterFromDate, filterToDate, periodLabel } = useMemo(() => {
    if (periodMode === 'overall') {
      return {
        filterFromDate: undefined,
        filterToDate: undefined,
        periodLabel: 'All-Time Overall',
      };
    }
    if (periodMode === 'year') {
      return {
        filterFromDate: `${selectedYear}-01-01`,
        filterToDate: `${selectedYear}-12-31`,
        periodLabel: `Year ${selectedYear}`,
      };
    }
    // Monthly mode
    const y = selectedYear;
    const m = selectedMonth;
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const mName = MONTHS[m - 1] || 'Month';
    return {
      filterFromDate: from,
      filterToDate: to,
      periodLabel: `${mName} ${y}`,
    };
  }, [periodMode, selectedYear, selectedMonth]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Filters for Trip Claims Tab
  const [filterEmployeeCode, setFilterEmployeeCode] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirmClaim, setDeleteConfirmClaim] = useState(null);
  const [settleConfirmClaim, setSettleConfirmClaim] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Queries
  const { data: employeesData } = useTravelEmployees();
  const employees = employeesData?.employees || [];

  const {
    data: claimsData,
    isLoading: isClaimsLoading,
    isFetching: isClaimsFetching,
    refetch: refetchClaims,
  } = useTravelClaims({
    employeeCode: filterEmployeeCode !== 'ALL' ? filterEmployeeCode : undefined,
    status: filterStatus !== 'ALL' ? filterStatus : undefined,
    fromDate: filterFromDate,
    toDate: filterToDate,
  });
  const claims = claimsData?.claims || [];

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useTravelSummary({
    fromDate: filterFromDate,
    toDate: filterToDate,
    employeeCode: filterEmployeeCode !== 'ALL' ? filterEmployeeCode : undefined,
  });

  const { data: singleClaimData, isLoading: isSingleClaimLoading } = useTravelClaim(selectedClaimId);

  // Petty Cash balance
  const { data: pettyCashBalance } = useExpenseBalance();
  const availablePettyCash = pettyCashBalance?.available_balance ?? 0;

  // Mutations
  const updateStatusMutation = useUpdateTravelClaimStatus();
  const deleteClaimMutation = useDeleteTravelClaim();

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    if (!searchTerm.trim()) return claims;
    const q = searchTerm.toLowerCase().trim();
    return claims.filter((c) => {
      const code = (c.employee_code || '').toLowerCase();
      const name = (c.employee_name || '').toLowerCase();
      const client = (c.client_name || '').toLowerCase();
      const dest = (c.destination || '').toLowerCase();
      const purpose = (c.purpose || '').toLowerCase();
      const id = String(c.claim_id);
      return (
        code.includes(q) ||
        name.includes(q) ||
        client.includes(q) ||
        dest.includes(q) ||
        purpose.includes(q) ||
        id.includes(q)
      );
    });
  }, [claims, searchTerm]);

  // Overall metric totals
  const overallSummary = summaryData?.overall || {};
  const staffSummaryList = summaryData?.employees || [];
  const categoriesSummaryList = summaryData?.categories || [];

  const categoriesMap = useMemo(() => {
    const map = {};
    categoriesSummaryList.forEach((c) => {
      map[c.expense_category] = Number(c.total_amount || 0);
    });
    return map;
  }, [categoriesSummaryList]);

  // Matrix Summary Totals
  const matrixTotals = useMemo(() => {
    const totalCompanySpend = Number(overallSummary.total_amount || 0);
    const trips = staffSummaryList.reduce((acc, s) => acc + Number(s.claim_count || 0), 0);
    const petrol = staffSummaryList.reduce((acc, s) => acc + Number(s.petrol_amount || 0), 0);
    const food = staffSummaryList.reduce((acc, s) => acc + Number(s.food_amount || 0), 0);
    const bus = staffSummaryList.reduce((acc, s) => acc + Number(s.bus_ticket_amount || 0), 0);
    const room = staffSummaryList.reduce((acc, s) => acc + Number(s.room_amount || 0), 0);
    const other = staffSummaryList.reduce((acc, s) => acc + Number(s.other_amount || 0), 0);
    return { trips, petrol, food, bus, room, other, totalCompanySpend };
  }, [staffSummaryList, overallSummary]);

  // Sortable Matrix & Claims - default latest / highest spend first
  const {
    sortedItems: sortedStaffSummary,
    sortConfig: matrixSortConfig,
    requestSort: requestMatrixSort,
  } = useSortableData(staffSummaryList, { key: 'total_amount', direction: 'desc' });

  const {
    sortedItems: sortedClaims,
    sortConfig: claimsSortConfig,
    requestSort: requestClaimsSort,
  } = useSortableData(filteredClaims, { key: 'claim_id', direction: 'desc' });

  // Settle Claim with Petty Cash
  const handleSettleClaimWithPettyCash = async (claim) => {
    if (!claim) return;
    const claimAmt = Number(claim.total_amount || 0);
    const closingBalance = availablePettyCash - claimAmt;

    if (closingBalance < 0 || availablePettyCash < claimAmt) {
      alert(
        `Payment Blocked: Insufficient Petty Cash Balance.\n\n` +
        `• Current Balance: ₹${Number(availablePettyCash).toFixed(2)}\n` +
        `• Claim Amount: ₹${claimAmt.toFixed(2)}\n` +
        `• Projected Closing Balance: ₹${closingBalance.toFixed(2)}\n\n` +
        `Petty cash closing balance cannot be negative. Please credit / top up Petty Cash before settling this travel claim.`
      );
      showToast(
        `Payment Blocked: Closing balance cannot be negative (₹${closingBalance.toFixed(2)}).`,
        'error'
      );
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await updateStatusMutation.mutateAsync({
        claimId: claim.claim_id,
        status: 'PAID',
        paidDate: today,
        recordPettyCash: true,
      });
      showToast(`Claim #${claim.claim_id} settled from Petty Cash.`);
      setSettleConfirmClaim(null);
      if (showDetailModal && selectedClaimId === claim.claim_id) {
        setShowDetailModal(false);
      }
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Settlement failed.', 'error');
    }
  };

  // Delete Claim
  const handleDeleteClaim = async () => {
    if (!deleteConfirmClaim) return;
    try {
      await deleteClaimMutation.mutateAsync(deleteConfirmClaim.claim_id);
      showToast(`Claim #${deleteConfirmClaim.claim_id} deleted.`);
      setDeleteConfirmClaim(null);
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Delete failed.', 'error');
    }
  };

  // Download Executive Multi-Sheet Excel
  const handleDownloadExecutiveExcel = async () => {
    if (!staffSummaryList.length && !claims.length) {
      showToast(`No travel expenses found for ${periodLabel}.`, 'error');
      return;
    }
    try {
      await exportExecutiveTravelExcel({
        overallSummary,
        staffSummaryList,
        claims,
        categoriesSummaryList,
        periodLabel,
      });
      showToast(`Executive report for ${periodLabel} exported.`);
    } catch (err) {
      showToast('Failed to export Excel report.', 'error');
    }
  };

  // Download Individual Staff Statement
  const handleDownloadIndividualStaffReport = async (staff) => {
    try {
      await exportStaffTravelExcel({
        staff,
        claims,
        periodLabel,
      });
      showToast(`Statement for ${staff.employee_name} exported.`);
    } catch (err) {
      showToast('Failed to export staff statement.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-2xl transition-all ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-80 cursor-pointer font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Controls Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Travel Expenses
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Travel Claims
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Staff travel claims & client visits • Petty Cash integrated
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Module Switcher Pills */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/transaction/office-expense')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Switch to Petty Cash Ledger"
            >
              <Wallet className="h-3.5 w-3.5 text-slate-400" />
              <span>Petty Cash</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/transaction/office-expense-management')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Switch to Daily Items & Bills"
            >
              <Receipt className="h-3.5 w-3.5 text-slate-400" />
              <span>Daily Bills</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 shadow-xs flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-indigo-600" />
              <span>Travel Claims</span>
            </button>
          </div>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleDownloadExecutiveExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
            title="Download Executive Travel Report in Excel"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </button>

          {/* New Claim Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Claim</span>
          </button>
        </div>
      </div>

      {/* Summary Cards: Standard Scoto ERP Card Sizes and Fonts */}
      {/* Summary Cards: Standard Scoto ERP Card Sizes and Fonts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Spend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Travel Spend
            </span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Compass className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
              {formatINR(overallSummary.total_amount)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            {overallSummary.claim_count || 0} claims • {staffSummaryList.length} staff travelers
          </p>
        </div>

        {/* Card 2: Fuel & Petrol */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Petrol & Fuel
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Fuel className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-amber-700 tracking-tight font-mono">
              {formatINR(categoriesMap.PETROL || 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Vehicle conveyance & fuel
          </p>
        </div>

        {/* Card 3: Food & Lodging */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Food & Lodging
            </span>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
              <Hotel className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-sky-700 tracking-tight font-mono">
              {formatINR((categoriesMap.FOOD || 0) + (categoriesMap.ROOM || 0))}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Meals {formatINR(categoriesMap.FOOD || 0)} • Room {formatINR(categoriesMap.ROOM || 0)}
          </p>
        </div>

        {/* Card 4: Petty Cash Settled */}
        <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/70 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Petty Cash Settled
            </span>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-900 tracking-tight font-mono">
              {formatINR(overallSummary.paid_amount)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            Pending reimbursement: {formatINR(overallSummary.pending_amount)}
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Unified Filter Toolbar */}
        <div className="flex flex-col gap-3.5 border-b border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Period View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
              <div className="inline-flex p-1 bg-slate-200/60 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPeriodMode('overall')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodMode === 'overall'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Overall
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('year')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodMode === 'year'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Year ({selectedYear})
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodMode('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodMode === 'month'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Monthly
                </button>
              </div>

              {/* Year Dropdown in Year Mode */}
              {periodMode === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      FY {y}
                    </option>
                  ))}
                </select>
              )}

              {/* Monthly Navigator in Month Mode */}
              {periodMode === 'month' && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="border-none bg-transparent px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="border-none bg-transparent px-1 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Search Box + Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative w-60 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search traveler, client..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  refetchClaims();
                  refetchSummary();
                }}
                className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer shadow-2xs"
                title="Refresh Data"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isClaimsFetching ? 'animate-spin text-indigo-600' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Switcher: Frequent Travelers vs Trip Register vs Category Share */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'matrix'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Frequent Travelers</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${activeTab === 'matrix' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {staffSummaryList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('claims')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'claims'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Trip Register</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${activeTab === 'claims' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {filteredClaims.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Category Share</span>
            </button>
          </div>

          {/* Right: Active Scope Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-semibold">Scope:</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700 font-mono">
              {periodLabel}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: FREQUENT TRAVELER MATRIX (CORE VIEW)               */}
        {/* ========================================================= */}
        {activeTab === 'matrix' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">#</th>
                  <SortableHeader
                    sortKey="employee_name"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    className="px-4 py-3.5"
                  >
                    Staff Traveler
                  </SortableHeader>
                  <SortableHeader
                    sortKey="claim_count"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="center"
                    className="px-4 py-3.5 text-center"
                  >
                    Trips
                  </SortableHeader>
                  <SortableHeader
                    sortKey="petrol_amount"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="right"
                    className="px-4 py-3.5 text-right text-amber-800"
                  >
                    Petrol (₹)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="food_amount"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="right"
                    className="px-4 py-3.5 text-right text-orange-800"
                  >
                    Food (₹)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="bus_ticket_amount"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="right"
                    className="px-4 py-3.5 text-right text-emerald-800"
                  >
                    Bus (₹)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="room_amount"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="right"
                    className="px-4 py-3.5 text-right text-indigo-800"
                  >
                    Room (₹)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="other_amount"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="right"
                    className="px-4 py-3.5 text-right text-slate-700"
                  >
                    Other (₹)
                  </SortableHeader>
                  <SortableHeader
                    sortKey="total_amount"
                    sortConfig={matrixSortConfig}
                    onSort={requestMatrixSort}
                    align="right"
                    className="px-4 py-3.5 text-right font-bold text-slate-900"
                  >
                    Total Spend
                  </SortableHeader>
                  <th className="px-4 py-3.5 text-center">Share</th>
                  <th className="px-4 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isSummaryLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600 mb-2" />
                      <p className="font-semibold">Loading traveler records...</p>
                    </td>
                  </tr>
                ) : staffSummaryList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">
                        No travel expense records for {periodLabel}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedStaffSummary.map((staff, idx) => {
                    const totalCompany = matrixTotals.totalCompanySpend || 1;
                    const staffTotal = Number(staff.total_amount || 0);
                    const sharePct = Math.round((staffTotal / totalCompany) * 100);

                    return (
                      <tr
                        key={staff.employee_code}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Rank */}
                        <td className="px-4 py-3.5 font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>

                        {/* Staff */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{staff.employee_name}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {staff.employee_code}
                            {staff.department_name ? ` • ${staff.department_name}` : ''}
                          </div>
                        </td>

                        {/* Trips */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                            {staff.claim_count}
                          </span>
                        </td>

                        {/* Petrol */}
                        <td className="px-4 py-3.5 text-right font-medium text-amber-900 font-mono">
                          {formatINR(staff.petrol_amount)}
                        </td>

                        {/* Food */}
                        <td className="px-4 py-3.5 text-right font-medium text-orange-900 font-mono">
                          {formatINR(staff.food_amount)}
                        </td>

                        {/* Bus */}
                        <td className="px-4 py-3.5 text-right font-medium text-emerald-900 font-mono">
                          {formatINR(staff.bus_ticket_amount)}
                        </td>

                        {/* Room */}
                        <td className="px-4 py-3.5 text-right font-medium text-indigo-900 font-mono">
                          {formatINR(staff.room_amount)}
                        </td>

                        {/* Other */}
                        <td className="px-4 py-3.5 text-right font-medium text-slate-800 font-mono">
                          {formatINR(staff.other_amount)}
                        </td>

                        {/* Total Spend */}
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 font-mono">
                          {formatINR(staff.total_amount)}
                        </td>

                        {/* Share */}
                        <td className="px-4 py-3.5 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-600 transition-all"
                                style={{ width: `${Math.min(sharePct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-600 font-mono w-8 text-right">
                              {sharePct}%
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setFilterEmployeeCode(staff.employee_code);
                                setActiveTab('claims');
                              }}
                              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                              title="View Trips"
                            >
                              Trips
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadIndividualStaffReport(staff)}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 p-1 text-emerald-700 transition-colors cursor-pointer"
                              title={`Export ${staff.employee_name} Excel`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Totals Row */}
              {staffSummaryList.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 text-sm">
                  <tr>
                    <td colSpan={2} className="px-4 py-3.5 uppercase text-xs tracking-wider text-slate-700">
                      Company Totals:
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono">{matrixTotals.trips}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-amber-900">
                      {formatINR(matrixTotals.petrol)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-orange-900">
                      {formatINR(matrixTotals.food)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-900">
                      {formatINR(matrixTotals.bus)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-indigo-900">
                      {formatINR(matrixTotals.room)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-800">
                      {formatINR(matrixTotals.other)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-base font-extrabold text-indigo-950">
                      {formatINR(matrixTotals.totalCompanySpend)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-mono">100%</td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={handleDownloadExecutiveExcel}
                        className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Excel
                      </button>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ITEMIZED TRIP CLAIMS REGISTER                     */}
        {/* ========================================================= */}
        {activeTab === 'claims' && (
          <div>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white p-3">
              <select
                value={filterEmployeeCode}
                onChange={(e) => setFilterEmployeeCode(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="ALL">All Staff ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.employee_code} value={emp.employee_code}>
                    {emp.employee_code} - {emp.employee_name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending Settlement</option>
                <option value="PAID">Paid via Cash</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Claims Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <SortableHeader
                      sortKey="claim_id"
                      sortConfig={claimsSortConfig}
                      onSort={requestClaimsSort}
                      className="px-4 py-3.5"
                    >
                      Claim & Date
                    </SortableHeader>
                    <SortableHeader
                      sortKey="employee_name"
                      sortConfig={claimsSortConfig}
                      onSort={requestClaimsSort}
                      className="px-4 py-3.5"
                    >
                      Traveler
                    </SortableHeader>
                    <SortableHeader
                      sortKey="client_name"
                      sortConfig={claimsSortConfig}
                      onSort={requestClaimsSort}
                      className="px-4 py-3.5"
                    >
                      Client & Destination
                    </SortableHeader>
                    <th className="px-4 py-3.5 text-left">Attendance Audit</th>
                    <th className="px-4 py-3.5">Breakdown</th>
                    <SortableHeader
                      sortKey="total_amount"
                      sortConfig={claimsSortConfig}
                      onSort={requestClaimsSort}
                      align="right"
                      className="px-4 py-3.5 text-right"
                    >
                      Amount
                    </SortableHeader>
                    <SortableHeader
                      sortKey="status"
                      sortConfig={claimsSortConfig}
                      onSort={requestClaimsSort}
                      align="center"
                      className="px-4 py-3.5 text-center"
                    >
                      Status
                    </SortableHeader>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isClaimsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600 mb-2" />
                        <p className="font-semibold">Loading claims...</p>
                      </td>
                    </tr>
                  ) : filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Compass className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">
                          No travel claims found for {periodLabel}.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sortedClaims.map((claim) => (
                      <tr
                        key={claim.claim_id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* ID & Date */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-bold text-slate-900 font-mono">#{claim.claim_id}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {claim.travel_start_date}
                            {claim.travel_end_date !== claim.travel_start_date && (
                              <> to {claim.travel_end_date}</>
                            )}
                          </div>
                        </td>

                        {/* Staff */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="font-bold text-slate-900">{claim.employee_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{claim.employee_code}</div>
                        </td>

                        {/* Client & Destination */}
                        <td className="px-4 py-3.5 align-top max-w-[220px]">
                          <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                            {claim.client_code && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0">
                                {claim.client_code}
                              </span>
                            )}
                            <span className="truncate">{claim.client_name || 'Direct Visit'}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            <span className="truncate">{claim.destination}</span>
                          </div>
                          <div className="text-xs text-slate-400 italic truncate mt-0.5">
                            "{claim.purpose}"
                          </div>
                        </td>

                        {/* Attendance Audit Badge */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {claim.attendance_audit ? (
                            <div className="flex flex-col gap-1 items-start">
                              {claim.attendance_audit.status === 'VERIFIED' ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-800"
                                  title={claim.attendance_audit.message}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  On-Site Verified
                                </span>
                              ) : claim.attendance_audit.status === 'PARTIAL' ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800"
                                  title={claim.attendance_audit.message}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                  Partial ({claim.attendance_audit.verified_days}/{claim.attendance_audit.working_days}d)
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700"
                                  title={claim.attendance_audit.message}
                                >
                                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                                  No On-Site Record
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-mono">
                                {claim.attendance_audit.verified_days}/{claim.attendance_audit.working_days} working days
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">-</span>
                          )}
                        </td>

                        {/* Category Badges */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            {Number(claim.petrol_amount) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 font-mono">
                                <Fuel className="h-3 w-3" />
                                {formatINR(claim.petrol_amount)}
                              </span>
                            )}
                            {Number(claim.food_amount) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs font-semibold text-orange-800 font-mono">
                                <Utensils className="h-3 w-3" />
                                {formatINR(claim.food_amount)}
                              </span>
                            )}
                            {Number(claim.room_amount) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-800 font-mono">
                                <Hotel className="h-3 w-3" />
                                {formatINR(claim.room_amount)}
                              </span>
                            )}
                            {Number(claim.bus_ticket_amount) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800 font-mono">
                                <Bus className="h-3 w-3" />
                                {formatINR(claim.bus_ticket_amount)}
                              </span>
                            )}
                            {Number(claim.other_amount) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800 font-mono">
                                {formatINR(claim.other_amount)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 align-top text-right font-bold text-slate-900 font-mono">
                          {formatINR(claim.total_amount)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 align-top text-center">
                          {claim.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              PAID
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSettleConfirmClaim(claim)}
                              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2.5 py-1 cursor-pointer transition-colors"
                            >
                              Settle Cash
                            </button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClaimId(claim.claim_id);
                                setShowDetailModal(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmClaim(claim)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Delete Claim"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SPEND DISTRIBUTION                                */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['PETROL', 'FOOD', 'ROOM', 'BUS_TICKET', 'OTHER'].map((catKey) => {
                const conf = CATEGORY_CONFIG[catKey];
                const catData = categoriesSummaryList.find((c) => c.expense_category === catKey) || {
                  total_amount: 0,
                  item_count: 0,
                };
                const total = Number(overallSummary.total_amount) || 1;
                const catAmount = Number(catData.total_amount) || 0;
                const percentage = Math.round((catAmount / total) * 100);
                const Icon = conf.icon;

                return (
                  <div key={catKey} className={`rounded-xl border p-4 shadow-xs ${conf.color}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-white/80">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">{conf.label}</span>
                      </div>
                      <span className="text-sm font-extrabold font-mono">{percentage}%</span>
                    </div>

                    <div className="mt-3 text-xl font-extrabold text-slate-900 font-mono">
                      {formatINR(catAmount)}
                    </div>

                    <div className="mt-2 h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${conf.dotColor} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: NEW TRAVEL CLAIM ENTRY                           */}
      {/* ========================================================= */}
      {showCreateModal && (
        <CreateClaimModal
          onClose={() => setShowCreateModal(false)}
          employees={employees}
          availablePettyCash={availablePettyCash}
          onSuccess={(created) => {
            setShowCreateModal(false);
            showToast(`Claim #${created.claim_id} created.`);
            refetchClaims();
            refetchSummary();
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CLAIM DETAILS MODAL                              */}
      {/* ========================================================= */}
      {showDetailModal && selectedClaimId && (
        <ClaimDetailModal
          claimId={selectedClaimId}
          claimData={singleClaimData}
          isLoading={isSingleClaimLoading}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedClaimId(null);
          }}
          onSettle={(claim) => setSettleConfirmClaim(claim)}
          onDelete={(claim) => setDeleteConfirmClaim(claim)}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL 3: SETTLE VIA PETTY CASH CONFIRMATION               */}
      {/* ========================================================= */}
      {settleConfirmClaim && (() => {
        const claimAmt = Number(settleConfirmClaim.total_amount || 0);
        const closingBalance = availablePettyCash - claimAmt;
        const isInsufficient = closingBalance < 0 || availablePettyCash < claimAmt;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    isInsufficient ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Settle via Petty Cash?</h3>
                  <p className="text-xs text-slate-500">Record debit in ledger & mark claim as Paid.</p>
                </div>
              </div>

              {/* Insufficient Petty Cash Alert Banner */}
              {isInsufficient && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-1.5 text-rose-800">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Payment Blocked: Insufficient Petty Cash</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Available balance is <strong>{formatINR(availablePettyCash)}</strong>. Settling this bill of <strong>{formatINR(claimAmt)}</strong> would leave a negative closing balance of <strong>{formatINR(closingBalance)}</strong>. A negative closing balance is strictly prohibited.
                  </p>
                  <p className="text-[11px] font-semibold text-rose-900">
                    Please top up / credit Petty Cash before settling this travel claim.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Staff:</span>
                  <span className="font-bold text-slate-800">{settleConfirmClaim.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trip:</span>
                  <span className="font-semibold text-slate-800">{settleConfirmClaim.destination}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span className="text-slate-700">Claim Amount:</span>
                  <span className="text-slate-900 font-mono text-sm">{formatINR(claimAmt)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="text-slate-500">Current Petty Cash Balance:</span>
                  <span
                    className={`font-mono font-bold ${
                      availablePettyCash >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatINR(availablePettyCash)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <span className={isInsufficient ? 'text-rose-700' : 'text-slate-700'}>
                    Projected Closing Balance:
                  </span>
                  <span
                    className={`font-mono text-sm font-extrabold ${
                      closingBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatINR(closingBalance)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleConfirmClaim(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSettleClaimWithPettyCash(settleConfirmClaim)}
                  disabled={isInsufficient || updateStatusMutation.isPending}
                  title={
                    isInsufficient
                      ? 'Payment blocked: Insufficient Petty Cash balance'
                      : 'Confirm settlement from Petty Cash'
                  }
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all ${
                    isInsufficient
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  }`}
                >
                  {updateStatusMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : isInsufficient ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>
                    {isInsufficient ? 'Cannot Settle (Negative Balance)' : 'Confirm Settlement'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION                              */}
      {/* ========================================================= */}
      {deleteConfirmClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Claim?</h3>
                <p className="text-xs text-slate-500">Removes claim and linked cash debit transaction.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete Claim #{deleteConfirmClaim.claim_id} for{' '}
              <strong>{deleteConfirmClaim.employee_name}</strong> ({formatINR(deleteConfirmClaim.total_amount)})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmClaim(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClaim}
                disabled={deleteClaimMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md cursor-pointer"
              >
                {deleteClaimMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: CREATE CLAIM MODAL (ITEMIZED ENTRY)
// =========================================================================
const CreateClaimModal = ({ onClose, employees, availablePettyCash, onSuccess }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [employeeCode, setEmployeeCode] = useState(employees[0]?.employee_code || '');
  const [travelStartDate, setTravelStartDate] = useState(todayStr);
  const [travelEndDate, setTravelEndDate] = useState(todayStr);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [settleImmediately, setSettleImmediately] = useState(false);

  // Customer clients query from Acc_Mst_Ledger
  const { data: clientsData } = useCustomerClients(clientSearchTerm);
  const clientOptions = Array.isArray(clientsData) ? clientsData : (clientsData?.data || []);

  const [items, setItems] = useState([
    {
      id: 1,
      expense_category: 'PETROL',
      amount: '',
      description: '',
    },
  ]);

  const [formError, setFormError] = useState('');
  const createMutation = useCreateTravelClaim();

  const handleAddItem = (category = 'FOOD') => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        expense_category: category,
        amount: '',
        description: '',
      },
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!employeeCode) {
      setFormError('Please select staff traveler.');
      return;
    }
    if (!destination.trim()) {
      setFormError('Please enter destination.');
      return;
    }
    if (!purpose.trim()) {
      setFormError('Please enter purpose of visit.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const amt = parseFloat(items[i].amount);
      if (isNaN(amt) || amt <= 0) {
        setFormError(`Row #${i + 1} amount must be greater than zero.`);
        return;
      }
    }

    if (settleImmediately && (availablePettyCash < totalAmount || (availablePettyCash - totalAmount) < 0)) {
      setFormError(
        `Immediate settlement blocked: Insufficient Petty Cash (Available: ${formatINR(availablePettyCash)}, Total Claim: ${formatINR(totalAmount)}). Closing balance cannot be negative.`
      );
      return;
    }

    const payload = {
      employee_code: employeeCode,
      travel_start_date: travelStartDate,
      travel_end_date: travelEndDate,
      client_code: selectedClient?.LedgerCode || null,
      client_name: (selectedClient?.LedgerName || clientSearchTerm).trim() || null,
      destination: destination.trim(),
      purpose: purpose.trim(),
      status: settleImmediately ? 'PAID' : 'PENDING',
      paid_date: settleImmediately ? todayStr : null,
      record_petty_cash: settleImmediately,
      items: items.map((it) => ({
        expense_category: it.expense_category,
        amount: parseFloat(it.amount),
        description: it.description?.trim() || null,
      })),
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      onSuccess(res);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to submit claim.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl my-6 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Compass className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900">New Travel Claim Entry</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff Traveler
              </label>
              <select
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800"
                required
              >
                {employees.map((emp) => (
                  <option key={emp.employee_code} value={emp.employee_code}>
                    {emp.employee_code} - {emp.employee_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Client / Company</span>
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearchTerm('');
                    }}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-0.5 cursor-pointer lowercase"
                  >
                    <X className="h-3 w-3" /> clear
                  </button>
                )}
              </label>

              {selectedClient ? (
                <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2 text-xs text-slate-800">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-200/80 text-indigo-900 font-mono font-bold text-[10px] shrink-0">
                      {selectedClient.LedgerCode}
                    </span>
                    <span className="font-bold text-slate-900 truncate">{selectedClient.LedgerName}</span>
                    {selectedClient.City && (
                      <span className="text-slate-500 text-[11px] shrink-0">
                        • {selectedClient.City}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="Search client (e.g. SCM, Titan) or type name..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {isClientDropdownOpen && clientSearchTerm.trim().length > 0 && (
                    <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-xs">
                      {clientOptions && clientOptions.length > 0 ? (
                        clientOptions.slice(0, 8).map((client) => (
                          <div
                            key={client.LedgerCode || client.id}
                            onMouseDown={() => {
                              setSelectedClient(client);
                              setClientSearchTerm(client.LedgerName);
                              if (client.City && !destination) {
                                setDestination(client.City);
                              }
                              setIsClientDropdownOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-slate-700"
                          >
                            <span className="font-semibold text-slate-900 truncate mr-2">{client.LedgerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {client.LedgerCode} {client.City ? `• ${client.City}` : ''}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                          Custom client: "{clientSearchTerm}" will be saved.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={travelStartDate}
                onChange={(e) => setTravelStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={travelEndDate}
                onChange={(e) => setTravelEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City or Site..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Purpose of Visit
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Audit, Install, Demo..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* Expense Rows */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Expense Items
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddItem('PETROL')}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  + Petrol
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('FOOD')}
                  className="rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-bold text-orange-800 hover:bg-orange-100 cursor-pointer"
                >
                  + Food
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('ROOM')}
                  className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 cursor-pointer"
                >
                  + Room
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('BUS_TICKET')}
                  className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                >
                  + Bus
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <select
                    value={item.expense_category}
                    onChange={(e) => handleItemChange(item.id, 'expense_category', e.target.value)}
                    className="w-32 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                  >
                    <option value="PETROL">⛽ Petrol</option>
                    <option value="FOOD">🍱 Food</option>
                    <option value="BUS_TICKET">🚌 Bus</option>
                    <option value="ROOM">🏨 Room</option>
                    <option value="OTHER">📑 Other</option>
                  </select>

                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.amount}
                      onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2.5 py-1.5 text-xs font-bold text-right font-mono"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Details (KM reading, ticket #, bill note)"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  />

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddItem('OTHER')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer pt-1"
            >
              + Add Item Row
            </button>
          </div>

          {/* Settle via Petty Cash Checkbox */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={settleImmediately}
                    onChange={(e) => setSettleImmediately(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 h-4 w-4"
                  />
                  <span>Settle via Petty Cash immediately</span>
                </label>
                <p className="text-xs text-slate-500 pl-6.5 mt-0.5">
                  Marks claim as Paid and creates debit in Petty Cash ledger.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-bold">Total Claim</div>
                <div className="text-xl font-black text-indigo-900 font-mono">
                  {formatINR(totalAmount)}
                </div>
              </div>
            </div>

            {settleImmediately && (
              <div
                className={`rounded-xl p-3 text-xs border space-y-1.5 ${
                  availablePettyCash - totalAmount < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex justify-between font-semibold">
                  <span>Available Petty Cash:</span>
                  <span className="font-mono font-bold">{formatINR(availablePettyCash)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200/60 pt-1">
                  <span>Projected Closing Balance:</span>
                  <span
                    className={`font-mono font-extrabold ${
                      availablePettyCash - totalAmount < 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatINR(availablePettyCash - totalAmount)}
                  </span>
                </div>
                {availablePettyCash - totalAmount < 0 && (
                  <div className="flex items-start gap-1.5 text-rose-700 font-bold pt-1 text-[11px] leading-tight">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Payment blocked: Closing balance would be negative. Uncheck to save as Pending or top up Petty Cash.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-md cursor-pointer"
            >
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>Save Travel Claim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// SUBCOMPONENT: CLAIM DETAIL MODAL
// =========================================================================
const ClaimDetailModal = ({ claimId, claimData, isLoading, onClose, onSettle, onDelete }) => {
  if (isLoading || !claimData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <div className="rounded-2xl bg-white p-6 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-600 mb-2" />
          <span className="text-sm font-semibold text-slate-600">Loading claim #{claimId}...</span>
        </div>
      </div>
    );
  }

  const items = claimData.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl my-6 rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900">Claim #{claimData.claim_id}</h2>
            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${claimData.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
                }`}
            >
              {claimData.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Staff:</span>
              <div className="font-bold text-slate-900 text-sm">
                {claimData.employee_name} ({claimData.employee_code})
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Client:</span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                {claimData.client_code && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[10px] font-bold">
                    {claimData.client_code}
                  </span>
                )}
                <span>{claimData.client_name || '-'}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Destination:</span>
              <div className="font-semibold text-slate-800">{claimData.destination}</div>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px]">Travel Dates:</span>
              <div className="font-medium text-slate-800">
                {claimData.travel_start_date} to {claimData.travel_end_date}
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Purpose:</span>
              <div className="font-medium text-slate-800 italic">"{claimData.purpose}"</div>
            </div>
          </div>

          {/* Attendance & Deployment Cross-Check Card */}
          {claimData.attendance_audit && (
            <div
              className={`rounded-xl border p-4 text-xs space-y-2.5 ${
                claimData.attendance_audit.status === 'VERIFIED'
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                  : claimData.attendance_audit.status === 'PARTIAL'
                  ? 'border-amber-200 bg-amber-50/40 text-amber-950'
                  : 'border-rose-200 bg-rose-50/40 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {claimData.attendance_audit.status === 'VERIFIED' ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : claimData.attendance_audit.status === 'PARTIAL' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      Attendance & Deployment Audit:{' '}
                      <span
                        className={
                          claimData.attendance_audit.status === 'VERIFIED'
                            ? 'text-emerald-700'
                            : claimData.attendance_audit.status === 'PARTIAL'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }
                      >
                        {claimData.attendance_audit.badge_text}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {claimData.attendance_audit.message}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-slate-800">
                    {claimData.attendance_audit.verified_days} / {claimData.attendance_audit.working_days} Days
                  </div>
                  <div className="text-[10px] text-slate-400">On-Site Regularized</div>
                </div>
              </div>

              {/* Day-by-day Deployment Breakdown if available */}
              {claimData.attendance_audit.daily_breakdown &&
                claimData.attendance_audit.daily_breakdown.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/80">
                    <div className="font-semibold text-[11px] text-slate-700 mb-1.5">
                      Day-by-Day Deployment Verification:
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {claimData.attendance_audit.daily_breakdown.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between rounded-lg bg-white/80 border border-slate-200/60 px-2.5 py-1 text-[11px]"
                        >
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-medium text-slate-800">{day.date}</span>
                            <span className="text-slate-400 text-[10px]">({day.day_name})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {day.is_sunday ? (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Sunday Off
                              </span>
                            ) : day.is_onsite ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                On-Site Confirmed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                <AlertCircle className="h-3 w-3 text-rose-600" />
                                Not On-Site ({day.review_status || 'Absent'})
                              </span>
                            )}
                            {day.client_name && (
                              <span className="text-[10px] text-slate-500 max-w-[140px] truncate" title={day.client_name}>
                                • {day.client_name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Warning for unverified or partial claims */}
              {claimData.attendance_audit.status !== 'VERIFIED' && (
                <div className="rounded-lg bg-amber-100/70 border border-amber-300/80 p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Audit Notice:</strong> This traveler was not recorded as On-Site in daily attendance review on some or all of these dates. Please verify attendance regularization before approving or settling this travel claim.
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">
              Itemized Expenses
            </span>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((it, idx) => (
                    <tr key={it.item_id || idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {it.expense_category}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{it.description || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                        {formatINR(it.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t border-slate-200 font-bold">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right text-xs">
                      Total:
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-950 font-mono font-extrabold text-sm">
                      {formatINR(claimData.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onDelete(claimData)}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Delete Claim
          </button>
          <div className="flex gap-2.5">
            {claimData.status !== 'PAID' && (
              <button
                type="button"
                onClick={() => onSettle(claimData)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-md cursor-pointer"
              >
                Settle Cash
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelExpensePage;
