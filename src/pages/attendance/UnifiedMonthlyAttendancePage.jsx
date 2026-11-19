import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Calendar,
  Users,
  Clock,
  Search,
  FileSpreadsheet,
  Download,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  Filter,
  DollarSign,
  ScanFace,
  Briefcase,
  AlertCircle,
  Building2,
  Check,
  Award,
  Sparkles,
} from 'lucide-react';
import { StatCard, StatusBadge, DataTable } from '../../components/common';
import {
  exportETimeTrackLiteOverallReport,
  exportETimeTrackLiteIndividualReport,
  parseDayDetails,
  formatMinutesToHM,
} from '../../utils/excelUtils';
import {
  useMonthlyReport,
  useBackendHealth,
  useDownloadDeviceLogs,
} from '../../api/attendanceApi';
import HolidayManagementModal from './HolidayManagementModal';

/**
 * UnifiedMonthlyAttendancePage
 * -------------------------------------------------------------
 * Pilot / Unified Monthly Attendance & Reporting Hub.
 * Provides Organization-wide Monthly Reports, Day-by-Day (1-31)
 * Individual Employee Drill-downs, and Styled Excel Exports for both.
 *
 * NOTE: Created as an independent pilot page to preserve existing
 * AttendancePage, ManualAttendancePage, and ManualLateFinePage intact.
 */
