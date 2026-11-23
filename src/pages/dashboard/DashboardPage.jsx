import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ScanFace,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  CalendarRange,
  Receipt,
  Truck,
  Wallet,
  FileText,
  CheckSquare,
  Sparkles,
  Laptop,
  Building2,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { StatCard, StatusBadge } from '../../components/common';
import { useDailySummary, useBackendHealth } from '../../api/attendanceApi';
import { useQuotations, useSalesInvoices, useDeliveryChallans } from '../../api/transactionApi';
import { useCustomerReceipts } from '../../api/receiptApi';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  // Retrieve current active authenticated user & company context
  let currentUser = {};
  try {
    currentUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
  } catch {
    currentUser = {};
  }
  const isSuperAdmin =
    currentUser.role === 'SuperAdmin' || currentUser.role_code === 'SuperAdmin';
  const displayName = currentUser.name || currentUser.user_name || 'Administrator';
  const roleTitle = isSuperAdmin ? 'Super Administrator' : 'System Administrator';

  let currentCompany = {};
  try {
    currentCompany = JSON.parse(localStorage.getItem('scoto_company') || '{}');
  } catch {
    currentCompany = { name: 'Scoto Systec Private Ltd' };
  }

  let currentLocation = {};
  try {
    currentLocation = JSON.parse(localStorage.getItem('scoto_location') || '{}');
  } catch {
    currentLocation = { name: 'UNIT I' };
  }

  // Attendance & Health APIs
  const { data: health } = useBackendHealth();
  const { data: rawDailySummary, isLoading: isDailyLoading } = useDailySummary({
    target_date: todayStr,
  });

  // Approvals & Commercial APIs
  const { data: rawQuotations, isLoading: isQuotesLoading } = useQuotations();
  const { data: rawInvoices, isLoading: isInvoicesLoading } = useSalesInvoices();
  const { data: rawChallans } = useDeliveryChallans();
  const { data: rawReceipts } = useCustomerReceipts();

  // Bulletproof array unwrapping for all API response structures
  const dailySummary = Array.isArray(rawDailySummary)
    ? rawDailySummary
    : Array.isArray(rawDailySummary?.data)
      ? rawDailySummary.data
      : Array.isArray(rawDailySummary?.items)
        ? rawDailySummary.items
        : [];

  const quotations = Array.isArray(rawQuotations)
    ? rawQuotations
    : Array.isArray(rawQuotations?.data)
      ? rawQuotations.data
      : [];

  const invoices = Array.isArray(rawInvoices)
    ? rawInvoices
    : Array.isArray(rawInvoices?.data)
      ? rawInvoices.data
      : [];

  const challans = Array.isArray(rawChallans)
    ? rawChallans
    : Array.isArray(rawChallans?.data)
      ? rawChallans.data
      : [];

  const receipts = Array.isArray(rawReceipts)
    ? rawReceipts
    : Array.isArray(rawReceipts?.items)
      ? rawReceipts.items
      : Array.isArray(rawReceipts?.data)
        ? rawReceipts.data
        : [];

  // -----------------------------------------------------------------
  // Workforce Calculations
  // -----------------------------------------------------------------
  const totalHeadcount = dailySummary.length || 0;
  const fullDayCount = dailySummary.filter(
    (t) => t.status === 'FULL_DAY' || t.status === 'PRESENT_CONFIRMED' || t.status === 'ON_DUTY'
  ).length;
  const halfDayCount = dailySummary.filter((t) => t.status === 'HALF_DAY').length;
  const presentCount = fullDayCount + halfDayCount;
  const lateOrShortCount = dailySummary.filter(
    (t) =>
      t.status === 'SHORT_HOURS' ||
      t.status === 'SINGLE_PUNCH_ANOMALY' ||
      t.status === 'NO_CHECK_IN_REVIEW' ||
      t.status === 'DEVICE_ISSUE'
  ).length;
  const absentCount = dailySummary.filter(
    (t) => t.status === 'ABSENT' || t.status === 'ABSENT_CONFIRMED' || t.status === 'LOP'
  ).length;
  const attendanceRate =
    totalHeadcount > 0 ? Math.round((presentCount / totalHeadcount) * 100) : 0;
  const activePunches = dailySummary.filter((t) => t.first_in);

  // -----------------------------------------------------------------
  // Approvals & Pending Action Calculations
  // -----------------------------------------------------------------
  const pendingQuotations = (quotations || []).filter((q) => {
    const s = String(q.ApprovalStatus || '').trim().toLowerCase();
    return s !== '1' && s !== 'approved';
  });

  const pendingInvoices = (invoices || []).filter((inv) => {
    const s = String(inv.ApprovalStatus || '').trim().toLowerCase();
    return s !== '1' && s !== 'approved';
  });

  const totalPendingApprovals = pendingQuotations.length + pendingInvoices.length;

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

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {displayName}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                isSuperAdmin
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleTitle}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operations, pending approvals, and workforce vitals for {todayStr}
          </p>
        </div>

        {/* Company & Location Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>{currentCompany.name || 'SCOTO SYSTEC'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span>{currentLocation.name || 'UNIT I'}</span>
          </div>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Workforce Pulse */}
        <StatCard
          title="Staff Attendance"
          value={`${presentCount} / ${totalHeadcount}`}
          icon={Users}
          color="emerald"
          badge={<span className="text-xs font-bold text-emerald-600">({attendanceRate}%)</span>}
          trend={`${fullDayCount} Full Day • ${absentCount} Absent`}
          trendType={attendanceRate >= 80 ? 'up' : 'down'}
          changeLabel="Synchronized with face biometrics"
          onClick={() => navigate('/attendance/unified-daily')}
        />

        {/* Metric 2: Action Center Approvals */}
        <StatCard
          title="Pending Approvals"
          value={`${totalPendingApprovals} Items`}
          icon={CheckSquare}
          color="amber"
          badge={
            totalPendingApprovals > 0 ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                Action Required
              </span>
            ) : null
          }
          trend={`${pendingQuotations.length} Quotes • ${pendingInvoices.length} Invoices`}
          trendType={totalPendingApprovals > 0 ? 'down' : 'up'}
          changeLabel="Awaiting executive authorization"
          onClick={() => navigate('/transaction/quotation-approval')}
        />

        {/* Metric 3: Commercial Dispatches & Receipts */}
        <StatCard
          title="Commercial Vitals"
          value={`${challans.length} Dispatches`}
          icon={Truck}
          color="indigo"
          trend={`${receipts.length} Customer Receipts recorded`}
          trendType="neutral"
          changeLabel="Delivery challans & receipts"
          onClick={() => navigate('/transaction/delivery-challan')}
        />

        {/* Metric 4: Terminal & Security Sentinel */}
        <StatCard
          title="Biometric & 2FA Status"
          value={health?.status === 'healthy' ? 'Online' : 'Active'}
          icon={ShieldCheck}
          color="purple"
          trend="Terminal Synced"
          trendType="up"
          changeLabel="Adaptive 2FA & Server Secure"
          onClick={() => navigate('/attendance')}
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Action Center & Biometric Punches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Pending Approvals & Action Center */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-amber-600" />
                  Executive Approvals & Action Center
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial documents requiring administrator sign-off
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/transaction/quotation-approval')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Quote Approvals ({pendingQuotations.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => navigate('/transaction/sales-invoice-approval')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Invoice Approvals ({pendingInvoices.length})
                </button>
              </div>
            </div>

            <div className="mt-4">
              {totalPendingApprovals === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-800">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">All Approvals Clear!</span>
                    <p className="text-[11px] text-emerald-700/90 mt-0.5">
                      No quotations or sales invoices are currently waiting for administrative review.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Pending Quotations Preview */}
                  {pendingQuotations.slice(0, 3).map((q) => (
                    <div
                      key={q.QuotationNo || q.TransNo}
                      className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs">
                          QUO
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {q.CustomerName || 'Direct Customer'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Ref: {q.QuotationNo || q.TransNo} • {q.QuotationDate || todayStr}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/transaction/quotation-approval')}
                        className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-200 hover:bg-amber-50 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Authorize</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Pending Invoices Preview */}
                  {pendingInvoices.slice(0, 3).map((inv) => (
                    <div
                      key={inv.SalesInvoiceNo || inv.TransNo}
                      className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                          INV
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {inv.CustomerName || 'Factory Client'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Ref: {inv.SalesInvoiceNo || inv.TransNo} • {inv.InvoiceDate || todayStr}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/transaction/sales-invoice-approval')}
                        className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Authorize</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section B: Live Face Biometric Punches */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-indigo-600" />
                  Today's Live Biometric Punches
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified terminal timestamps for {todayStr}
                </p>
              </div>
              <button
                onClick={() => navigate('/attendance/unified-daily')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                View Unified Desk
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {isDailyLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Loading today's biometric attendance records...
                </div>
              ) : activePunches.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No biometric punches recorded yet for today ({todayStr}).
                </div>
              ) : (
                activePunches.slice(0, 6).map((item) => (
                  <div
                    key={item.employee_code}
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                        {item.employee_name ? item.employee_name.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{item.employee_name}</span>
                          <StatusBadge status={item.status} size="sm" showDot={false} />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ID: <span className="font-mono text-indigo-600 font-medium">{item.employee_code}</span> • {item.total_punches} punches
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold text-slate-700">
                        IN: {formatTimeOnly(item.first_in)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        OUT: {formatTimeOnly(item.last_out)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Commercial Operations & Security Sentinel */}
        <div className="space-y-6">
          {/* Section C: Commercial & Dispatch Shortcuts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Commercial Operations Desk
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Delivery dispatches, customer receipts & petty cash
            </p>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/transaction/delivery-challan')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Delivery Challans</div>
                    <div className="text-[10px] text-slate-500">Client dispatches & goods movement</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => navigate('/transaction/receipts')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Customer Receipts</div>
                    <div className="text-[10px] text-slate-500">Advances & invoice payments</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => navigate('/transaction/office-expense')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Petty Cash & Expenses</div>
                    <div className="text-[10px] text-slate-500">Daily office usage & vouchers</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => navigate('/transaction/travel-expense')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-purple-100 text-purple-700">
                    <CalendarRange className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Travel Expenses</div>
                    <div className="text-[10px] text-slate-500">Field staff claims & allowances</div>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Section D: Security & Workspace Sentinel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                Security & Terminal Sentinel
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Office server health & access compliance
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Laptop className="h-4 w-4 text-slate-400" />
                  <span>Adaptive 2FA Device Trust</span>
                </div>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Registered Staff Roster</span>
                </div>
                <span className="font-bold font-mono text-slate-900">
                  {totalHeadcount} Employees
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <ScanFace className="h-4 w-4 text-slate-400" />
                  <span>Biometric Terminal Sync</span>
                </div>
                <span className="font-bold text-indigo-600 text-[11px]">
                  Real-time
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/employees')}
              className="mt-3.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <span>Manage Staff Directory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
