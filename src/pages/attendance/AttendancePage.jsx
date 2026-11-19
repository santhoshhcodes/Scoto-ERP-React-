import React, { useState, useMemo } from 'react';
import {
  Users,
  ScanFace,
  UserX,
  Clock,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Download,
  X,
  UserCheck,
  FileText,
  Building2,
  MapPin,
} from 'lucide-react';
import {
  StatCard,
  DataTable,
  StatusBadge,
} from '../../components/common';
import {
  useDailySummary,
  useMonthlyReport,
  useBackendHealth,
  useDownloadDeviceLogs,
} from '../../api/attendanceApi';
import {
  exportToExcel,
  exportETimeTrackLiteIndividualReport,
  exportETimeTrackLiteOverallReport,
  parseDayDetails,
  formatMinutesToHM,
} from '../../utils/excelUtils';

export const AttendancePage = () => {
  // Navigation & Sub-Tabs
  const [activeTab, setActiveTab] = useState('daily-summary'); // 'daily-summary' | 'reconciliation'

  // Filters for Daily Summary
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [dailySearchTerm, setDailySearchTerm] = useState('');
  const [dailyStatusFilter, setDailyStatusFilter] = useState('');
  const [dailyDeviceFilter, setDailyDeviceFilter] = useState('ALL');

  // Filters for Monthly Reconciliation / eTimeTrackLite Report
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [reconMonth, setReconMonth] = useState(currentMonth);
  const [reconYear, setReconYear] = useState(currentYear);
  const [reconSearchTerm, setReconSearchTerm] = useState('');

  // Selected employee for detailed day-by-day modal view
  const [selectedEmpDetail, setSelectedEmpDetail] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Health Query
  const { data: healthData } = useBackendHealth();

  // =========================================================
  // Query 1: Daily Summary
  // =========================================================
  const {
    data: dailySummaryData = [],
    isLoading: isDailyLoading,
    isError: isDailyError,
    error: dailyError,
    refetch: refetchDaily,
    isFetching: isDailyFetching,
  } = useDailySummary({
    target_date: selectedDate,
    limit: 500,
    enabled: activeTab === 'daily-summary',
  });

  // =========================================================
  // Query 2: Monthly Structured Attendance Report (eTimeTrackLite)
  // =========================================================
  const {
    data: monthlyReportData = { employees: [] },
    isLoading: isMonthlyLoading,
    isError: isMonthlyError,
    error: monthlyError,
    refetch: refetchMonthly,
    isFetching: isMonthlyFetching,
  } = useMonthlyReport({
    month: reconMonth,
    year: reconYear,
    employee_code: reconSearchTerm,
    enabled: activeTab === 'reconciliation',
  });


  // Biometric device download mutation (eTimeTrackLite Start Download equivalent)
  const downloadLogsMutation = useDownloadDeviceLogs();
  const isDownloading = downloadLogsMutation.isPending || isDailyFetching || isMonthlyFetching;

  // Handle biometric device download & attendance refresh
  const handleRefresh = async () => {
    try {
      // 1. Download biometric punch logs stored in the eSSL device into DB1
      const downloadResult = await downloadLogsMutation.mutateAsync();

      // 2. Refresh the existing attendance API so latest punches appear in the ERP
      const refreshResult =
        activeTab === 'daily-summary'
          ? await refetchDaily()
          : await refetchMonthly();

      if (refreshResult.isError) {
        showToast(
          refreshResult.error?.message || 'Biometric logs downloaded, but attendance view refresh failed.',
          'error'
        );
        return;
      }

      const newLogs = downloadResult?.data?.new_inserted ?? downloadResult?.new_inserted ?? 0;
      const skipped = downloadResult?.data?.duplicates_skipped ?? downloadResult?.duplicates_skipped ?? 0;
      if (newLogs > 0) {
        showToast(
          `Successfully downloaded ${newLogs} new biometric log${newLogs > 1 ? 's' : ''} from eSSL device. Attendance updated.`,
          'success'
        );
      } else {
        showToast(
          `Biometric logs downloaded. Device is up to date (${skipped} records verified, 0 new).`,
          'success'
        );
      }
    } catch (err) {
      showToast(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to download logs from biometric device.',
        'error'
      );
    }
  };

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

  const formatDateTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Filtered Daily Summary list
  const filteredDailySummary = useMemo(() => {
    if (!Array.isArray(dailySummaryData)) return [];
    const cleanSearch = dailySearchTerm.trim().toLowerCase();
    return dailySummaryData.filter((item) => {
      const matchesSearch =
        !cleanSearch ||
        item.employee_name?.toLowerCase().includes(cleanSearch) ||
        item.first_name?.toLowerCase().includes(cleanSearch) ||
        item.last_name?.toLowerCase().includes(cleanSearch) ||
        item.display_name?.toLowerCase().includes(cleanSearch) ||
        String(item.employee_code || '').toLowerCase().includes(cleanSearch) ||
        String(item.essl_employee_code || '').toLowerCase().includes(cleanSearch);

      const matchesStatus = !dailyStatusFilter || item.status === dailyStatusFilter;

      const matchesDevice =
        dailyDeviceFilter === 'ALL' ||
        (dailyDeviceFilter === 'ESSL' && item.essl_linked) ||
        (dailyDeviceFilter === 'MANUAL' && !item.essl_linked);

      return matchesSearch && matchesStatus && matchesDevice;
    });
  }, [dailySummaryData, dailySearchTerm, dailyStatusFilter, dailyDeviceFilter]);

  // Metric computations for Daily Summary
  const totalRoster = dailySummaryData.length;
  const fullDayCount = dailySummaryData.filter(
    (i) => i.status === 'FULL_DAY' || i.status === 'PRESENT_CONFIRMED'
  ).length;
  const halfDayCount = dailySummaryData.filter((i) => i.status === 'HALF_DAY').length;
  const shortHoursCount = dailySummaryData.filter((i) => i.status === 'SHORT_HOURS').length;
  const reviewCount = dailySummaryData.filter(
    (i) => i.status === 'NO_CHECK_IN_REVIEW' || i.status === 'SINGLE_PUNCH_ANOMALY'
  ).length;
  const leaveCount = dailySummaryData.filter(
    (i) => i.status === 'ON_LEAVE' || i.status === 'LOP' || i.status === 'ABSENT_CONFIRMED'
  ).length;
  const presentRate =
    totalRoster > 0 ? Math.round(((fullDayCount + halfDayCount) / totalRoster) * 100) : 0;

  // Columns: Daily Summary Table (Read-Only / Monitoring View matching eTimeTrackLite)
  const dailySummaryColumns = [
    {
      header: 'Staff Member',
      accessorKey: 'employee_name',
      cellRender: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
            {row.employee_name ? row.employee_name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs">{row.employee_name}</div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
              <span className="font-semibold text-indigo-600">{row.employee_code}</span>
              {row.essl_linked ? (
                <span className="rounded bg-teal-50 px-1 py-0.2 text-[9px] font-semibold text-teal-700 border border-teal-200">
                  eSSL Face
                </span>
              ) : (
                <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-semibold text-slate-600 border border-slate-200">
                  Manual
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Attendance Date',
      accessorKey: 'target_date',
      cellRender: (row) => (
        <span className="font-mono text-xs text-slate-700">{row.target_date}</span>
      ),
    },
    {
      header: 'First Check IN',
      accessorKey: 'first_in',
      cellRender: (row) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-teal-600" />
          <span
            className={`font-mono text-xs ${row.first_in ? 'font-semibold text-slate-800' : 'text-slate-400 italic'
              }`}
          >
            {formatTimeOnly(row.first_in)}
          </span>
        </div>
      ),
    },
    {
      header: 'Last Check OUT',
      accessorKey: 'last_out',
      cellRender: (row) => {
        const hasValidCheckout =
          row.last_out && (row.total_punches > 1 || row.last_out !== row.first_in);
        return (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span
              className={`font-mono text-xs ${hasValidCheckout
                ? 'font-semibold text-slate-800'
                : 'text-slate-400 italic'
                }`}
            >
              {hasValidCheckout ? formatTimeOnly(row.last_out) : '--:--'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Total Punches',
      accessorKey: 'total_punches',
      align: 'center',
      cellRender: (row) => (
        <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {row.total_punches || 0}
        </span>
      ),
    },
    {
      header: 'Work Duration',
      accessorKey: 'total_minutes',
      cellRender: (row) => {
        const mins = row.total_minutes || 0;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return (
          <div className="text-xs font-mono">
            <span className="font-semibold text-slate-800">
              {hrs > 0 || remMins > 0 ? `${hrs}h ${remMins}m` : '--'}
            </span>
            <span className="text-[10px] text-slate-400 block font-normal">
              ({formatMinutesToHM(mins)})
            </span>
          </div>
        );
      },
    },
    {
      header: 'Late Delay',
      accessorKey: 'late_minutes',
      cellRender: (row) => (
        <div className="text-xs font-mono">
          {row.permission_minutes > 0 && (
            <div className="text-purple-600 font-semibold text-[10px] mb-0.5">
              Perm: +{formatMinutesToHM(row.permission_minutes)}
            </div>
          )}
          {row.late_minutes > 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-semibold text-rose-700 border border-rose-200">
              Late: {formatMinutesToHM(row.late_minutes)}
            </span>
          ) : row.first_in ? (
            <span className="text-emerald-600 font-medium text-[11px]">
              On Time
            </span>
          ) : (
            <span className="text-slate-400 italic text-[11px]">
              Not Punched
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Fine & Permission',
      accessorKey: 'fine_status',
      cellRender: (row) => (
        <div className="space-y-1">
          {row.permission_minutes > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
              <Clock className="h-3 w-3 text-purple-600" />
              Perm: +{formatMinutesToHM(row.permission_minutes)}
            </span>
          )}
          {row.fine_status === 'WAIVED' ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Waived (₹0)
            </span>
          ) : row.fine_amount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
              <AlertTriangle className="h-3 w-3 text-rose-600" />
              Fine: ₹{row.fine_amount}
            </span>
          ) : !row.first_in ? (
            <span className="text-[11px] text-slate-400 italic">₹0 (No Punch)</span>
          ) : !row.permission_minutes && row.late_minutes <= 0 ? (
            <span className="text-[11px] text-emerald-600 font-medium">₹0 (On Time)</span>
          ) : (
            <span className="text-[11px] text-slate-400 italic">--</span>
          )}
        </div>
      ),
    },
    {
      header: 'Attendance Status',
      accessorKey: 'status',
      cellRender: (row) => (
        <div>
          <StatusBadge status={row.status} size="sm" />
          {row.review_status && (
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Confirmed: {row.review_status}
            </div>
          )}
          {row.client_name && (
            <div
              className="mt-1 inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 border border-sky-200"
              title={`${row.client_name}${row.place_of_visit ? ` • ${row.place_of_visit}` : ''}`}
            >
              <Building2 className="h-2.5 w-2.5 text-sky-600 shrink-0" />
              <span className="truncate max-w-[130px]">{row.client_name}</span>
              {row.place_of_visit && (
                <span className="text-sky-600 font-normal truncate max-w-[80px]">
                  • {row.place_of_visit}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  // Columns: Monthly Employee List Table (Matching eTimeTrackLite Summary Format)
  const monthlyEmployeeColumns = [
    {
      header: 'Staff Member',
      accessorKey: 'employee_name',
      cellRender: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
            {row.employee_name ? row.employee_name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs">{row.employee_name}</div>
            <div className="font-mono text-[11px] text-indigo-600 font-medium">
              Code: {row.employee_code}
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
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          {row.present_days || 0} Days
        </span>
      ),
    },
    {
      header: 'Absent Days',
      accessorKey: 'absent_days',
      align: 'center',
      cellRender: (row) => (
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border ${row.absent_days > 0
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
        >
          {row.absent_days || 0} Days
        </span>
      ),
    },
    {
      header: 'Weekly Off',
      accessorKey: 'weekly_off_days',
      align: 'center',
      cellRender: (row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {row.weekly_off_days || 0} Days
        </span>
      ),
    },
    {
      header: 'Leaves & Holidays',
      accessorKey: 'leave_days',
      align: 'center',
      cellRender: (row) => {
        const totalLeaves = (row.leave_days || 0) + (row.holiday_days || 0);
        return (
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border ${totalLeaves > 0
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
          >
            {totalLeaves} Days
          </span>
        );
      },
    },
    {
      header: 'Total Duration',
      accessorKey: 'total_duration_str',
      cellRender: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {row.total_duration_str || '0 Hrs 0 Min'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cellRender: (row) => (
        <div className="flex items-center justify-end gap-2">
          {/* View Details Modal Button */}
          <button
            onClick={() => setSelectedEmpDetail(row)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition-colors cursor-pointer"
            title="View Monthly Day-by-Day Sheet"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View</span>
          </button>

          {/* Individual Download Excel Button */}
          <button
            onClick={async () => {
              try {
                await exportETimeTrackLiteIndividualReport(row, monthlyReportData);
                showToast(`Downloaded attendance report for ${row.employee_name}.`);
              } catch (err) {
                showToast(err.message || 'Failed to export report', 'error');
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Download Individual Excel Report"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel</span>
          </button>
        </div>
      ),
    },
  ];

  const isRefreshing =
    activeTab === 'daily-summary'
      ? isDailyFetching
      : isMonthlyFetching;


  // Export Handler matching eTimeTrackLite / eSSL Desktop Reports
  const handleExportExcel = async () => {
    if (activeTab === 'daily-summary') {
      if (!filteredDailySummary.length) {
        showToast('No records available to export for this date.', 'error');
        return;
      }
      const data = filteredDailySummary.map((row, idx) => {
        const mins = row.total_minutes || 0;
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        const workDuration = hrs > 0 || rem > 0 ? `${hrs} hrs ${rem} mins` : '0 mins';

        return {
          'S.No': idx + 1,
          'Employee Code': row.employee_code,
          'Employee Name': row.employee_name,
          'Device / Source': row.essl_linked ? 'eSSL Face Terminal' : 'Manual Staff',
          'Attendance Date': row.target_date,
          'First Check IN': row.first_in ? formatTimeOnly(row.first_in) : 'Not Punched',
          'Last Check OUT':
            row.last_out && (row.total_punches > 1 || row.last_out !== row.first_in)
              ? formatTimeOnly(row.last_out)
              : 'Not Checked Out',
          'Total Punches': row.total_punches || 0,
          'Work Duration': workDuration,
          'Total Working Duration': formatMinutesToHM(mins),
          'Late Delay': row.late_minutes ? formatMinutesToHM(row.late_minutes) : '0m',
          'Permission Duration': row.permission_minutes ? formatMinutesToHM(row.permission_minutes) : '0m',
          'Attendance Status': row.status,
          'Fine Status': row.fine_status || 'NONE',
          'Fine Amount (INR)': row.fine_amount || 0,
          'Confirmation Status': row.review_status || '',
        };
      });

      exportToExcel(
        data,
        `eSSL_Daily_Attendance_Report_${selectedDate}`,
        'Daily_Attendance'
      );
      showToast('Daily attendance report exported in eTimeTrackLite format.');
    } else {
      if (!monthlyReportData.employees || !monthlyReportData.employees.length) {
        showToast('No monthly employee records to export.', 'error');
        return;
      }
      try {
        await exportETimeTrackLiteOverallReport(
          monthlyReportData,
          `Daily_Attendance_Report_Summary_${reconMonth}_${reconYear}`
        );
        showToast('Overall monthly attendance report exported successfully.');
      } catch (err) {
        showToast(err.message || 'Failed to export overall monthly report.', 'error');
      }
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

      {/* Header & Status */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Face Recognition & Biometric Attendance
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {healthData?.status === 'healthy' ? 'System Connected' : 'Connecting'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time biometric punch monitoring, daily summary, and monthly eTimeTrackLite reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{activeTab === 'daily-summary' ? 'Export Daily Excel' : 'Export the monthly logs'}</span>
          </button>

          {/* Sync / Download Logs Button */}
          <button
            onClick={handleRefresh}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isDownloading ? 'animate-spin' : ''}`}
            />
            <span>{isDownloading ? 'Downloading Logs...' : 'Refresh / Download Logs'}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Headcount"
          value={`${totalRoster}`}
          icon={Users}
          color="indigo"
          changeLabel="Total active workforce"
        />

        <StatCard
          title="Full Day Present"
          value={`${fullDayCount}`}
          icon={ScanFace}
          color="emerald"
          badge={
            <span className="text-xs font-bold text-emerald-600">
              ({presentRate}%)
            </span>
          }
          changeLabel="Present / Confirmed"
        />

        <StatCard
          title="Half / Short Hours"
          value={`${halfDayCount + shortHoursCount}`}
          icon={Clock}
          color="amber"
          changeLabel={`${halfDayCount} Half, ${shortHoursCount} Short`}
        />

        <StatCard
          title="Anomaly / Single Punch"
          value={`${reviewCount}`}
          icon={AlertTriangle}
          color="purple"
          changeLabel="Missing punch / anomaly"
        />

        <StatCard
          title="Leave / Absent"
          value={`${leaveCount}`}
          icon={UserX}
          color="rose"
          changeLabel="On leave, LOP, or absent"
        />
      </div>

      {/* Tab Navigation */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200">
          {/* Tab 1: Daily Summary */}
          <button
            onClick={() => setActiveTab('daily-summary')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'daily-summary'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Daily Attendance Summary</span>
          </button>

          {/* Tab 2: Monthly Attendance Report */}
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'reconciliation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
          >
            <Layers className="h-4 w-4" />
            <span>Monthly Attendance Report (eTimeTrackLite)</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: Daily Attendance Summary */}
        {/* ========================================================= */}
        {activeTab === 'daily-summary' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Date Picker */}
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

                {/* Quick Date Shortcuts */}
                <button
                  type="button"
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${selectedDate === yesterdayStr
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  title="View previous day's completed attendance records"
                >
                  ← Previous Day
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${selectedDate === todayStr
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  title="View today's live ongoing attendance"
                >
                  Today
                </button>

                {/* Status Filter */}
                <select
                  value={dailyStatusFilter}
                  onChange={(e) => setDailyStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="PRESENT_CONFIRMED">Present (Confirmed)</option>
                  <option value="FULL_DAY">Full Day (8h+)</option>
                  <option value="HALF_DAY">Half Day (4h-8h)</option>
                  <option value="SHORT_HOURS">Short Hours (&lt;4h)</option>
                  <option value="SINGLE_PUNCH_ANOMALY">Single Punch / Missing OUT</option>
                  <option value="NO_CHECK_IN_REVIEW">No Check-In (Review)</option>
                  <option value="ON_DUTY">On Duty / OT</option>
                  <option value="ON_LEAVE">Casual Leave (CL)</option>
                  <option value="LOP">Loss of Pay (LOP)</option>
                </select>

                {/* Device Filter */}
                <select
                  value={dailyDeviceFilter}
                  onChange={(e) => setDailyDeviceFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Staff Types</option>
                  <option value="ESSL">eSSL Face Terminal</option>
                  <option value="MANUAL">Manual Staff</option>
                </select>

                {/* Employee Search */}
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dailySearchTerm}
                    onChange={(e) => setDailySearchTerm(e.target.value)}
                    placeholder="Search by name or code..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  {dailySearchTerm && (
                    <button
                      type="button"
                      onClick={() => setDailySearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => refetchDaily()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-slate-500 ${isDailyFetching ? 'animate-spin' : ''
                    }`}
                />
                Refresh
              </button>
            </div>

            {/* Error Message if fetch fails */}
            {isDailyError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Unable to load attendance records</span>
                </div>
                <p className="mt-1 text-rose-700">
                  {dailyError?.message || 'Please check system connection and try again.'}
                </p>
                <button
                  onClick={() => refetchDaily()}
                  className="mt-2.5 rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-rose-500 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Data Table */}
            <DataTable
              columns={dailySummaryColumns}
              data={filteredDailySummary}
              isLoading={isDailyLoading}
              emptyTitle="No attendance records found"
              emptyDescription={`No attendance records generated for ${selectedDate}.`}
              pageSize={15}
              onRetry={refetchDaily}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: Monthly Attendance Report (eTimeTrackLite Format) */}
        {/* ========================================================= */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-4">
            {/* Filter & Action Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Month Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Month:</span>
                  <select
                    value={reconMonth}
                    onChange={(e) => setReconMonth(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {[
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
                    ].map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {mName} ({idx + 1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Year:</span>
                  <select
                    value={reconYear}
                    onChange={(e) => setReconYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Search Filter */}
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reconSearchTerm}
                    onChange={(e) => setReconSearchTerm(e.target.value)}
                    placeholder="Search employee name or code..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  {reconSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setReconSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Export All Employees Excel */}
                <button
                  onClick={handleExportExcel}
                  disabled={!monthlyReportData?.employees?.length}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Export the monthly logs</span>
                </button>

                <button
                  onClick={() => refetchMonthly()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-slate-500 ${isMonthlyFetching ? 'animate-spin' : ''
                      }`}
                  />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Error Message if monthly report fetch fails */}
            {isMonthlyError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Unable to retrieve monthly attendance report</span>
                </div>
                <p className="mt-1 text-rose-700">
                  {monthlyError?.message || 'No biometric logs found for the selected month.'}
                </p>
                <button
                  onClick={() => refetchMonthly()}
                  className="mt-2.5 rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-rose-500 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Monthly Employee Summary Table */}
            <DataTable
              columns={monthlyEmployeeColumns}
              data={monthlyReportData?.employees || []}
              isLoading={isMonthlyLoading}
              emptyTitle="No employees found"
              emptyDescription={`No biometric attendance records found for ${reconMonth}/${reconYear}.`}
              pageSize={15}
              onRetry={refetchMonthly}
            />
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: Individual Employee Day-by-Day Sheet (eTimeTrackLite) */}
      {/* ========================================================= */}
      {selectedEmpDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-slate-900">
                    Daily Attendance Report (Summary Report)
                  </h2>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                    {monthlyReportData?.start_date || monthlyReportData?.from_date || (selectedEmpDetail.days && selectedEmpDetail.days[0]?.date) || ''} To {monthlyReportData?.end_date || monthlyReportData?.to_date || (selectedEmpDetail.days && selectedEmpDetail.days[selectedEmpDetail.days.length - 1]?.date) || ''}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="font-semibold text-slate-500">Employee Code : </span>
                    <span className="font-bold text-slate-900 font-mono">{selectedEmpDetail.employee_code}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Employee Name : </span>
                    <span className="font-bold text-slate-900">{selectedEmpDetail.employee_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Company : </span>
                    <span className="font-bold text-slate-900">{monthlyReportData?.company_name || 'SCOTO'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Individual Excel button */}
                <button
                  onClick={async () => {
                    try {
                      await exportETimeTrackLiteIndividualReport(selectedEmpDetail, monthlyReportData);
                      showToast(`Downloaded attendance report for ${selectedEmpDetail.employee_name}.`);
                    } catch (err) {
                      showToast(err.message || 'Failed to export report', 'error');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Excel</span>
                </button>

                {/* Close button */}
                <button
                  onClick={() => setSelectedEmpDetail(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Table Container */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold z-10">
                  <tr>
                    <th className="px-2 py-2 border-r border-slate-200">Date</th>
                    <th className="px-1.5 py-2 border-r border-slate-200 text-center">In</th>
                    <th className="px-1.5 py-2 border-r border-slate-200 text-center">Out</th>
                    <th className="px-1.5 py-2 border-r border-slate-200 text-center">Shift</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center">Total</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center">Status</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center">Leave / LOP</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center">Perm (Hr)</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center">Late</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center">Fine</th>
                    <th className="px-2.5 py-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedEmpDetail.days?.map((day, dIdx) => {
                    const parsed = parseDayDetails(day);
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
                        <td className="px-2 py-1.5 border-r border-slate-100 font-semibold text-slate-800 whitespace-nowrap">
                          {dayDate}
                        </td>
                        <td className="px-1.5 py-1.5 border-r border-slate-100 text-slate-700 text-center whitespace-nowrap">
                          {day.in_time || '--:--'}
                        </td>
                        <td className="px-1.5 py-1.5 border-r border-slate-100 text-slate-700 text-center whitespace-nowrap">
                          {day.out_time || '--:--'}
                        </td>
                        <td className="px-1.5 py-1.5 border-r border-slate-100 text-center font-bold text-slate-600">
                          {day.shift || 'GS'}
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100 font-semibold text-slate-800 text-center whitespace-nowrap">
                          {durStr}
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${parsed.isOnDuty
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
                        <td className="px-2 py-1.5 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.leaveDisplay !== '--' ? (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${parsed.isOverLeave
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                            >
                              {parsed.leaveDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.permMins > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {parsed.permDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.lateMins > 0 ? (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${parsed.fineAmt > 0 || parsed.isFineConfirmed
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : parsed.isWaived
                                  ? 'bg-slate-100 text-slate-700 border border-slate-300 font-medium'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                            >
                              {parsed.lateDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100 font-sans text-center whitespace-nowrap">
                          {parsed.fineAmt > 0 || parsed.isFineConfirmed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              {parsed.fineDisplay}
                            </span>
                          ) : parsed.isWaived ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Waived
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 font-sans text-[11px] max-w-[180px] truncate">
                          {parsed.cleanedRemarks ? (
                            <span className="inline-block font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {parsed.cleanedRemarks}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Banner matching eTimeTrackLite verbatim */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-800 font-mono tracking-tight flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              {(() => {
                const days = selectedEmpDetail.days || [];
                let totalPermMins = 0;
                let totalFineAmt = 0;
                let finesCount = 0;
                let lateDaysCount = 0;
                let permDaysCount = 0;
                let overLeaveDaysCount = 0;
                let halfDaysCount = 0;
                let onDutyDaysCount = 0;
                let onSiteDaysCount = 0;

                days.forEach((day) => {
                  const p = parseDayDetails(day);
                  if (p.isOnDuty) onDutyDaysCount++;
                  if (p.isOnSite) onSiteDaysCount++;
                  if (p.permMins > 0) {
                    totalPermMins += p.permMins;
                    permDaysCount++;
                  }
                  if (p.lateMins > 0) lateDaysCount++;
                  if (p.fineAmt > 0 || p.isFineConfirmed) {
                    totalFineAmt += p.fineAmt;
                    finesCount++;
                  }
                  if (p.isOverLeave) overLeaveDaysCount++;
                  if (p.isHalfDay) halfDaysCount++;
                });

                const totalPermHrs = (totalPermMins / 60).toFixed(1).replace(/\.0$/, '');

                return (
                  <div className="space-x-1 flex flex-wrap items-center gap-y-1">
                    <span>Total Duration={selectedEmpDetail.total_duration_str || '0 Hrs 0 Min'}</span>
                    <span className="text-slate-400">,</span>
                    <span className="text-emerald-700">PresentDays={selectedEmpDetail.present_days || 0}</span>
                    {onDutyDaysCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-teal-700 font-bold bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                          On Duty={onDutyDaysCount}
                        </span>
                      </>
                    )}
                    {onSiteDaysCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-sky-700 font-bold bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
                          On Site={onSiteDaysCount}
                        </span>
                      </>
                    )}
                    <span className="text-slate-400">,</span>
                    <span className="text-amber-700">Leaves={selectedEmpDetail.leave_days || 0}</span>
                    {overLeaveDaysCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-rose-700 font-extrabold bg-rose-100 px-1 py-0.2 rounded border border-rose-300">
                          Over-Leave={overLeaveDaysCount}
                        </span>
                      </>
                    )}
                    <span className="text-slate-400">,</span>
                    <span className="text-indigo-700">Holiday={selectedEmpDetail.holiday_days || 0}</span>
                    <span className="text-slate-400">,</span>
                    <span className="text-rose-700">AbsentDays={selectedEmpDetail.absent_days || 0}</span>
                    <span className="text-slate-400">,</span>
                    <span className="text-slate-600">Weekly Off ={selectedEmpDetail.weekly_off_days || 0}</span>
                    {halfDaysCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-amber-800">Half Days={halfDaysCount}</span>
                      </>
                    )}
                    {lateDaysCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-orange-700">Late Days={lateDaysCount}</span>
                      </>
                    )}
                    {permDaysCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-purple-700">Permissions={permDaysCount} ({totalPermHrs} hrs)</span>
                      </>
                    )}
                    {finesCount > 0 && (
                      <>
                        <span className="text-slate-400">,</span>
                        <span className="text-rose-800 font-extrabold bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                          Confirmed Fines={finesCount} (₹{totalFineAmt})
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
              <button
                onClick={() => setSelectedEmpDetail(null)}
                className="rounded-md bg-white border border-slate-300 px-3 py-1 text-xs font-sans font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;