export const UnifiedMonthlyAttendancePage = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'OVER_LEAVE' | 'LATE_FINES' | 'PERFECT'

  // Selected employee for detailed day-by-day (1 to 31) view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Backend Health Query
  const { data: healthData } = useBackendHealth();

  // Fetch Full Monthly Attendance Data
  const {
    data: monthlyReportData = { employees: [] },
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMonthlyReport({
    month: selectedMonth,
    year: selectedYear,
  });

  // Biometric device sync mutation
  const downloadLogsMutation = useDownloadDeviceLogs();
  const isSyncing = downloadLogsMutation.isPending || isFetching;

  // Handle Sync / Device Download
  const handleSyncLogs = async () => {
    try {
      const result = await downloadLogsMutation.mutateAsync();
      const newLogs = result?.data?.new_inserted ?? result?.new_inserted ?? 0;
      const skipped = result?.data?.duplicates_skipped ?? result?.duplicates_skipped ?? 0;

      await refetch();

      if (newLogs > 0) {
        showToast(
          `Successfully downloaded ${newLogs} new biometric log${newLogs > 1 ? 's' : ''}. Monthly report updated.`,
          'success'
        );
      } else {
        showToast(
          `Biometric logs downloaded. Device is up to date (${skipped} verified, 0 new).`,
          'success'
        );
      }
    } catch (err) {
      showToast(
        err?.response?.data?.detail || err?.message || 'Failed to download biometric logs.',
        'error'
      );
    }
  };

  // Month options (1-12)
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Year options
  const yearOptions = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  // Detect if selected period is in the future
  const isFutureMonth = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    return (
      Number(selectedYear) > curYear ||
      (Number(selectedYear) === curYear && Number(selectedMonth) > curMonth)
    );
  }, [selectedYear, selectedMonth]);

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

  // Enrich employee rows with computed summaries for filtering and quick metrics
  const enrichedEmployees = useMemo(() => {
    const rawList = monthlyReportData?.employees || [];
    return rawList.map((emp) => {
      let overLeaveDays = 0;
      let lateDays = 0;
      let totalLateMins = 0;
      let earlyExitDays = 0;
      let totalEarlyExitMins = 0;
      let confirmedFinesCount = 0;
      let totalFineAmount = 0;
      let permDays = 0;
      let totalPermMins = 0;
      let onDutyCount = 0;
      let onSiteCount = 0;

      (emp.days || []).forEach((day) => {
        const parsed = parseDayDetails(day, emp);
        if (parsed.isOverLeave) overLeaveDays++;
        if (parsed.lateMins > 0) {
          lateDays++;
          totalLateMins += parsed.lateMins;
        }
        if (parsed.earlyExitMins > 0) {
          earlyExitDays++;
          totalEarlyExitMins += parsed.earlyExitMins;
        }
        if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
          confirmedFinesCount++;
          totalFineAmount += parsed.fineAmt;
        }
        if (parsed.permMins > 0) {
          permDays++;
          totalPermMins += parsed.permMins;
        }
        if (parsed.isOnDuty) onDutyCount++;
        if (parsed.isOnSite) onSiteCount++;
      });

      return {
        ...emp,
        overLeaveDays,
        lateDays,
        totalLateMins,
        earlyExitDays,
        totalEarlyExitMins,
        confirmedFinesCount,
        totalFineAmount,
        permDays,
        totalPermMins,
        onDutyCount,
        onSiteCount,
        isPerfectAttendance:
          (emp.absent_days || 0) === 0 &&
          overLeaveDays === 0 &&
          confirmedFinesCount === 0,
      };
    });
  }, [monthlyReportData]);

  // High-level Monthly Metrics
  const metrics = useMemo(() => {
    const totalStaff = enrichedEmployees.length;
    let totalPresentDays = 0;
    let totalAbsentDays = 0;
    let totalOverLeaveAlerts = 0;
    let totalLateIncidents = 0;
    let grandTotalFines = 0;

    enrichedEmployees.forEach((emp) => {
      totalPresentDays += emp.present_days || 0;
      totalAbsentDays += emp.absent_days || 0;
      totalOverLeaveAlerts += emp.overLeaveDays || 0;
      totalLateIncidents += emp.lateDays || 0;
      grandTotalFines += emp.totalFineAmount || 0;
    });

    const avgPresentDays =
      totalStaff > 0 ? (totalPresentDays / totalStaff).toFixed(1) : 0;

    return {
      totalStaff,
      avgPresentDays,
      totalAbsentDays,
      totalOverLeaveAlerts,
      totalLateIncidents,
      grandTotalFines,
    };
  }, [enrichedEmployees]);

  // Tab Filtering & Search Filtering
  const filteredEmployees = useMemo(() => {
    return enrichedEmployees.filter((emp) => {
      // 1. Text Search Filter
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        emp.employee_name?.toLowerCase().includes(search) ||
        emp.first_name?.toLowerCase().includes(search) ||
        emp.last_name?.toLowerCase().includes(search) ||
        emp.display_name?.toLowerCase().includes(search) ||
        String(emp.employee_code || '').toLowerCase().includes(search) ||
        String(emp.essl_employee_code || '').toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (activeTab === 'OVER_LEAVE') {
        return (emp.overLeaveDays > 0) || ((emp.absent_days || 0) > 2);
      }
      if (activeTab === 'LATE_FINES') {
        return emp.lateDays > 0 || emp.confirmedFinesCount > 0;
      }
      if (activeTab === 'PERFECT') {
        return emp.isPerfectAttendance;
      }

      return true;
    });
  }, [enrichedEmployees, searchTerm, activeTab]);

  // Export All Employees Monthly Excel
  const handleExportOverallReport = async () => {
    if (!monthlyReportData?.employees || !monthlyReportData.employees.length) {
      showToast('No monthly attendance data available to export.', 'error');
      return;
    }
    try {
      const monthLabel =
        monthOptions.find((m) => m.value === Number(selectedMonth))?.label ||
        selectedMonth;
      await exportETimeTrackLiteOverallReport(
        monthlyReportData,
        `Monthly_Attendance_Report_${monthLabel}_${selectedYear}`
      );
      showToast(
        `Successfully downloaded complete ${monthLabel} ${selectedYear} Monthly Excel Report.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to export overall monthly report.', 'error');
    }
  };

  // Export Individual Employee Excel
  const handleExportIndividualReport = async (employee) => {
    if (!employee || !employee.days) {
      showToast('No day-by-day attendance data for this employee.', 'error');
      return;
    }
    try {
      await exportETimeTrackLiteIndividualReport(employee, monthlyReportData);
      showToast(
        `Downloaded individual monthly report for ${employee.employee_name}.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to export individual report.', 'error');
    }
  };

  // DataTable Columns for Monthly Staff Overview
  const columns = [
    {
      header: 'Employee',
      accessorKey: 'employee_name',
      cellRender: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 font-bold text-white shadow-xs text-xs">
            {row.employee_name ? row.employee_name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
              <span>{row.employee_name}</span>
              {row.isPerfectAttendance && (
                <span
                  title="Zero Absents & Zero Fines"
                  className="inline-flex items-center text-amber-500"
                >
                  <Award className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span className="font-semibold text-indigo-600">{row.employee_code}</span>
              <span>•</span>
              <span className="text-slate-400">eSSL Face</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Present Days',
      accessorKey: 'present_days',
      align: 'center',
      cellRender: (row) => (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <Check className="h-3 w-3 text-emerald-600" />
          <span>{row.present_days || 0} Days</span>
        </div>
      ),
    },
    {
      header: 'Absent & LOP',
      accessorKey: 'absent_days',
      align: 'center',
      cellRender: (row) => {
        const absents = row.absent_days || 0;
        return (
          <div className="text-center">
            <span
              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border ${absents > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
            >
              {absents} Days
            </span>
            {/* {row.overLeaveDays > 0 && (
              <span className="block text-[10px] font-bold text-rose-600 mt-0.5">
                {row.overLeaveDays} Over-Leave!
              </span>
            )} */}
          </div>
        );
      },
    },
    {
      header: 'Leaves & Holidays',
      accessorKey: 'leave_days',
      align: 'center',
      cellRender: (row) => {
        const total = (row.leave_days || 0) + (row.holiday_days || 0);
        return (
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border ${total > 0
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
          >
            {total} Days
          </span>
        );
      },
    },
    {
      header: 'Weekly Off',
      accessorKey: 'weekly_off_days',
      align: 'center',
      cellRender: (row) => (
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {row.weekly_off_days || 0} Days
        </span>
      ),
    },
    {
      header: 'Late & Penalties',
      accessorKey: 'confirmedFinesCount',
      cellRender: (row) => {
        const hasFines = row.totalFineAmount > 0;
        const hasLate = row.lateDays > 0;
        const isRepeatedLate = row.lateDays >= 3;

        if (!hasFines && !hasLate) {
          return (
            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
              <Check className="h-3.5 w-3.5" />
              <span>On Time</span>
            </span>
          );
        }

        return (
          <div className="text-xs space-y-1">
            {isRepeatedLate ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 font-extrabold text-[11px] shadow-2xs">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span>{row.lateDays} Repeated Late ({formatMinutesToHM(row.totalLateMins)})</span>
              </span>
            ) : hasLate ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 font-semibold text-[11px]">
                <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                <span>{row.lateDays} Late ({formatMinutesToHM(row.totalLateMins)})</span>
              </span>
            ) : null}

            {/* {hasFines ? (
              <div>
                <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700 border border-rose-200 text-[10px]">
                  <DollarSign className="h-3 w-3" />
                  <span>₹{row.totalFineAmount} Fine ({row.confirmedFinesCount}d)</span>
                </span>
              </div>
            ) : hasLate ? (
              <span className="text-[10px] text-slate-400 font-medium block">
                Waived / No Fine
              </span>
            ) : null} */}
          </div>
        );
      },
    },
    {
      header: 'Total Duration',
      accessorKey: 'total_duration_str',
      cellRender: (row) => (
        <div className="font-mono text-xs">
          <div className="font-bold text-slate-800">
            {row.total_duration_str || '0 Hrs 0 Min'}
          </div>
          {(row.onDutyCount > 0 || row.onSiteCount > 0) && (
            <div className="text-[10px] text-slate-500 font-sans">
              {row.onDutyCount > 0 && `${row.onDutyCount} OD `}
              {row.onSiteCount > 0 && `${row.onSiteCount} Site`}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cellRender: (row) => (
        <div className="flex items-center justify-end gap-2">
          {/* View Day-by-Day Sheet (1 to 31) */}
          <button
            onClick={() => setSelectedEmployee(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer"
            title="View Month Day-by-Day Sheet (1-31)"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </button>

          {/* Download Individual Excel */}
          <button
            onClick={() => handleExportIndividualReport(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 hover:border-emerald-300 transition-all cursor-pointer"
            title="Download Individual Employee Excel Report"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Monthly Attendance Desk
                </h1>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  Pilot Hub
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {healthData?.status === 'healthy' ? 'eSSL Online' : 'Connecting'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Full-month biometric aggregation, day-by-day drill downs (1 to 31), and color-coded Excel reports
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions: Excel Download, Holidays & Biometric Sync */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsHolidayModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-xs hover:bg-purple-100 transition-all cursor-pointer"
            title="Manage Office Holidays & Festive Calendar"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span>Office Holidays</span>
          </button>

          <button
            onClick={handleExportOverallReport}
            disabled={isLoading || !enrichedEmployees.length}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-100 disabled:opacity-50 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Download Monthly Report (Excel)</span>
          </button>

          <button
            onClick={handleSyncLogs}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Device Logs'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Workforce"
          value={`${metrics.totalStaff}`}
          icon={Users}
          color="indigo"
          changeLabel="Enrolled employees"
        />

        <StatCard
          title="Average Present"
          value={`${metrics.avgPresentDays} d`}
          icon={ScanFace}
          color="emerald"
          changeLabel="Monthly working average"
        />

        <StatCard
          title="Total Absents"
          value={`${metrics.totalAbsentDays}`}
          icon={AlertCircle}
          color="amber"
          changeLabel="Unexcused / LOP days"
        />

        <StatCard
          title="Over-Leave Alerts"
          value={`${metrics.totalOverLeaveAlerts}`}
          icon={AlertTriangle}
          color="rose"
          badge={
            metrics.totalOverLeaveAlerts > 0 ? (
              <span className="text-[10px] font-bold text-rose-600">Action</span>
            ) : null
          }
          changeLabel="Exceeded monthly quota"
        />

        <StatCard
          title="Assessed Fines"
          value={`₹${metrics.grandTotalFines}`}
          icon={DollarSign}
          color="purple"
          changeLabel={`${metrics.totalLateIncidents} Late punch incidents`}
        />
      </div>

      {/* Control Bar: Month, Year, Search & Quick Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Period Selection */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Picker */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span className="font-semibold text-slate-600">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Picker */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold text-slate-600">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Badge */}
            {(monthlyReportData?.start_date || monthlyReportData?.from_date) && (
              <span className="rounded-lg bg-indigo-50/70 px-2.5 py-1.5 text-xs font-mono font-semibold text-indigo-700 border border-indigo-200">
                {monthlyReportData.start_date || monthlyReportData.from_date} To{' '}
                {monthlyReportData.end_date || monthlyReportData.to_date}
              </span>
            )}
          </div>

          {/* Right: Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            <span>All Staff</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'ALL'
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-200 text-slate-700'
                }`}
            >
              {enrichedEmployees.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('OVER_LEAVE')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'OVER_LEAVE'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Over-Leave & High Absents</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'OVER_LEAVE'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-200 text-rose-800'
                }`}
            >
              {
                enrichedEmployees.filter(
                  (e) => e.overLeaveDays > 0 || (e.absent_days || 0) > 2
                ).length
              }
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LATE_FINES')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'LATE_FINES'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
              }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Late Arrivals & Fines</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'LATE_FINES'
                ? 'bg-purple-700 text-white'
                : 'bg-purple-200 text-purple-800'
                }`}
            >
              {
                enrichedEmployees.filter(
                  (e) => e.lateDays > 0 || e.confirmedFinesCount > 0
                ).length
              }
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PERFECT')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'PERFECT'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>Perfect Attendance</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === 'PERFECT'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-200 text-emerald-800'
                }`}
            >
              {enrichedEmployees.filter((e) => e.isPerfectAttendance).length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Staff Roster Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Friendly Upcoming Month Banner */}
        {isFutureMonth && !isError && (
          <div className="m-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-900">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-bold">Upcoming Attendance Period: </span>
              <span>
                Biometric punch logs for{' '}
                <strong>
                  {monthOptions.find((m) => m.value === Number(selectedMonth))?.label} {selectedYear}
                </strong>{' '}
                have not commenced yet. Staff roster, scheduled office holidays, and weekly offs are prepared below.
              </span>
            </div>
          </div>
        )}

        {isError && (
          <div className="p-6">
            <div className={`rounded-xl border p-4 text-xs ${isFutureMonth || (error?.message && error.message.includes('DeviceLogs'))
                ? 'border-indigo-200 bg-indigo-50/80 text-indigo-900'
                : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}>
              <div className="flex items-center gap-2 font-bold">
                {isFutureMonth || (error?.message && error.message.includes('DeviceLogs')) ? (
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                )}
                <span>
                  {isFutureMonth || (error?.message && error.message.includes('DeviceLogs'))
                    ? `Upcoming Attendance Period (${monthOptions.find((m) => m.value === Number(selectedMonth))?.label} ${selectedYear})`
                    : 'Attendance records not available for this period'}
                </span>
              </div>
              <p className={`mt-1.5 ${isFutureMonth || (error?.message && error.message.includes('DeviceLogs'))
                  ? 'text-indigo-800'
                  : 'text-rose-700'
                }`}>
                {isFutureMonth || (error?.message && error.message.includes('DeviceLogs'))
                  ? `Biometric punch records for ${monthOptions.find((m) => m.value === Number(selectedMonth))?.label} ${selectedYear} have not been recorded yet. Biometric logs will be generated once employees punch in.`
                  : error?.message || 'Biometric server query failed or logs unavailable.'}
              </p>
              {!isFutureMonth && !(error?.message && error.message.includes('DeviceLogs')) && (
                <button
                  onClick={() => refetch()}
                  className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-500 cursor-pointer"
                >
                  Retry Query
                </button>
              )}
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          data={filteredEmployees}
          isLoading={isLoading}
          emptyTitle={
            searchTerm
              ? `No staff matching "${searchTerm}"`
              : activeTab !== 'ALL'
                ? `No staff under ${activeTab.replace('_', ' ')} filter`
                : isFutureMonth
                  ? 'Upcoming Attendance Period'
                  : 'No Monthly Records Found'
          }
          emptyDescription={
            searchTerm
              ? 'Try searching with a different name or employee code.'
              : activeTab !== 'ALL'
                ? 'Switch back to "All Staff" tab to view the complete workforce.'
                : isFutureMonth
                  ? `Biometric punch logs for ${monthOptions.find((m) => m.value === Number(selectedMonth))?.label} ${selectedYear} have not commenced yet.`
                  : `No biometric punch records found for ${monthOptions.find((m) => m.value === Number(selectedMonth))?.label} ${selectedYear}.`
          }
          pageSize={15}
          onRetry={refetch}
        />
      </div>

      {/* ========================================================= */}
      {/* MODAL: Full Day-by-Day (1 to 31) Individual Sheet */}
      {/* ========================================================= */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white text-xs">
                    {selectedEmployee.employee_name
                      ? selectedEmployee.employee_name.charAt(0).toUpperCase()
                      : 'E'}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedEmployee.employee_name}</span>
                      <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {selectedEmployee.employee_code}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Company:{' '}
                      <span className="font-semibold text-slate-700">
                        {monthlyReportData?.company_name || 'SCOTO'}
                      </span>{' '}
                      • Period:{' '}
                      <span className="font-semibold text-slate-700">
                        {monthlyReportData?.start_date ||
                          (selectedEmployee.days && selectedEmployee.days[0]?.date) ||
                          ''}{' '}
                        To{' '}
                        {monthlyReportData?.end_date ||
                          (selectedEmployee.days &&
                            selectedEmployee.days[selectedEmployee.days.length - 1]
                              ?.date) ||
                          ''}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportIndividualReport(selectedEmployee)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Individual Excel</span>
                </button>

                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Summary Pill Bar inside Modal */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Present</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {selectedEmployee.present_days || 0} Days
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Absent / LOP</span>
                <span className="font-bold text-rose-700 text-sm">
                  {selectedEmployee.absent_days || 0} Days
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Weekly Off</span>
                <span className="font-bold text-slate-700 text-sm">
                  {selectedEmployee.weekly_off_days || 0} Days
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Over-Leave</span>
                <span
                  className={`font-bold text-sm ${selectedEmployee.overLeaveDays > 0
                    ? 'text-rose-600'
                    : 'text-slate-500'
                    }`}
                >
                  {selectedEmployee.overLeaveDays || 0} Days
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Late Days</span>
                <span className={`font-bold text-sm ${selectedEmployee.lateDays >= 3 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {selectedEmployee.lateDays || 0} ({formatMinutesToHM(selectedEmployee.totalLateMins)})
                  {selectedEmployee.lateDays >= 3 && (
                    <span className="block text-[10px] text-rose-600 font-extrabold">⚠️ Repeated Late</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Early Exits</span>
                <span className={`font-bold text-sm ${selectedEmployee.earlyExitDays > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {selectedEmployee.earlyExitDays || 0} ({formatMinutesToHM(selectedEmployee.totalEarlyExitMins || 0)})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Confirmed Fines</span>
                <span
                  className={`font-bold text-sm ${selectedEmployee.totalFineAmount > 0
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                    }`}
                >
                  ₹{selectedEmployee.totalFineAmount || 0}
                </span>
              </div>
            </div>

            {/* Day-by-Day (1 to 31) Scrollable Grid */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold z-10">
                  <tr>
                    <th className="px-3 py-2.5 border-r border-slate-200">Date</th>
                    <th className="px-2 py-2.5 border-r border-slate-200 text-center">In</th>
                    <th className="px-2 py-2.5 border-r border-slate-200 text-center">Out</th>
                    <th className="px-2 py-2.5 border-r border-slate-200 text-center">Shift</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-200 text-center">Duration</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-200 text-center">Status</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-200 text-center">Leave / LOP</th>
                    <th className="px-2 py-2.5 border-r border-slate-200 text-center">Perm (Hr)</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-200 text-center">Late</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-200 text-center">Early Exit</th>
                    <th className="px-2.5 py-2.5 border-r border-slate-200 text-center">Fine</th>
                    <th className="px-3 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {selectedEmployee.days?.map((day, dIdx) => {
                    const parsed = parseDayDetails(day, selectedEmployee);
                    const isSunday = day.status === 'WeeklyOff';
                    const isAbsent = day.status === 'Absent' || parsed.isAbsent;
                    const dayDate = day.date || day.date_str || day.iso_date || '';
                    const durStr = day.total_duration || day.duration_str || '00:00';

                    return (
                      <tr
                        key={dIdx}
                        className={`hover:bg-slate-50/80 transition-colors ${isSunday
                          ? 'bg-slate-50/50 text-slate-500'
                          : isAbsent || parsed.isOverLeave
                            ? 'bg-rose-50/40'
                            : parsed.fineAmt > 0 || parsed.isFineConfirmed
                              ? 'bg-rose-50/30'
                              : parsed.isOnDuty
                                ? 'bg-teal-50/30'
                                : parsed.isOnSite
                                  ? 'bg-sky-50/30'
                                  : ''
                          }`}
                      >
                        {/* Date */}
                        <td className="px-3 py-2 border-r border-slate-100 font-semibold text-slate-800 whitespace-nowrap">
                          {dayDate}
                        </td>

                        {/* In Punch */}
                        <td className="px-2 py-2 border-r border-slate-100 text-slate-700 text-center whitespace-nowrap">
                          {day.in_time || '--:--'}
                        </td>

                        {/* Out Punch */}
                        <td className="px-2 py-2 border-r border-slate-100 text-slate-700 text-center whitespace-nowrap">
                          {day.out_time || '--:--'}
                        </td>

                        {/* Shift */}
                        <td className="px-2 py-2 border-r border-slate-100 text-center font-bold text-slate-600">
                          {day.shift || 'GS'}
                        </td>

                        {/* Total Duration */}
                        <td className="px-2.5 py-2 border-r border-slate-100 font-semibold text-slate-800 text-center whitespace-nowrap">
                          {durStr}
                        </td>

                        {/* Status Column */}
                        <td className="px-2.5 py-2 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] ${parsed.isOnDuty
                              ? 'bg-teal-100 text-teal-800 border border-teal-300 font-bold'
                              : parsed.isOnSite
                                ? 'bg-sky-100 text-sky-800 border border-sky-300 font-bold'
                                : day.status === 'Present'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium'
                                  : day.status === 'Present (No OutPunch)'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : day.status === 'WeeklyOff'
                                      ? 'bg-slate-100 text-slate-600'
                                      : isAbsent || parsed.isLop
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                          >
                            {parsed.statusDisplay}
                          </span>
                        </td>

                        {/* Leave / LOP Column */}
                        <td className="px-2.5 py-2 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.leaveDisplay !== '--' ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${parsed.isOverLeave
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                            >
                              {parsed.leaveDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        {/* Permission Hours Column */}
                        <td className="px-2 py-2 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.permMins > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {parsed.permDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        {/* Late Minutes Column */}
                        <td className="px-2.5 py-2 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.lateMins > 0 ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${parsed.fineAmt > 0 || parsed.isFineConfirmed
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                            >
                              {parsed.lateDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        {/* Early Exit Column */}
                        <td className="px-2.5 py-2 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.earlyExitMins > 0 ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${parsed.fineAmt > 0 || parsed.isFineConfirmed
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                            >
                              {parsed.earlyExitDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        {/* Fine Amount (Red Highlighted) */}
                        <td className="px-2.5 py-2 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.fineAmt > 0 || parsed.isFineConfirmed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white shadow-2xs">
                              {parsed.fineDisplay}
                            </span>
                          ) : parsed.isWaived ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ₹0 Waived
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="px-3 py-2 font-sans text-[11px] text-slate-600 max-w-xs truncate">
                          {parsed.cleanedRemarks || '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Note */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-mono text-[11px]">
                Showing {selectedEmployee.days?.length || 0} calendar records
              </span>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Office Holidays Management Master Modal */}
      {isHolidayModalOpen && (
        <HolidayManagementModal
          isOpen={isHolidayModalOpen}
          onClose={() => setIsHolidayModalOpen(false)}
          onHolidayChanged={() => refetch()}
        />
      )}
    </div>
  );
};

export default UnifiedMonthlyAttendancePage;
