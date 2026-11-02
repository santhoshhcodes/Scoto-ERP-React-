import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Clock,
  ShieldCheck,  
  Check,
  XCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { StatCard, StatusBadge, Modal } from '../../components/common';
import { exportDailyLateFinesExcel, exportMonthlyLateFinesExcel, exportToExcel } from '../../utils/excelUtils';
import {
  attendanceApi,
  useDailySummary,
  useBackendHealth,
  useSaveLateFine,
} from '../../api/attendanceApi';

export const ManualLateFinePage = () => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [fineStatusFilter, setFineStatusFilter] = useState('');
  const [lateOnlyFilter, setLateOnlyFilter] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isExportingMonthly, setIsExportingMonthly] = useState(false);

  // Fine Edit Modal State
  const [selectedFineRecord, setSelectedFineRecord] = useState(null);
  const [permissionMinutesInput, setPermissionMinutesInput] = useState('0');
  const [fineAmountInput, setFineAmountInput] = useState('');
  const [fineStatusInput, setFineStatusInput] = useState('CONFIRMED');
  const [fineReasonInput, setFineReasonInput] = useState('');
  const [enteredByInput, setEnteredByInput] = useState('');
  const [modalError, setModalError] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to compute late minutes dynamically:
  // - If permission is applied (>0): allowed cutoff is 09:30 + permission_minutes. Check-in after cutoff is late (punch - cutoff).
  // - If no permission (=0): grace cutoff is 09:40. If punch <= 09:40 -> 0 mins late.
  //   If punch > 09:40 -> 10-minute grace is forfeited! Late delay is calculated from 09:30 (e.g. 09:59 is 29 mins late).
  const computeLateMinutes = (firstInIso, permMinutes = 0) => {
    if (!firstInIso) return 0;
    try {
      const punch = new Date(firstInIso);
      if (isNaN(punch.getTime())) return 0;
      const perm = Number(permMinutes) || 0;

      const shiftStart = new Date(punch);
      shiftStart.setHours(9, 30, 0, 0);

      if (perm > 0) {
        const allowed = new Date(shiftStart.getTime() + perm * 60 * 1000);
        if (punch.getTime() <= allowed.getTime()) return 0;
        return Math.floor((punch.getTime() - allowed.getTime()) / (1000 * 60));
      } else {
        const graceCutoff = new Date(shiftStart.getTime() + 10 * 60 * 1000); // 09:40 AM
        if (punch.getTime() <= graceCutoff.getTime()) return 0;
        // Past 09:40 -> Grace forfeited, calculate late from 09:30 (e.g. 09:59 is 29 mins late)
        return Math.floor((punch.getTime() - shiftStart.getTime()) / (1000 * 60));
      }
    } catch {
      return 0;
    }
  };

  // Queries
  const { data: healthData } = useBackendHealth();
  const {
    data: dailyRecords = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDailySummary({
    target_date: selectedDate,
    limit: 500,
  });

  const saveLateFineMutation = useSaveLateFine();

  // Helper formatting for timestamps
  const formatTimeOnly = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Open Fine Modal
  const handleOpenFineModal = (record) => {
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      setEnteredByInput(authUser.name || authUser.username || authUser.user_id || 'HR Admin');
    } catch {
      setEnteredByInput('HR Admin');
    }

    setSelectedFineRecord(record);
    const initialPerm = record.permission_minutes || 0;
    setPermissionMinutesInput(String(initialPerm));

    const late = record.first_in ? computeLateMinutes(record.first_in, initialPerm) : 0;
    if (late === 0) {
      setFineAmountInput('0');
      setFineStatusInput('WAIVED');
    } else {
      setFineAmountInput(record.fine_amount ? String(record.fine_amount) : '100');
      setFineStatusInput(record.fine_status === 'WAIVED' ? 'WAIVED' : 'CONFIRMED');
    }
    setFineReasonInput(record.review_reason || '');
    setModalError('');
  };

  // Quick 1-click Waive for single operator
  const handleQuickWaive = async (record, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const enteredBy = authUser.name || authUser.username || authUser.user_id || 'HR Admin';
      await saveLateFineMutation.mutateAsync({
        employee_code: record.employee_code,
        attendance_date: record.target_date || selectedDate,
        actual_check_in: record.first_in || null,
        shift_start_time: record.shift_start_time || '09:30',
        allowed_until: record.allowed_until || null,
        permission_minutes_applied: record.permission_minutes || 0,
        late_minutes: record.late_minutes || 0,
        fine_amount: 0,
        fine_status: 'WAIVED',
        reason: 'Late penalty waived directly by attendance in-charge',
        entered_by: enteredBy,
      });
      showToast(`Fine waived (₹0) for ${record.employee_name || record.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to waive fine.', 'error');
    }
  };

  // Quick 1-click Confirm Fine for single operator
  const handleQuickFine = async (record, amount = 100, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const enteredBy = authUser.name || authUser.username || authUser.user_id || 'HR Admin';
      await saveLateFineMutation.mutateAsync({
        employee_code: record.employee_code,
        attendance_date: record.target_date || selectedDate,
        actual_check_in: record.first_in || null,
        shift_start_time: record.shift_start_time || '09:30',
        allowed_until: record.allowed_until || null,
        permission_minutes_applied: record.permission_minutes || 0,
        late_minutes: record.late_minutes || 0,
        fine_amount: amount,
        fine_status: 'CONFIRMED',
        reason: `Late arrival fine confirmed (₹${amount}) by attendance in-charge`,
        entered_by: enteredBy,
      });
      showToast(`Late fine of ₹${amount} confirmed for ${record.employee_name || record.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to confirm fine.', 'error');
    }
  };

  // Handle permission input changes dynamically
  const handlePermissionChange = (val) => {
    setPermissionMinutesInput(val);
    const perm = Number(val) || 0;
    if (selectedFineRecord?.first_in) {
      const late = computeLateMinutes(selectedFineRecord.first_in, perm);
      if (late === 0) {
        setFineStatusInput('WAIVED');
        setFineAmountInput('0');
      } else {
        if (fineStatusInput === 'WAIVED') {
          setFineStatusInput('CONFIRMED');
          setFineAmountInput(selectedFineRecord.fine_amount ? String(selectedFineRecord.fine_amount) : '100');
        }
      }
    }
  };

  // Submit Fine Mutation
  const handleSaveFine = async (e) => {
    e.preventDefault();
    if (!selectedFineRecord) return;
    setModalError('');

    const permMins = Number(permissionMinutesInput) || 0;
    const computedLate = selectedFineRecord.first_in
      ? computeLateMinutes(selectedFineRecord.first_in, permMins)
      : 0;

    const finalStatus = computedLate === 0 ? 'WAIVED' : (fineStatusInput === 'WAIVED' ? 'WAIVED' : 'CONFIRMED');
    const finalAmount = finalStatus === 'WAIVED' || computedLate === 0 ? 0 : Number(fineAmountInput);

    if (finalStatus === 'CONFIRMED' && (!finalAmount || Number(finalAmount) <= 0)) {
      setModalError('Please specify a valid fine amount (INR) before confirming.');
      return;
    }

    if (!enteredByInput.trim()) {
      setModalError('Entered by name/ID is required.');
      return;
    }

    try {
      await saveLateFineMutation.mutateAsync({
        employee_code: selectedFineRecord.employee_code,
        attendance_date: selectedFineRecord.target_date || selectedDate,
        actual_check_in: selectedFineRecord.first_in || null,
        shift_start_time: selectedFineRecord.shift_start_time || '09:30',
        allowed_until: selectedFineRecord.allowed_until || null,
        permission_minutes_applied: permMins,
        late_minutes: computedLate,
        fine_amount: finalAmount,
        fine_status: finalStatus,
        reason: fineReasonInput.trim() || (permMins > 0 ? `Manual permission applied (${permMins} mins)` : undefined),
        entered_by: enteredByInput.trim(),
      });

      setSelectedFineRecord(null);
      showToast(`Late fine adjustment confirmed for ${selectedFineRecord.employee_code}.`);
    } catch (err) {
      setModalError(err.message || 'Failed to persist late fine adjustment.');
    }
  };

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(dailyRecords)) return [];
    const cleanSearch = searchTerm.trim().toLowerCase();
    return dailyRecords.filter((rec) => {
      const matchesSearch =
        !cleanSearch ||
        rec.employee_name?.toLowerCase().includes(cleanSearch) ||
        rec.first_name?.toLowerCase().includes(cleanSearch) ||
        rec.last_name?.toLowerCase().includes(cleanSearch) ||
        rec.display_name?.toLowerCase().includes(cleanSearch) ||
        String(rec.employee_code || '').toLowerCase().includes(cleanSearch) ||
        String(rec.essl_employee_code || '').toLowerCase().includes(cleanSearch);

      let matchesStatus = true;
      if (fineStatusFilter === 'UNPROCESSED') {
        matchesStatus = Boolean(
          rec.first_in &&
          rec.late_minutes > 0 &&
          rec.fine_status !== 'CONFIRMED' &&
          rec.fine_status !== 'WAIVED'
        );
      } else if (fineStatusFilter === 'CONFIRMED') {
        matchesStatus = rec.fine_status === 'CONFIRMED';
      } else if (fineStatusFilter === 'WAIVED') {
        matchesStatus = rec.fine_status === 'WAIVED';
      }

      // Late Only filter excludes unpunched and on-time staff
      const isLate = Boolean(rec.first_in && rec.late_minutes > 0);
      const matchesLate = !lateOnlyFilter || isLate;

      return matchesSearch && matchesStatus && matchesLate;
    });
  }, [dailyRecords, searchTerm, fineStatusFilter, lateOnlyFilter]);

  // Statistics KPI computation from real DB records
  const stats = useMemo(() => {
    const totalStaff = dailyRecords.length;
    const notPunchedCount = dailyRecords.filter((r) => !r.first_in).length;
    const lateEmployees = dailyRecords.filter((r) => r.first_in && r.late_minutes > 0);
    const lateCount = lateEmployees.length;

    let confirmedAmount = 0;
    let confirmedCount = 0;
    let unprocessedLateCount = 0;
    let waivedCount = 0;

    dailyRecords.forEach((r) => {
      if (r.fine_status === 'CONFIRMED') {
        confirmedCount++;
        if (r.fine_amount) {
          confirmedAmount += Number(r.fine_amount);
        }
      } else if (r.fine_status === 'WAIVED') {
        waivedCount++;
      } else if (r.first_in && r.late_minutes > 0) {
        unprocessedLateCount++;
      }
    });

    return {
      totalStaff,
      notPunchedCount,
      lateCount,
      confirmedCount,
      confirmedAmount,
      unprocessedLateCount,
      waivedCount,
    };
  }, [dailyRecords]);

  // Export Daily Late Fines to Excel (Per-Day)
  const handleExportDaily = async () => {
    if (!filteredRecords.length) {
      showToast('No fine records found to export for this date.', 'error');
      return;
    }

    try {
      await exportDailyLateFinesExcel(filteredRecords, selectedDate, {
        company_name: 'SCOTO',
      });
      showToast(`Daily late fine register for ${selectedDate} exported to Excel.`);
    } catch (err) {
      showToast(err.message || 'Failed to export daily late fines.', 'error');
    }
  };

  // Export Monthly Late Fines to Excel (Monthly)
  const handleExportMonthly = async () => {
    try {
      setIsExportingMonthly(true);
      const d = new Date(selectedDate);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      showToast(`Preparing monthly late fine register for ${month}/${year}...`);
      const monthlyRecords = await attendanceApi.getMonthlyLateFines({
        month,
        year,
        employee_code: searchTerm,
      });

      const allEmps = Array.isArray(dailyRecords)
        ? dailyRecords.map((r) => ({
            employee_code: r.employee_code,
            employee_name: r.employee_name,
          }))
        : [];

      if ((!monthlyRecords || !monthlyRecords.length) && !allEmps.length) {
        showToast('No employee or fine records found for this month.', 'error');
        return;
      }

      await exportMonthlyLateFinesExcel(monthlyRecords || [], month, year, {
        company_name: 'SCOTO',
        allEmployees: allEmps,
      });
      showToast(`Monthly late fine register for ${month}/${year} exported successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to export monthly late fines.', 'error');
    } finally {
      setIsExportingMonthly(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-xs animate-in fade-in ${toastType === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
        >
          <div className="flex items-center gap-2">
            {toastType === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="cursor-pointer opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Late Check-In & Direct Fine Assessment
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Direct Confirmation Mode
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Single-operator penalty assessment: directly confirm late fines or waive penalties without approval delays
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export to Excel (Daily & Monthly) */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={handleExportDaily}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 shadow-2xs cursor-pointer transition-colors"
              title={`Download daily late fine register for ${selectedDate}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Day</span>
            </button>
            <button
              type="button"
              onClick={handleExportMonthly}
              disabled={isExportingMonthly}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 shadow-2xs cursor-pointer transition-colors disabled:opacity-60"
              title="Download entire month late fine matrix (Calendar grid with Employee Names, Dates, Fines, Permissions & Totals)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
              <span>{isExportingMonthly ? 'Exporting...' : 'Export Month'}</span>
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Monitored Workforce"
          value={`${stats.totalStaff}`}
          icon={Calendar}
          color="indigo"
          changeLabel={`Date: ${selectedDate}${stats.notPunchedCount > 0 ? ` (${stats.notPunchedCount} unpunched)` : ''}`}
        />

        <StatCard
          title="Late Arrivals"
          value={`${stats.lateCount}`}
          icon={Clock}
          color="amber"
          badge={
            <span className="text-xs font-bold text-amber-600">
              ({stats.totalStaff > 0 ? Math.round((stats.lateCount / stats.totalStaff) * 100) : 0}%)
            </span>
          }
          changeLabel="Arrived after 09:40 cutoff"
        />

        <StatCard
          title="Late to Confirm"
          value={`${stats.unprocessedLateCount}`}
          icon={AlertTriangle}
          color="purple"
          changeLabel="Unconfirmed late check-ins"
        />

        <StatCard
          title="Confirmed Fines"
          value={`₹${stats.confirmedAmount.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          changeLabel={`${stats.confirmedCount} staff assessed`}
        />

        <StatCard
          title="Waived Penalties"
          value={`${stats.waivedCount}`}
          icon={ShieldCheck}
          color="teal"
          changeLabel="Exempted / Permitted (₹0)"
        />
      </div>



      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Target Date */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
              selectedDate === yesterdayStr
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Check previous day's late arrivals & penalties"
          >
            ← Previous Day
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
              selectedDate === todayStr
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="View today's live arrival times"
          >
            Today
          </button>

          {/* Fine Status Filter */}
          <select
            value={fineStatusFilter}
            onChange={(e) => setFineStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="">All Fine Statuses</option>
            <option value="UNPROCESSED">Late to Confirm ({stats.unprocessedLateCount})</option>
            <option value="CONFIRMED">Confirmed Fines ({stats.confirmedCount})</option>
            <option value="WAIVED">Waived Penalties ({stats.waivedCount})</option>
          </select>

          {/* Late Only Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={lateOnlyFilter}
              onChange={(e) => setLateOnlyFilter(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Late Check-Ins Only</span>
          </label>

          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee name or code..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>Connection Error</span>
          </div>
          <p className="mt-1 text-rose-700">{error?.message || 'Failed to load records.'}</p>
        </div>
      )}

      {/* Fine Records Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Check-IN</th>
                <th className="px-4 py-3">Permission Offset</th>
                <th className="px-4 py-3">Late Delay</th>
                <th className="px-4 py-3">Fine Status</th>
                <th className="px-4 py-3">Fine Amount</th>
                <th className="px-4 py-3 text-right">Direct Operator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    Loading fine records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                    <p className="font-semibold text-slate-700">No late fines matching criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All employees are on time or filtered out for {selectedDate}.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isLate = Boolean(rec.first_in && rec.late_minutes > 0);
                  const isUnconfirmed = isLate && rec.fine_status !== 'CONFIRMED' && rec.fine_status !== 'WAIVED';

                  return (
                    <tr key={rec.employee_code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 ring-1 ring-slate-200 text-xs">
                            {rec.employee_name ? rec.employee_name.charAt(0).toUpperCase() : 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{rec.employee_name}</div>
                            <div className="font-mono text-[11px] font-semibold text-indigo-600">
                              {rec.employee_code}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-800">
                        {rec.first_in ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-teal-600" />
                            <span className="font-semibold">{formatTimeOnly(rec.first_in)}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Not Punched
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-700">
                        {rec.permission_minutes > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
                            +{rec.permission_minutes}m
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono">
                        {!rec.first_in ? (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            No Punch
                          </span>
                        ) : rec.fine_status === 'WAIVED' || (rec.late_minutes === 0 && rec.permission_minutes > 0) ? (
                          <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
                            Permitted
                          </span>
                        ) : rec.late_minutes > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                            {rec.late_minutes}m late
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            On Time
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            rec.fine_status === 'CONFIRMED'
                              ? 'CONFIRMED'
                              : rec.fine_status === 'WAIVED'
                                ? 'WAIVED'
                                : !rec.first_in
                                  ? 'NONE'
                                  : rec.late_minutes > 0
                                    ? 'UNCONFIRMED'
                                    : 'NONE'
                          }
                          customLabel={
                            rec.fine_status === 'CONFIRMED'
                              ? 'Confirmed'
                              : rec.fine_status === 'WAIVED'
                                ? 'Waived'
                                : isUnconfirmed
                                  ? 'To Confirm'
                                  : undefined
                          }
                          size="sm"
                        />
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {rec.fine_status === 'WAIVED'
                          ? '₹0'
                          : rec.fine_amount
                            ? `₹${rec.fine_amount}`
                            : isUnconfirmed
                              ? '₹100'
                              : '₹0'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUnconfirmed ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleQuickWaive(rec, e)}
                                title="1-Click Waive Fine (₹0)"
                                className="inline-flex items-center gap-1 rounded-md bg-teal-50 border border-teal-200 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 cursor-pointer transition-colors"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                <span>Waive</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleQuickFine(rec, 100, e)}
                                title="1-Click Confirm Fine ₹100"
                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors"
                              >
                                <DollarSign className="h-3 w-3" />
                                <span>Fine ₹100</span>
                              </button>
                            </>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleOpenFineModal(rec)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer"
                            title={rec.fine_status ? 'Edit Confirmation' : 'Custom Assessment'}
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{rec.fine_status ? 'Edit' : 'Custom'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fine Adjustment Modal */}
      {selectedFineRecord && (
        <Modal
          isOpen={Boolean(selectedFineRecord)}
          onClose={() => setSelectedFineRecord(null)}
          title="Late Fine Assessment & Adjustment"
          subtitle={`Employee: ${selectedFineRecord.employee_name} (${selectedFineRecord.employee_code}) • Date: ${selectedFineRecord.target_date || selectedDate}`}
          size="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedFineRecord(null)}
                disabled={saveLateFineMutation.isPending}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFine}
                disabled={saveLateFineMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saveLateFineMutation.isPending ? 'Saving...' : 'Save Fine Record'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveFine} className="space-y-4 text-xs">
            {modalError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                {modalError}
              </div>
            )}

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-slate-700">
              <div>
                <span className="text-[10px] text-slate-500 block">Actual Check-IN:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedFineRecord.first_in ? formatTimeOnly(selectedFineRecord.first_in) : 'No Check-In Recorded'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Effective Late Delay:</span>
                {(() => {
                  if (!selectedFineRecord.first_in) {
                    return <span className="font-mono font-medium text-slate-500">0 mins (Not Punched)</span>;
                  }
                  const calculated = computeLateMinutes(selectedFineRecord.first_in, permissionMinutesInput);
                  if (calculated === 0) {
                    return (
                      <span className="font-mono font-bold text-teal-600">
                        0 mins (On Time / Permitted)
                      </span>
                    );
                  }
                  return (
                    <span className="font-mono font-bold text-rose-600">
                      {calculated} minutes late
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Manual Permission Grant Input */}
            <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-teal-900">
                  Permission Offset (Minutes)
                </label>
                <span className="text-[10px] text-teal-700">Calculated from 09:30 (No Grace Time)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="240"
                  step="15"
                  value={permissionMinutesInput}
                  onChange={(e) => handlePermissionChange(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 font-mono focus:border-teal-500 focus:outline-none"
                />
                <div className="flex gap-1 shrink-0">
                  {[
                    { label: 'None', mins: 0 },
                    { label: '+30m', mins: 30 },
                    { label: '+45m', mins: 45 },
                    { label: '+1h', mins: 60 },
                    { label: '+2h', mins: 120 },
                  ].map((chip) => (
                    <button
                      key={chip.mins}
                      type="button"
                      onClick={() => handlePermissionChange(String(chip.mins))}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${Number(permissionMinutesInput) === chip.mins
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-100'
                        }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              {Number(permissionMinutesInput) > 0 ? (
                <p className="text-[11px] text-teal-700 font-medium mt-1.5 flex items-center gap-1">
                  <Check className="h-3 w-3 text-teal-600" />
                  {permissionMinutesInput} mins permission granted — Must check in by{' '}
                  <strong>
                    {(() => {
                      const d = new Date(`2000-01-01T09:30:00`);
                      d.setMinutes(d.getMinutes() + Number(permissionMinutesInput));
                      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    })()}
                  </strong>{' '}
                  (from 09:30 AM, no grace time)
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Standard check-in: 09:30 AM + 10 mins grace period (Cutoff at <strong>09:40 AM</strong>).
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Fine Status *</label>
                <select
                  value={fineStatusInput}
                  onChange={(e) => setFineStatusInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="CONFIRMED">CONFIRMED (Apply Fine to Ledger)</option>
                  <option value="WAIVED">WAIVED (Waive Penalty / Permitted - ₹0)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Fine Amount (INR) *</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  disabled={fineStatusInput === 'WAIVED'}
                  value={fineStatusInput === 'WAIVED' ? '0' : fineAmountInput}
                  onChange={(e) => setFineAmountInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Reason / Notes</label>
              <textarea
                rows={2}
                value={fineReasonInput}
                onChange={(e) => setFineReasonInput(e.target.value)}
                placeholder="e.g. Traffic delay / Approved verbal permission / Medical checkup..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Entered / Authorized By *</label>
              <input
                type="text"
                required
                value={enteredByInput}
                onChange={(e) => setEnteredByInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ManualLateFinePage;

