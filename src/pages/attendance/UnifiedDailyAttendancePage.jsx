import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Edit3,
  SlidersHorizontal,
  DollarSign,
  ScanFace,
  ChevronDown,
  Briefcase,
  ExternalLink,
  Check,
  X,
  Sparkles,
  CalendarDays,
  CheckSquare,
  Square,
} from 'lucide-react';
import { StatCard, StatusBadge, Modal } from '../../components/common';
import { exportDailyAttendanceExcel, exportToExcel } from '../../utils/excelUtils';
import {
  useDailySummary,
  useBackendHealth,
  useSaveDailyReview,
  useSaveLateFine,
  useDownloadDeviceLogs,
  useToggleOnSite,
} from '../../api/attendanceApi';
import RegularizeModal from './RegularizeModal';
import HolidayManagementModal from './HolidayManagementModal';

/**
 * UnifiedDailyAttendancePage
 * -------------------------------------------------------------
 * Pilot / Unified Daily Attendance Operations Hub.
 * Consolidates Biometric Punches, Missing Punch Regularization,
 * Leaves & On-Site, and Inline Late Fine Assessments in ONE place.
 *
 * NOTE: Created as an independent pilot page to preserve existing
 * AttendancePage, ManualAttendancePage, and ManualLateFinePage intact.
 */
