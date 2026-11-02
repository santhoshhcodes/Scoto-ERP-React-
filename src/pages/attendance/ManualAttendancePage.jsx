import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Edit3,
  SlidersHorizontal,
  ChevronDown,
  Briefcase,
  X,
} from 'lucide-react';
import { StatCard, StatusBadge, ExcelImportModal } from '../../components/common';
import { exportDailyAttendanceExcel, exportMonthlyAttendanceExcel, exportToExcel } from '../../utils/excelUtils';
import {
  attendanceApi,
  useDailySummary,
  useBackendHealth,
  useSaveDailyReview,
  useCreateLeave,
  useCreatePermission,
  useToggleOnSite,
  useToggleOnField,
} from '../../api/attendanceApi';
import RegularizeModal from './RegularizeModal';

export const ManualAttendancePage = () => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'NEEDS_REVIEW' | 'ALL' | 'PRESENT' | 'LEAVE_LOP'
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL'); // 'ALL' | 'ESSL' | 'MANUAL'
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportingMonthly, setIsExportingMonthly] = useState(false);
  const [selectedForReview, setSelectedForReview] = useState(null);

  // Per-Employee Scheduled Checkout Settings (Defaults to '19:30', or '18:45' for configured staff)
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

  // Queries
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
  const createLeaveMutation = useCreateLeave();
  const createPermissionMutation = useCreatePermission();
  const toggleOnSiteMutation = useToggleOnSite();
  const toggleOnFieldMutation = toggleOnSiteMutation;

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

  // Check if checkout is early relative to scheduled checkout time
  const checkEarlyCheckout = (lastOutIso, scheduledTimeStr = '19:30') => {
    if (!lastOutIso) return null;
    try {
      const d = new Date(lastOutIso);
      if (isNaN(d.getTime())) return null;
      const parts = scheduledTimeStr.split(':');
      const scheduled = new Date(d);
      scheduled.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

      const diffMins = Math.floor((scheduled.getTime() - d.getTime()) / (1000 * 60));
      if (diffMins > 0) {
        return diffMins;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Filtered List
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

      // Quick Tab Filter
      let matchesTab = true;
      if (activeTab === 'ACTION_NEEDED' || activeTab === 'NEEDS_REVIEW') {
        const isMissingInPunch = !rec.first_in;
        const isMissingOutPunch = rec.first_in && (!rec.last_out || rec.last_out === rec.first_in);
        const isLateUnexcused = rec.first_in && rec.late_minutes > 0 && rec.fine_status !== 'WAIVED' && rec.fine_status !== 'CONFIRMED';
        const isNotReviewed = !rec.review_status;
        const isExempt = rec.is_on_site || rec.is_on_field || rec.status === 'ON_LEAVE' || rec.status === 'COMP_OFF' || rec.status === 'LOP' || rec.status === 'ON_DUTY';
        matchesTab = (isMissingInPunch || isMissingOutPunch || isLateUnexcused) && isNotReviewed && !isExempt;
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
          rec.status === 'ABSENT_CONFIRMED';
      }

      return matchesSearch && matchesStatus && matchesDevice && matchesTab;
    });
  }, [attendanceRecords, searchTerm, statusFilter, deviceFilter, activeTab]);

  // Statistics Summary from database records
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

    const reviewNeeded = attendanceRecords.filter((rec) => {
      const isMissingInPunch = !rec.first_in;
      const isMissingOutPunch = rec.first_in && (!rec.last_out || rec.last_out === rec.first_in);
      const isLateUnexcused = rec.first_in && rec.late_minutes > 0 && rec.fine_status !== 'WAIVED' && rec.fine_status !== 'CONFIRMED';
      const isNotReviewed = !rec.review_status;
      const isExempt = rec.is_on_site || rec.is_on_field || rec.status === 'ON_LEAVE' || rec.status === 'COMP_OFF' || rec.status === 'LOP' || rec.status === 'ON_DUTY';
      return (isMissingInPunch || isMissingOutPunch || isLateUnexcused) && isNotReviewed && !isExempt;
    }).length;

    const leavesAndLop = attendanceRecords.filter(
      (r) => r.status === 'ON_LEAVE' || r.status === 'COMP_OFF' || r.status === 'LOP'
    ).length;

    const confirmedReviews = attendanceRecords.filter((r) => Boolean(r.review_status)).length;

    return {
      total,
      present,
      reviewNeeded,
      leavesAndLop,
      confirmedReviews,
    };
  }, [attendanceRecords]);

  // Handle Review Save (supports regular daily review and multi-day On Duty)
  const handleReviewSubmit = async (payload) => {
    try {
      if (payload.is_multi_day_on_duty) {
        const start = new Date(payload.start_date);
        const end = new Date(payload.end_date);
        const diffDays = Math.max(1, Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1);

        await createLeaveMutation.mutateAsync({
          employee_code: payload.employee_code,
          start_date: payload.start_date,
          end_date: payload.end_date,
          leave_type: 'ON_DUTY',
          leave_days: diffDays,
          reason: payload.reason || 'Multi-Day On Duty Assignment',
          created_by: payload.created_by,
        });

        if (payload.apply_permission && payload.permission_minutes > 0) {
          await createPermissionMutation.mutateAsync({
            employee_code: payload.employee_code,
            attendance_date: payload.start_date,
            permission_minutes: payload.permission_minutes,
            created_by: payload.created_by,
          });
        }

        showToast(`On Duty (${diffDays} days: ${payload.start_date} to ${payload.end_date}) saved for ${payload.employee_code}.`);
      } else {
        const empCode = payload.employee_code;
        const currentRec = attendanceRecords.find((r) => r.employee_code === empCode);

        // Synchronize On-Site Master status in Employee_Mst if requested
        const wantsSetMaster = payload.set_on_site_master ?? payload.set_on_field_master;
        const wantsRemoveMaster = payload.remove_on_site_master ?? payload.remove_on_field_master;
        const isOnSiteReview = payload.review_status === 'ON_SITE' || payload.review_status === 'ON_FIELD';
        const currentIsOnSite = currentRec?.is_on_site ?? currentRec?.is_on_field;

        if (isOnSiteReview && wantsSetMaster) {
          if (currentRec && !currentIsOnSite) {
            await toggleOnSiteMutation.mutateAsync(empCode);
          }
        } else if (wantsRemoveMaster && currentRec && currentIsOnSite) {
          await toggleOnSiteMutation.mutateAsync(empCode);
        }

        await saveDailyReviewMutation.mutateAsync({
          employee_code: payload.employee_code,
          attendance_date: payload.attendance_date,
          review_status: payload.review_status,
          review_category: payload.review_category,
          review_reason: payload.review_reason,
          corrected_check_in: payload.corrected_check_in,
          corrected_check_out: payload.corrected_check_out,
          reviewed_by: payload.reviewed_by,
          permission_minutes: payload.apply_permission && payload.permission_minutes > 0 ? Number(payload.permission_minutes) : null,
        });

        if (payload.apply_permission && payload.permission_minutes > 0) {
          await createPermissionMutation.mutateAsync({
            employee_code: payload.employee_code,
            attendance_date: payload.attendance_date,
            permission_minutes: payload.permission_minutes,
            created_by: payload.reviewed_by,
          });
        }

        showToast(
          payload.review_status === 'ON_SITE' || payload.review_status === 'ON_FIELD'
            ? `On-Site attendance & profile confirmed for ${payload.employee_code}.`
            : `Attendance confirmation saved for ${payload.employee_code}.`
        );
      }
      setSelectedForReview(null);
    } catch (err) {
      showToast(err.message || 'Failed to save attendance.', 'error');
    }
  };

  // Quick 1-Click Casual Leave (CL)
  const handleQuickMarkLeave = async (rec, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const reviewer = authUser.name || authUser.username || authUser.user_id || 'Attendance In-charge';
      const targetDate = rec.target_date || selectedDate;

      await saveDailyReviewMutation.mutateAsync({
        employee_code: rec.employee_code,
        attendance_date: targetDate,
        review_status: 'ON_LEAVE',
        review_category: 'CASUAL_LEAVE',
        review_reason: 'Casual Leave (CL)',
        corrected_check_in: null,
        corrected_check_out: null,
        reviewed_by: reviewer,
      });
      showToast(`Casual Leave (CL) confirmed for ${rec.employee_name || rec.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to mark leave.', 'error');
    }
  };

  // Quick 1-Click Compensation Off (Comp Off)
  const handleQuickMarkCompOff = async (rec, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const reviewer = authUser.name || authUser.username || authUser.user_id || 'Attendance In-charge';
      const targetDate = rec.target_date || selectedDate;

      await saveDailyReviewMutation.mutateAsync({
        employee_code: rec.employee_code,
        attendance_date: targetDate,
        review_status: 'COMP_OFF',
        review_category: 'COMPENSATION',
        review_reason: 'Compensation Off (Comp Off)',
        corrected_check_in: null,
        corrected_check_out: null,
        reviewed_by: reviewer,
      });
      showToast(`Comp Off confirmed for ${rec.employee_name || rec.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to mark Comp Off.', 'error');
    }
  };

  // Quick 1-Click Loss of Pay (LOP)
  const handleQuickMarkLOP = async (rec, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const reviewer = authUser.name || authUser.username || authUser.user_id || 'Attendance In-charge';
      const targetDate = rec.target_date || selectedDate;

      await saveDailyReviewMutation.mutateAsync({
        employee_code: rec.employee_code,
        attendance_date: targetDate,
        review_status: 'LOP',
        review_category: 'LOSS_OF_PAY',
        review_reason: 'Loss of Pay (LOP)',
        corrected_check_in: null,
        corrected_check_out: null,
        reviewed_by: reviewer,
      });
      showToast(`Loss of Pay (LOP) confirmed for ${rec.employee_name || rec.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to mark LOP.', 'error');
    }
  };

  // Quick 1-Click Half Day (1st Half: 9:30-1:30 | 2nd Half: 1:30-7:30)
  const handleQuickMarkHalfDay = async (rec, slot, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const reviewer = authUser.name || authUser.username || authUser.user_id || 'Attendance In-charge';
      const targetDate = rec.target_date || selectedDate;
      const isFirstHalf = slot === 'HALF_DAY_FIRST';

      await saveDailyReviewMutation.mutateAsync({
        employee_code: rec.employee_code,
        attendance_date: targetDate,
        review_status: 'HALF_DAY',
        review_category: slot,
        review_reason: isFirstHalf ? 'Half Day (1st Half: 09:30 AM – 01:30 PM)' : 'Half Day (2nd Half: 01:30 PM – 07:30 PM)',
        corrected_check_in: isFirstHalf ? `${targetDate}T09:30:00` : `${targetDate}T13:30:00`,
        corrected_check_out: isFirstHalf ? `${targetDate}T13:30:00` : `${targetDate}T19:30:00`,
        reviewed_by: reviewer,
      });
      showToast(`${isFirstHalf ? '1st Half Day (9:30-1:30)' : '2nd Half Day (1:30-7:30)'} confirmed for ${rec.employee_name || rec.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to mark Half Day.', 'error');
    }
  };

  // Toggle persistent On-Site staff setting
  const handleToggleOnSite = async (employeeCode, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      const res = await toggleOnSiteMutation.mutateAsync(employeeCode);
      const isNowOnSite = res?.is_on_site ?? res?.is_on_field;
      showToast(
        isNowOnSite
          ? `Employee ${employeeCode} set as On-Site. Automatically marked Present daily until changed.`
          : `Employee ${employeeCode} removed from On-Site status.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to toggle On-Site status.', 'error');
    }
  };

  // Backwards compatibility alias
  const handleToggleOnField = handleToggleOnSite;


  // Export Daily Attendance to Excel (Per-Day)
  const handleExportDaily = async () => {
    if (!filteredRecords.length) {
      showToast('No records available to export for this date.', 'error');
      return;
    }

    try {
      await exportDailyAttendanceExcel(filteredRecords, selectedDate, {
        company_name: 'SCOTO',
        getEmployeeCheckoutTime,
      });
      showToast(`Daily attendance for ${selectedDate} exported to Excel.`);
    } catch (err) {
      showToast(err.message || 'Failed to export daily attendance.', 'error');
    }
  };

  // Export Full Month Attendance to Excel (Monthly)
  const handleExportMonthly = async () => {
    try {
      setIsExportingMonthly(true);
      const d = new Date(selectedDate);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      showToast(`Preparing monthly attendance register for ${month}/${year}...`);
      const monthlyData = await attendanceApi.getMonthlyReport({ month, year });

      if (!monthlyData || !monthlyData.employees || !monthlyData.employees.length) {
        showToast('No monthly attendance data found for this period.', 'error');
        return;
      }

      await exportMonthlyAttendanceExcel(monthlyData, month, year, {
        company_name: 'SCOTO',
      });
      showToast(`Monthly attendance register for ${month}/${year} exported successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to export monthly attendance.', 'error');
    } finally {
      setIsExportingMonthly(false);
    }
  };

  // Import Handler
  const handleImportExcel = async (importedRows) => {
    if (!Array.isArray(importedRows) || !importedRows.length) {
      showToast('No rows found in uploaded Excel file.', 'error');
      return;
    }

    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const reviewer = authUser.name || authUser.username || authUser.user_id || 'HR Admin';

      let successCount = 0;
      let errorCount = 0;

      for (const row of importedRows) {
        const empCode = row['Employee Code'] || row['employee_code'] || row['Code'];
        const status = row['Status'] || row['Review Status'] || row['status'] || 'PRESENT_CONFIRMED';
        const inTime = row['In Time'] || row['first_in'];
        const outTime = row['Out Time'] || row['last_out'];
        const reason = row['Reason'] || row['Remarks'] || 'Excel Bulk Import';

        if (!empCode) {
          errorCount++;
          continue;
        }

        let correctedIn = null;
        let correctedOut = null;

        if (inTime && inTime.includes(':')) {
          const parts = inTime.split(':');
          correctedIn = `${selectedDate}T${parts[0].padStart(2, '0')}:${parts[1].slice(0, 2)}:00`;
        }
        if (outTime && outTime.includes(':')) {
          const parts = outTime.split(':');
          correctedOut = `${selectedDate}T${parts[0].padStart(2, '0')}:${parts[1].slice(0, 2)}:00`;
        }

        try {
          await saveDailyReviewMutation.mutateAsync({
            employee_code: String(empCode).trim(),
            attendance_date: selectedDate,
            review_status: status.toUpperCase().includes('ABSENT')
              ? 'ABSENT_CONFIRMED'
              : status.toUpperCase().includes('DUTY')
                ? 'ON_DUTY'
                : status.toUpperCase().includes('LEAVE')
                  ? 'ON_LEAVE'
                  : status.toUpperCase().includes('LOP')
                    ? 'LOP'
                    : 'PRESENT_CONFIRMED',
            review_category: 'MANUAL_CORRECTION',
            review_reason: reason,
            corrected_check_in: correctedIn,
            corrected_check_out: correctedOut,
            reviewed_by: reviewer,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      setIsImportModalOpen(false);
      showToast(
        `Import processed: ${successCount} saved, ${errorCount} failed.`
      );
    } catch (err) {
      showToast(err.message || 'Error processing Excel import.', 'error');
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

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Daily Attendance Register & Direct Entry
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Direct Confirmation Mode
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Single-operator attendance register: directly confirm punches, shifts, leaves (CL) & Loss of Pay (LOP)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export to Excel (Daily & Monthly) */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={handleExportDaily}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 shadow-2xs cursor-pointer transition-colors"
              title={`Download daily Excel register for ${selectedDate}`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Day</span>
            </button>
            <button
              type="button"
              onClick={handleExportMonthly}
              disabled={isExportingMonthly}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 shadow-2xs cursor-pointer transition-colors disabled:opacity-60"
              title="Download entire month attendance matrix (Calendar grid with Employee Names, Dates, Status & Workforce Totals)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
              <span>{isExportingMonthly ? 'Exporting...' : 'Export Month'}</span>
            </button>
          </div>

          {/* Import from Excel */}
          {/* <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-600" />
            <span>Import Excel</span>
          </button> */}

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
          value={`${stats.total}`}
          icon={Users}
          color="indigo"
          changeLabel="From Employee_Mst"
        />

        <StatCard
          title="Present & Confirmed"
          value={`${stats.present}`}
          icon={UserCheck}
          color="emerald"
          changeLabel="Active attendance entries"
        />

        <StatCard
          title="Forgotten Punch & Late"
          value={`${stats.reviewNeeded}`}
          icon={AlertCircle}
          color="amber"
          changeLabel="Requires manual check"
        />

        <StatCard
          title="Leaves & LOP"
          value={`${stats.leavesAndLop}`}
          icon={Calendar}
          color="purple"
          changeLabel="CL & Loss of Pay"
        />

        <StatCard
          title="Manual Overrides"
          value={`${stats.confirmedReviews}`}
          icon={CheckCircle2}
          color="teal"
          changeLabel="Manually adjusted"
        />
      </div>

      {/* Quick Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'ALL', label: 'All Employees', count: stats.total },
          { id: 'ACTION_NEEDED', label: 'Forgotten Punch & Late (Manual Check)', count: stats.reviewNeeded, alert: stats.reviewNeeded > 0 },
          { id: 'PRESENT', label: 'Present Staff', count: stats.present },
          { id: 'LEAVE_LOP', label: 'Leaves & LOP', count: stats.leavesAndLop },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${activeTab === tab.id || (tab.id === 'ACTION_NEEDED' && activeTab === 'NEEDS_REVIEW')
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === tab.id || (tab.id === 'ACTION_NEEDED' && activeTab === 'NEEDS_REVIEW')
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

      {/* Filters Bar */}
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
            onClick={() => {
              setSelectedDate(yesterdayStr);
              setActiveTab('ACTION_NEEDED');
            }}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
              selectedDate === yesterdayStr
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Review Previous Day (Yesterday) completed punches, anomalies & missing punch"
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
            Today
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
            <option value="ON_DUTY">OT / On Duty</option>
            <option value="ON_LEAVE">Casual Leave (CL)</option>
            <option value="LOP">Loss of Pay (LOP)</option>
            <option value="SINGLE_PUNCH_ANOMALY">Single Punch / Missing OUT</option>
            <option value="NO_CHECK_IN_REVIEW">No Check-In Recorded</option>
          </select>

          {/* Device Type Filter */}
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

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
        >
          <RotateCcw className={`h-3.5 w-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
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
          <p className="mt-1 text-rose-700">
            {error?.message || 'Unable to retrieve employee attendance records.'}
          </p>
        </div>
      )}

      {/* Main Records Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Source / Device</th>
                <th className="px-4 py-3">Check IN</th>
                <th className="px-4 py-3">Check OUT</th>
                {/* <th className="px-4 py-3">Scheduled OUT</th> */}
                <th className="px-4 py-3">Attendance Status</th>
                <th className="px-4 py-3">Fine & Permission</th>
                <th className="px-4 py-3">Confirmation & Notes</th>
                <th className="px-4 py-3 text-right">Direct Operator Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    Loading employee attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No attendance records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No records match the current filters for {selectedDate}.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const scheduledCheckout = getEmployeeCheckoutTime(rec.employee_code);
                  const isSpecialShift = scheduledCheckout === '18:45';
                  const hasDistinctOut = rec.last_out && rec.last_out !== rec.first_in;
                  const earlyMinutes = checkEarlyCheckout(hasDistinctOut ? rec.last_out : null, scheduledCheckout);

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

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {rec.essl_linked ? (
                            <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200">
                              eSSL
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                              Manual
                            </span>
                          )}

                          {/* Persistent On-Site Staff Toggle */}
                          {/* <button
                            type="button"
                            onClick={(e) => handleToggleOnSite(rec.employee_code, e)}
                            title={
                              (rec.is_on_site ?? rec.is_on_field)
                                ? 'Click to remove On-Site designation'
                                : 'Click to set employee as On-Site (automatically marked Present daily until changed)'
                            }
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border transition-all cursor-pointer ${(rec.is_on_site ?? rec.is_on_field)
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs'
                                : 'bg-slate-50 text-slate-500 border-dashed border-slate-300 hover:bg-slate-100 hover:text-slate-800'
                              }`}
                          >
                            <Briefcase className="h-2.5 w-2.5" />
                            <span>{(rec.is_on_site ?? rec.is_on_field) ? 'On-Site Staff' : '+ On-Site'}</span>
                          </button> */}
                        </div>
                      </td>

                      {/* Check-IN */}
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {rec.first_in ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-teal-600" />
                              <span className="font-semibold">{formatTimeOnly(rec.first_in)}</span>
                            </div>
                            {rec.late_minutes > 0 && rec.fine_status !== 'WAIVED' && (
                              <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                                Late: {rec.late_minutes}m
                              </span>
                            )}
                          </div>
                        ) : (rec.is_on_site ?? rec.is_on_field) ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            On-Site Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            Missing
                          </span>
                        )}
                      </td>

                      {/* Check-OUT */}
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {hasDistinctOut ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              <span className="font-semibold text-slate-800">{formatTimeOnly(rec.last_out)}</span>
                            </div>
                            {earlyMinutes && earlyMinutes > 0 ? (
                              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                                Early: {earlyMinutes}m
                              </span>
                            ) : null}
                          </div>
                        ) : (rec.is_on_site ?? rec.is_on_field) ? (
                          <span className="text-emerald-700 font-medium text-[11px]">On-Site Duty</span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">--:--</span>
                        )}
                      </td>

                      {/* Scheduled Shift End Settings */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => toggleEmployeeShift(rec.employee_code, e)}
                          title="Click to toggle between 7:30 PM (Standard) and 6:45 PM (Special Shift)"
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border cursor-pointer transition-colors ${isSpecialShift
                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{isSpecialShift ? '06:45 PM' : '07:30 PM'}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            rec.review_status === 'HALF_DAY'
                              ? rec.review_category || 'HALF_DAY'
                              : rec.status
                          }
                          size="sm"
                        />
                      </td>

                      {/* Fine & Permission Allocated from eSSL / Fine Module */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {rec.permission_minutes > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                              <Clock className="h-3 w-3 text-purple-600" />
                              Perm: +{rec.permission_minutes}m
                            </span>
                          ) : null}

                          {rec.fine_status === 'WAIVED' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Waived
                            </span>
                          ) : rec.fine_amount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              ₹{rec.fine_amount}
                            </span>
                          ) : !rec.first_in && !(rec.is_on_site ?? rec.is_on_field) ? (
                            <span className="text-[11px] text-slate-400">₹0</span>
                          ) : !rec.permission_minutes && rec.late_minutes <= 0 ? (
                            <span className="text-[11px] text-emerald-600 font-medium">₹0</span>
                          ) : null}

                          {!rec.permission_minutes && !rec.fine_amount && rec.fine_status !== 'WAIVED' && rec.late_minutes > 0 && (
                            <span className="text-[11px] text-amber-600 font-semibold block">
                              To Confirm
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Confirmation & Notes */}
                      <td className="px-4 py-3">
                        {rec.review_status ? (
                          <div className="text-[11px]">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {rec.review_status === 'PRESENT_CONFIRMED'
                                ? 'Present'
                                : rec.review_status === 'ON_SITE' || rec.review_status === 'ON_FIELD'
                                  ? 'On-Site'
                                  : rec.review_status === 'HALF_DAY'
                                    ? rec.review_category === 'HALF_DAY_SECOND'
                                      ? '½ 2nd (1:30–7:30)'
                                      : '½ 1st (9:30–1:30)'
                                    : rec.review_status === 'COMP_OFF'
                                      ? 'Comp Off'
                                      : rec.review_status === 'ON_LEAVE'
                                        ? 'CL'
                                        : rec.review_status === 'LOP'
                                          ? 'LOP'
                                          : rec.review_status === 'ON_DUTY'
                                            ? 'On Duty'
                                            : rec.review_status}
                            </span>
                            {rec.review_reason &&
                              !rec.review_reason.toLowerCase().includes('regularized') &&
                              !rec.review_reason.toLowerCase().includes('confirmed directly') && (
                                <div className="text-slate-500 truncate max-w-[130px] text-[10px]" title={rec.review_reason}>
                                  {rec.review_reason}
                                </div>
                              )}
                          </div>
                        ) : (rec.is_on_site ?? rec.is_on_field) ? (
                          <div className="text-[11px]">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              On-Site Staff
                            </span>
                            <div className="text-slate-400 text-[10px]">
                              {rec.first_in ? `Punched ${formatTimeOnly(rec.first_in)}` : 'Auto Present'}
                            </div>
                          </div>
                        ) : rec.first_in ? (
                          <div className="text-[11px]">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Present
                            </span>
                            {rec.late_minutes > 0 ? (
                              <div className="text-rose-600 font-medium text-[10px]">
                                Late: {rec.late_minutes}m
                              </div>
                            ) : !hasDistinctOut ? (
                              <div className="text-amber-600 font-medium text-[10px]">
                                Missing OUT
                              </div>
                            ) : null}
                          </div>
                        ) : rec.status === 'ON_LEAVE' || rec.status === 'COMP_OFF' || rec.status === 'LOP' ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-purple-700">
                              {rec.status === 'COMP_OFF' ? 'Comp Off' : rec.status === 'ON_LEAVE' ? 'CL' : 'LOP'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px]">
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 border border-amber-200">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              No Punch
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Direct Operator Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap max-w-[280px]">
                          {/* 1-Click Casual Leave (CL) */}
                          {/* <button
                            type="button"
                            onClick={(e) => handleQuickMarkLeave(rec, e)}
                            title="1-Click Mark Casual Leave (CL)"
                            className="inline-flex items-center rounded bg-amber-50 border border-amber-200 px-1.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 cursor-pointer transition-colors shadow-2xs"
                          >
                            CL
                          </button> */}

                          {/* 1-Click Compensation Off (Comp) */}
                          {/* <button
                            type="button"
                            onClick={(e) => handleQuickMarkCompOff(rec, e)}
                            title="1-Click Mark Compensation Off (Comp Off)"
                            className="inline-flex items-center rounded bg-teal-50 border border-teal-200 px-1.5 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-100 cursor-pointer transition-colors shadow-2xs"
                          >
                            Comp
                          </button> */}

                          {/* 1-Click Loss of Pay (LOP) */}
                          {/* <button
                            type="button"
                            onClick={(e) => handleQuickMarkLOP(rec, e)}
                            title="1-Click Mark Loss of Pay (LOP)"
                            className="inline-flex items-center rounded bg-rose-50 border border-rose-200 px-1.5 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs"
                          >
                            LOP
                          </button> */}

                          {/* Quick Half Day (1st Half / 2nd Half) */}
                          {/* <div className="inline-flex rounded border border-amber-300 bg-amber-50 overflow-hidden text-[10px] shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => handleQuickMarkHalfDay(rec, 'HALF_DAY_FIRST', e)}
                              title="1-Click 1st Half Day (09:30 AM – 01:30 PM)"
                              className="px-1.5 py-1 font-bold text-amber-800 hover:bg-amber-100 cursor-pointer transition-colors border-r border-amber-200"
                            >
                              ½ 1st
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleQuickMarkHalfDay(rec, 'HALF_DAY_SECOND', e)}
                              title="1-Click 2nd Half Day (01:30 PM – 07:30 PM)"
                              className="px-1.5 py-1 font-bold text-amber-800 hover:bg-amber-100 cursor-pointer transition-colors"
                            >
                              ½ 2nd
                            </button>
                          </div> */}

                          {/* Quick On Duty modal trigger */}
                          {/* <button
                            type="button"
                            onClick={() => setSelectedForReview({ ...rec, review_status: 'ON_DUTY' })}
                            title="Mark On Duty / Multi-Day Field Work"
                            className="inline-flex items-center rounded bg-blue-50 border border-blue-200 px-1.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors shadow-2xs"
                          >
                            OD
                          </button> */}

                          {/* Full Edit Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedForReview(rec)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 transition-colors cursor-pointer"
                            title="Full manual timing adjustment, remarks & permissions"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
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

      {/* Regularize Modal */}
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

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <ExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportExcel}
          title="Import Manual Attendance & Punch Overrides"
          expectedColumns={['Employee Code', 'Status', 'In Time', 'Out Time', 'Reason']}
        />
      )}
    </div>
  );
};

export default ManualAttendancePage;