export const UnifiedDailyAttendancePage = () => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Default to yesterday (the completed previous day awaiting daily review)
  const [selectedDate, setSelectedDate] = useState(yesterdayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ACTION_NEEDED'); // 'ACTION_NEEDED' | 'ALL' | 'PRESENT' | 'LEAVE_LOP' | 'LATE_FINES'
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL'); // 'ALL' | 'ESSL' | 'MANUAL'
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Modals state
  const [selectedForReview, setSelectedForReview] = useState(null);
  const [selectedFineRecord, setSelectedFineRecord] = useState(null);
  const [fineAmountInput, setFineAmountInput] = useState('100');
  const [fineStatusInput, setFineStatusInput] = useState('CONFIRMED');
  const [permissionMinutesInput, setPermissionMinutesInput] = useState('0');
  const [fineReasonInput, setFineReasonInput] = useState('');
  const [enteredByInput, setEnteredByInput] = useState('');
  const [fineModalError, setFineModalError] = useState('');
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Per-Employee Scheduled Checkout Settings
  const [shiftSettings, setShiftSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('scoto_employee_shift_settings') || '{}');
    } catch {
      return {};
    }
  });

  const getEmployeeCheckoutTime = (empCode) => {
    return shiftSettings[empCode]?.checkoutTime || '19:30';
  };

  const toggleEmployeeShift = (empCode, e) => {
    if (e) e.stopPropagation();
    const current = getEmployeeCheckoutTime(empCode);
    const updated = current === '19:30' ? '18:45' : '19:30';
    const nextSettings = {
      ...shiftSettings,
      [empCode]: { checkoutTime: updated },
    };
    setShiftSettings(nextSettings);
    localStorage.setItem('scoto_employee_shift_settings', JSON.stringify(nextSettings));
    showToast(`Scheduled checkout for ${empCode} set to ${updated === '19:30' ? '07:30 PM (Standard)' : '06:45 PM (Special Shift)'}.`);
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries & Mutations
  const { data: healthData } = useBackendHealth();
  const {
    data: attendanceRecords = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDailySummary({
    target_date: selectedDate,
    limit: 500,
  });

  const saveDailyReviewMutation = useSaveDailyReview();
  const saveLateFineMutation = useSaveLateFine();
  const downloadLogsMutation = useDownloadDeviceLogs();
  const toggleOnSiteMutation = useToggleOnSite();

  // Initialize entered by user name
  useEffect(() => {
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      setEnteredByInput(authUser.name || authUser.username || authUser.user_id || 'HR Operator');
    } catch {
      setEnteredByInput('HR Operator');
    }
  }, []);

  // Format timestamp helper
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

  // Compute late minutes helper
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
        return Math.floor((punch.getTime() - shiftStart.getTime()) / (1000 * 60));
      }
    } catch {
      return 0;
    }
  };    

  // Compute early exit minutes helper
  const computeEarlyExit = (outIso, scheduledCheckout = '19:30', earlyPermMinutes = 0) => {
    if (!outIso) return { isEarly: false, earlyMinutes: 0 };
    try {
      const outDate = new Date(outIso);
      if (isNaN(outDate.getTime())) return { isEarly: false, earlyMinutes: 0 };

      // Crucial eSSL condition: If checkout is at or after 18:45 (06:45 PM), it is ON TIME (0 early exit)
      const outHours = outDate.getHours();
      const outMins = outDate.getMinutes();
      if (outHours > 18 || (outHours === 18 && outMins >= 45)) {
        return { isEarly: false, earlyMinutes: 0 };
      }

      const [schedHours, schedMins] = (scheduledCheckout === '18:45' ? '18:45' : '18:45').split(':').map(Number);
      const schedDate = new Date(outDate);
      schedDate.setHours(schedHours, schedMins, 0, 0);

      const effectiveSched = new Date(schedDate.getTime() - (Number(earlyPermMinutes) || 0) * 60 * 1000);

      if (outDate.getTime() < effectiveSched.getTime()) {
        const diffMinutes = Math.floor((effectiveSched.getTime() - outDate.getTime()) / (1000 * 60));
        return { isEarly: diffMinutes > 0, earlyMinutes: diffMinutes };
      }
      return { isEarly: false, earlyMinutes: 0 };
    } catch {
      return { isEarly: false, earlyMinutes: 0 };
    }
  };

  // Sync Biometric Logs
  const handleDownloadLogs = async () => {
    try {
      await downloadLogsMutation.mutateAsync();
      showToast('Biometric punch logs synced successfully from eSSL terminal.');
      refetch();
    } catch (err) {
      showToast(err.message || 'Failed to download biometric logs from terminal.', 'error');
    }
  };

  // Statistics Summary
  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(
      (r) =>
        r.first_in ||
        r.status === 'FULL_DAY' ||
        r.status === 'PRESENT_CONFIRMED' ||
        r.status === 'HALF_DAY' ||
        r.status === 'ON_DUTY' ||
        r.status === 'ON_SITE' ||
        r.status === 'ON_FIELD' ||
        r.is_on_site ||
        r.is_on_field
    ).length;

    const onSiteCount = attendanceRecords.filter(
      (r) => r.is_on_site || r.is_on_field || r.status === 'ON_SITE' || r.review_status === 'ON_SITE'
    ).length;

    const actionNeeded = attendanceRecords.filter((rec) => {
      const isMissingInPunch = !rec.first_in;
      const isMissingOutPunch = !rec.last_out || rec.last_out === rec.first_in;
      const isSinglePunch = (isMissingInPunch && rec.last_out) || (rec.first_in && isMissingOutPunch);
      const isLateUnexcused = rec.first_in && rec.late_minutes > 0 && rec.fine_status !== 'WAIVED' && rec.fine_status !== 'CONFIRMED';
      const isNotReviewed = !rec.review_status;
      const isOnSite = Boolean(rec.is_on_site || rec.is_on_field || rec.status === 'ON_SITE');
      const isExempt = rec.status === 'ON_LEAVE' || rec.status === 'COMP_OFF' || rec.status === 'LOP' || rec.status === 'ON_DUTY' || rec.is_holiday || rec.is_weekly_off;
      return (isMissingInPunch || isMissingOutPunch || isLateUnexcused || isSinglePunch || isOnSite) && isNotReviewed && !isExempt;
    }).length;

    const leavesAndLop = attendanceRecords.filter(
      (r) => r.status === 'ON_LEAVE' || r.status === 'COMP_OFF' || r.status === 'LOP' || r.status === 'ABSENT_CONFIRMED' || r.review_status === 'ABSENT_CONFIRMED'
    ).length;

    const lateCount = attendanceRecords.filter((r) => r.first_in && r.late_minutes > 0).length;
    const confirmedFines = attendanceRecords.filter((r) => r.fine_status === 'CONFIRMED' || r.fine_amount > 0).length;
    const waivedFines = attendanceRecords.filter((r) => r.fine_status === 'WAIVED').length;

    return {
      total,
      present,
      actionNeeded,
      onSiteCount,
      leavesAndLop,
      lateCount,
      confirmedFines,
      waivedFines,
    };
  }, [attendanceRecords]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(attendanceRecords)) return [];
    const cleanSearch = searchTerm.trim().toLowerCase();
    return attendanceRecords.filter((rec) => {
      const matchesSearch =
        !cleanSearch ||
        rec.employee_name?.toLowerCase().includes(cleanSearch) ||
        rec.first_name?.toLowerCase().includes(cleanSearch) ||
        rec.last_name?.toLowerCase().includes(cleanSearch) ||
        rec.display_name?.toLowerCase().includes(cleanSearch) ||
        String(rec.employee_code || '').toLowerCase().includes(cleanSearch) ||
        String(rec.essl_employee_code || '').toLowerCase().includes(cleanSearch);

      const matchesStatus = !statusFilter || rec.status === statusFilter;

      const matchesDevice =
        deviceFilter === 'ALL' ||
        (deviceFilter === 'ESSL' && rec.essl_linked) ||
        (deviceFilter === 'MANUAL' && !rec.essl_linked);

      // Tab filter
      let matchesTab = true;
      if (activeTab === 'ACTION_NEEDED') {
        const isMissingInPunch = !rec.first_in;
        const isMissingOutPunch = !rec.last_out || rec.last_out === rec.first_in;
        const isSinglePunch = (isMissingInPunch && rec.last_out) || (rec.first_in && isMissingOutPunch);
        const isLateUnexcused = rec.first_in && rec.late_minutes > 0 && rec.fine_status !== 'WAIVED' && rec.fine_status !== 'CONFIRMED';
        const isNotReviewed = !rec.review_status;
        const isOnSite = Boolean(rec.is_on_site || rec.is_on_field || rec.status === 'ON_SITE');
        const isExempt = rec.status === 'ON_LEAVE' || rec.status === 'COMP_OFF' || rec.status === 'LOP' || rec.status === 'ON_DUTY' || rec.is_holiday || rec.is_weekly_off;
        matchesTab = (isMissingInPunch || isMissingOutPunch || isLateUnexcused || isSinglePunch || isOnSite) && isNotReviewed && !isExempt;
      } else if (activeTab === 'ON_SITE') {
        matchesTab = Boolean(rec.is_on_site || rec.is_on_field || rec.status === 'ON_SITE' || rec.review_status === 'ON_SITE');
      } else if (activeTab === 'PRESENT') {
        matchesTab = Boolean(
          rec.first_in ||
          rec.status === 'FULL_DAY' ||
          rec.status === 'PRESENT_CONFIRMED' ||
          rec.status === 'HALF_DAY' ||
          rec.status === 'ON_DUTY' ||
          rec.status === 'ON_SITE' ||
          rec.status === 'ON_FIELD' ||
          rec.is_on_site ||
          rec.is_on_field
        );
      } else if (activeTab === 'LEAVE_LOP') {
        matchesTab =
          rec.status === 'ON_LEAVE' ||
          rec.status === 'COMP_OFF' ||
          rec.status === 'LOP' ||
          rec.status === 'ABSENT_CONFIRMED' ||
          rec.review_status === 'ABSENT_CONFIRMED';
      } else if (activeTab === 'LATE_FINES') {
        matchesTab = Boolean(rec.first_in && (rec.late_minutes > 0 || rec.fine_amount > 0 || rec.fine_status === 'WAIVED'));
      }

      return matchesSearch && matchesStatus && matchesDevice && matchesTab;
    });
  }, [attendanceRecords, searchTerm, statusFilter, deviceFilter, activeTab]);

  // Handle Review Submission (from RegularizeModal)
  const handleReviewSubmit = async (payload) => {
    try {
      await saveDailyReviewMutation.mutateAsync({
        ...payload,
        attendance_date: payload.attendance_date || selectedDate,
      });
      setSelectedForReview(null);
      showToast(`Attendance review saved for ${payload.employee_code}.`);
      refetch();
    } catch (err) {
      showToast(err.message || 'Failed to save attendance review.', 'error');
    }
  };

  // 1-Click Toggle On-Site status
  const handleToggleOnSite = async (rec, e) => {
    if (e) e.stopPropagation();
    try {
      const isCurrentlyOnSite = Boolean(
        rec.is_on_site || rec.is_on_field || rec.status === 'ON_SITE' || rec.review_status === 'ON_SITE'
      );
      await toggleOnSiteMutation.mutateAsync(rec.employee_code);
      if (!isCurrentlyOnSite) {
        await saveDailyReviewMutation.mutateAsync({
          employee_code: rec.employee_code,
          attendance_date: selectedDate,
          review_status: 'ON_SITE',
          review_reason: 'Confirmed on-site duty',
          reviewed_by: enteredByInput || 'HR Operator',
        });
        showToast(`Marked ${rec.employee_name || rec.employee_code} as On-Site.`);
      } else {
        showToast(`Removed On-Site flag for ${rec.employee_name || rec.employee_code}.`);
      }
      refetch();
    } catch (err) {
      showToast(err.message || 'Failed to update on-site status', 'error');
    }
  };

  // 1-Click Quick Confirm On-Site
  const handleQuickConfirmOnSite = async (rec, e) => {
    if (e) e.stopPropagation();
    try {
      await saveDailyReviewMutation.mutateAsync({
        employee_code: rec.employee_code,
        attendance_date: selectedDate,
        review_status: 'ON_SITE',
        review_reason: 'Confirmed on-site duty',
        reviewed_by: enteredByInput || 'HR Operator',
        set_on_site_master: true,
      });
      showToast(`Confirmed ${rec.employee_name || rec.employee_code} as On-Site.`);
      refetch();
    } catch (err) {
      showToast(err.message || 'Failed to confirm on-site status', 'error');
    }
  };

  // Handle permission offset input changes and chip button clicks dynamically
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

  // Open Inline Fine Modal
  const openFineModal = (rec) => {
    setSelectedFineRecord(rec);
    setPermissionMinutesInput(String(rec.permission_minutes || 0));
    setFineAmountInput(rec.fine_amount ? String(rec.fine_amount) : '100');
    setFineStatusInput(rec.fine_status === 'WAIVED' ? 'WAIVED' : 'CONFIRMED');
    setFineReasonInput(rec.fine_reason || '');
    setFineModalError('');
  };

  // Save Inline Fine
  const handleSaveFine = async (e) => {
    e.preventDefault();
    if (!selectedFineRecord) return;
    setFineModalError('');

    const permMins = Number(permissionMinutesInput) || 0;
    const computedLate = selectedFineRecord.first_in
      ? computeLateMinutes(selectedFineRecord.first_in, permMins)
      : 0;

    const finalStatus = computedLate === 0 ? 'WAIVED' : (fineStatusInput === 'WAIVED' ? 'WAIVED' : 'CONFIRMED');
    const finalAmount = finalStatus === 'WAIVED' || computedLate === 0 ? 0 : Number(fineAmountInput);

    if (finalStatus === 'CONFIRMED' && (!finalAmount || Number(finalAmount) <= 0)) {
      setFineModalError('Please specify a valid fine amount (INR) before confirming.');
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
        entered_by: enteredByInput.trim() || 'HR Operator',
      });

      setSelectedFineRecord(null);
      showToast(`Late fine adjustment confirmed for ${selectedFineRecord.employee_code}.`);
      refetch();
    } catch (err) {
      setFineModalError(err.message || 'Failed to persist late fine adjustment.');
    }
  };

  // Export Daily Excel
  const handleExportDaily = () => {
    if (!filteredRecords.length) {
      showToast('No records available to export for this date.', 'error');
      return;
    }
    const data = filteredRecords.map((row, idx) => {
      const mins = row.total_minutes || 0;
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      const workDuration = hrs > 0 || rem > 0 ? `${hrs}h ${rem}m` : '0m';

      return {
        'S.No': idx + 1,
        'Employee Code': row.employee_code,
        'Employee Name': row.employee_name,
        'Date': row.target_date || selectedDate,
        'Punch In': row.first_in ? formatTimeOnly(row.first_in) : (row.last_out ? 'Missing IN' : 'Not Punched'),
        'Punch Out': row.last_out ? formatTimeOnly(row.last_out) : (row.first_in ? 'Missing Out' : '--:--'),
        'Duration': workDuration,
        'Late (Mins)': row.late_minutes || 0,
        'Early Exit (Mins)': row.early_exit_minutes || 0,
        'Permission (Mins)': row.permission_minutes || 0,
        'Status': row.status,
        'Fine Status': row.fine_status || 'NONE',
        'Fine (INR)': row.fine_amount || 0,
        'Confirmation': row.review_status || 'Automated',
      };
    });

    exportToExcel(data, `Daily_Attendance_Operations_${selectedDate}`, 'Daily_Desk');
    showToast('Daily operations sheet exported.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-semibold shadow-xs animate-in fade-in ${
            toastType === 'error'
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

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daily Attendance Operations Hub
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              Unified Daily Desk (Pilot)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            All-in-one daily attendance operations: review completed punches, missing out-punches, leaves, and inline late fines in one screen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sync eSSL Biometric Terminal */}
          <button
            type="button"
            onClick={handleDownloadLogs}
            disabled={downloadLogsMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors disabled:opacity-60"
            title="Download latest punch logs from eSSL biometric terminal"
          >
            <ScanFace className={`h-3.5 w-3.5 text-indigo-600 ${downloadLogsMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{downloadLogsMutation.isPending ? 'Syncing...' : 'Sync Device Logs'}</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={handleExportDaily}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 shadow-2xs cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export Day</span>
          </button>

          {/* Office Holidays Master */}
          <button
            type="button"
            onClick={() => setIsHolidayModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 shadow-2xs cursor-pointer transition-colors"
            title="Manage Office Holidays & Festive Calendar (Diwali, Pongal, etc.)"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>Office Holidays</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Reload'}</span>
          </button>
        </div>
      </div>

      {/* Top KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Monitored Workforce"
          value={`${stats.total}`}
          icon={Users}
          color="indigo"
          changeLabel="Total active workforce"
        />

        <StatCard
          title="Present & On-Site"
          value={`${stats.present}`}
          icon={UserCheck}
          color="emerald"
          changeLabel="Punched / On-Site"
        />

        <StatCard
          title="Action Needed"
          value={`${stats.actionNeeded}`}
          icon={AlertTriangle}
          color="amber"
          badge={
            stats.actionNeeded > 0 ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                Pending
              </span>
            ) : null
          }
          changeLabel="Missing punch or late check"
        />

        <StatCard
          title="Leaves & LOP"
          value={`${stats.leavesAndLop}`}
          icon={Calendar}
          color="purple"
          changeLabel="Casual Leave & Loss of Pay"
        />

        <StatCard
          title="Confirmed Fines"
          value={`₹${attendanceRecords.reduce((sum, r) => sum + (Number(r.fine_amount) || 0), 0)}`}
          icon={DollarSign}
          color="rose"
          changeLabel={`${stats.confirmedFines} fined, ${stats.waivedFines} waived`}
        />
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'ACTION_NEEDED', label: 'Action Needed (Daily Review)', count: stats.actionNeeded, alert: stats.actionNeeded > 0 },
          { id: 'ON_SITE', label: 'On-Site Staff', count: stats.onSiteCount },
          { id: 'ALL', label: 'All Staff', count: stats.total },
          { id: 'PRESENT', label: 'Present Staff', count: stats.present },
          { id: 'LEAVE_LOP', label: 'Leaves & LOP', count: stats.leavesAndLop },
          { id: 'LATE_FINES', label: 'Late & Fines', count: stats.lateCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === tab.id
                  ? 'bg-indigo-700 text-white'
                  : tab.alert
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Date & Filter Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Target Date Input */}
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

          {/* Quick 1-Click Date Shortcuts */}
          <button
            type="button"
            onClick={() => {
              setSelectedDate(yesterdayStr);
              setActiveTab('ACTION_NEEDED');
            }}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
              selectedDate === yesterdayStr
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Review Previous Day completed punches & anomalies"
          >
            ← Previous Day (Review)
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
              selectedDate === todayStr
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="View today's live ongoing attendance"
          >
            Today (Live)
          </button>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT_CONFIRMED">Present (Confirmed)</option>
            <option value="FULL_DAY">Full Day (8h+)</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="ON_LEAVE">Casual Leave (CL)</option>
            <option value="LOP">Loss of Pay (LOP)</option>
            <option value="SINGLE_PUNCH_ANOMALY">Missing Out Punch</option>
          </select>

          {/* Device Type */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Staff Types</option>
            <option value="ESSL">eSSL Biometric Staff</option>
            <option value="MANUAL">Manual Staff</option>
          </select>

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
      </div>

      {/* Main Unified Operations Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="px-3.5 py-3">Employee</th>
                <th className="px-3 py-3">Punch IN</th>
                <th className="px-3 py-3">Punch OUT</th>
                <th className="px-2.5 py-3 text-center">Shift End</th>
                <th className="px-3 py-3 text-center">Early Exit</th>
                <th className="px-2.5 py-3 text-center">Duration</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Late & Penalty</th>
                <th className="px-3 py-3">Confirmation</th>
                <th className="px-3.5 py-3 text-right">Unified Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>Loading daily attendance records for {selectedDate}...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <span>All caught up!</span>
                    <span className="text-xs text-slate-500 block mt-0.5">No records found matching current filter for {selectedDate}.</span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const hasDistinctOut = rec.last_out && rec.last_out !== rec.first_in;
                  const checkoutSched = getEmployeeCheckoutTime(rec.employee_code);
                  const isSpecialShift = checkoutSched === '18:45';
                  const isFined = rec.fine_amount > 0 || rec.fine_status === 'CONFIRMED';
                  const isWaived = rec.fine_status === 'WAIVED';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* Employee Info */}
                      <td className="px-3.5 py-3 font-sans">
                        <div className="font-bold text-slate-900">{rec.employee_name || 'Staff'}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{rec.employee_code}</span>
                          <span>•</span>
                          <span className={`text-[10px] font-semibold px-1 rounded ${
                            rec.essl_linked ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {rec.essl_linked ? 'eSSL Face' : 'Manual'}
                          </span>
                        </div>
                      </td>

                      {/* Punch IN */}
                      <td className="px-3 py-3">
                        {rec.first_in ? (
                          <div>
                            <div className="flex items-center gap-1 text-slate-800 font-semibold">
                              <Clock className="h-3 w-3 text-teal-600" />
                              <span>{formatTimeOnly(rec.first_in)}</span>
                            </div>
                            {rec.late_minutes > 0 && (
                              <span className={`text-[10px] font-bold block mt-0.5 ${
                                isFined ? 'text-rose-700' : isWaived ? 'text-emerald-700' : 'text-amber-700'
                              }`}>
                                Late: {rec.late_minutes}m {isWaived ? '(Waived)' : ''}
                              </span>
                            )}
                          </div>
                        ) : (rec.is_on_site ?? rec.is_on_field) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            On-Site Duty
                          </span>
                        ) : rec.last_out ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Only Checkout punch was recorded in evening">
                            Missing IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            No Punch
                          </span>
                        )}
                      </td>

                      {/* Punch OUT */}
                      <td className="px-3 py-3">
                        {rec.last_out ? (
                          <div className="flex items-center gap-1 text-slate-800 font-semibold">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>{formatTimeOnly(rec.last_out)}</span>
                          </div>
                        ) : (rec.is_on_site ?? rec.is_on_field) ? (
                          <span className="text-[11px] text-emerald-700 font-medium">On-Site</span>
                        ) : rec.first_in ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Morning IN recorded, evening OUT punch missing">
                            Missing Out
                          </span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      {/* Scheduled Shift End Toggle */}
                      <td className="px-2.5 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleEmployeeShift(rec.employee_code, e)}
                          title="Click to toggle between 7:30 PM (Standard) and 6:45 PM (Special Shift)"
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border cursor-pointer transition-colors ${
                            isSpecialShift
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{isSpecialShift ? '06:45' : '07:30'}</span>
                        </button>
                      </td>

                      {/* Early Exit Column */}
                      <td className="px-3 py-3 text-center font-sans">
                        {rec.is_holiday ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                            {rec.holiday_name || 'Holiday'}
                          </span>
                        ) : rec.is_weekly_off ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Weekly Off
                          </span>
                        ) : (rec.is_on_site ?? rec.is_on_field) ? (
                          <span className="text-slate-400 text-[11px]">—</span>
                        ) : !rec.last_out ? (
                          /* Out punch not inserted -> DO NOT calculate early exit! */
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Out punch was not inserted">
                            Pending Out
                          </span>
                        ) : (
                          (() => {
                            const earlyInfo = computeEarlyExit(rec.last_out, checkoutSched, rec.early_permission_minutes);
                            const earlyMins = earlyInfo.earlyMinutes;
                            const isEarly = earlyMins > 0;

                            if (isEarly) {
                              return (
                                <div>
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-300 shadow-2xs">
                                    <AlertTriangle className="h-3 w-3 text-amber-700" />
                                    Early: {earlyMins}m
                                  </span>
                                  {rec.early_permission_minutes > 0 && (
                                    <span className="text-[10px] font-semibold text-purple-700 block mt-0.5">
                                      Permitted (-{rec.early_permission_minutes}m)
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>On Time</span>
                              </span>
                            );
                          })()
                        )}
                      </td>

                      {/* Work Duration */}
                      <td className="px-2.5 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                        {rec.total_minutes ? `${Math.floor(rec.total_minutes / 60)}h ${rec.total_minutes % 60}m` : '--'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 font-sans">
                        {rec.is_holiday ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            <Sparkles className="h-3 w-3 text-indigo-600" />
                            {rec.holiday_name || 'Holiday'}
                          </span>
                        ) : rec.is_weekly_off ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Weekly Off (WO)
                          </span>
                        ) : (
                          <StatusBadge
                            status={
                              rec.review_status === 'HALF_DAY'
                                ? rec.review_category || 'HALF_DAY'
                                : rec.status
                            }
                            size="sm"
                          />
                        )}
                      </td>

                      {/* Late & Penalty */}
                      <td className="px-3 py-3 font-sans">
                        {isFined ? (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-800 border border-rose-300 shadow-2xs">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            ₹{rec.fine_amount || 100} (Fine)
                          </span>
                        ) : isWaived ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Waived (₹0)
                          </span>
                        ) : rec.late_minutes > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                            Late: {rec.late_minutes}m
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">On Time</span>
                        )}
                      </td>

                      {/* Confirmation / Review Status */}
                      <td className="px-3 py-3 font-sans">
                        {rec.review_status ? (
                          <div>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {rec.review_status === 'PRESENT_CONFIRMED'
                                ? 'Present'
                                : rec.review_status === 'ON_SITE'
                                  ? 'On-Site'
                                  : rec.review_status === 'HALF_DAY'
                                    ? 'Half Day'
                                    : rec.review_status === 'ON_LEAVE'
                                      ? 'CL'
                                      : rec.review_status === 'LOP'
                                        ? 'LOP'
                                        : rec.review_status === 'ON_DUTY'
                                          ? 'On Duty'
                                          : rec.review_status}
                            </span>
                            {rec.review_reason && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={rec.review_reason}>
                                {rec.review_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Auto Log</span>
                        )}
                      </td>

                      {/* Unified Direct Actions */}
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans flex-wrap max-w-[280px]">
                          {/* 1. Quick Regularize Button (Punch, Leave, Half-Day, On-Site) */}
                          <button
                            type="button"
                            onClick={() => setSelectedForReview(rec)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer"
                            title="Regularize punch, mark leave (CL/LOP), or set On-Site"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Regularize</span>
                          </button>

                          {/* 2. Fast 1-Click Waive & Fine Shortcuts for Unprocessed Late Arrivals */}
                          {rec.first_in && rec.late_minutes > 0 && !isFined && !isWaived ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleQuickWaive(rec, e)}
                                title="1-Click Waive Penalty (₹0)"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                <span>Waive</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleQuickFine(rec, 100, e)}
                                title="1-Click Confirm Fine ₹100"
                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs"
                              >
                                <DollarSign className="h-3 w-3" />
                                <span>Fine ₹100</span>
                              </button>
                            </>
                          ) : null}

                          {/* 3. Detailed Custom Fine / Permission Modal Trigger */}
                          {rec.first_in && (
                            <button
                              type="button"
                              onClick={() => openFineModal(rec)}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs ${
                                isFined
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : isWaived
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                              title={rec.fine_status ? 'Edit Fine Confirmation' : 'Assess late arrival or apply permission'}
                            >
                              <DollarSign className="h-3 w-3" />
                              <span>{isFined ? 'Fined ₹' + (rec.fine_amount || 100) : isWaived ? 'Waived' : 'Fine'}</span>
                            </button>
                          )}

                          {/* 4. Fast 1-Click Confirm On-Site for staff on field */}
                          {(rec.is_on_site || rec.is_on_field || rec.status === 'ON_SITE') && rec.review_status !== 'ON_SITE' && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickConfirmOnSite(rec, e)}
                              title={`Confirm On-Site duty for ${rec.employee_name || rec.employee_code}`}
                              className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 cursor-pointer transition-colors shadow-2xs"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Confirm On-Site</span>
                            </button>
                          )}
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

      {/* 1. Regularize Modal (Punches, Leaves, Half-Day, On-Site) */}
      {selectedForReview && (
        <RegularizeModal
          isOpen={Boolean(selectedForReview)}
          onClose={() => setSelectedForReview(null)}
          timesheet={selectedForReview}
          defaultCheckoutTime={getEmployeeCheckoutTime(selectedForReview.employee_code)}
          onRegularize={handleReviewSubmit}
          isLoading={saveDailyReviewMutation.isPending}
        />
      )}

      {/* 2. Late Fine Assessment & Adjustment Modal (Identical to ManualLateFinePage) */}
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
          <form onSubmit={handleSaveFine} className="space-y-4 text-xs font-sans">
            {fineModalError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{fineModalError}</span>
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
                      className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${
                        Number(permissionMinutesInput) === chip.mins
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

      {/* 3. Office Holidays Management Master Modal */}
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

export default UnifiedDailyAttendancePage;
