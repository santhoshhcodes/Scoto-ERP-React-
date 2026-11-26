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
  Sun,
  Moon,
} from 'lucide-react';
import { StatCard, StatusBadge, Modal } from '../../components/common';
import { exportDailyLateFinesExcel, exportMonthlyLateFinesExcel, exportToExcel, formatMinutesToHM } from '../../utils/excelUtils';
import {
  attendanceApi,
  useDailySummary,
  useBackendHealth,
  useSaveLateFine,
  useUpdateEmployeeShiftTiming,
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

  const toggleEmployeeShift = async (empCode, e) => {
    if (e) e.stopPropagation();
    const current = getEmployeeCheckoutTime(empCode);
    const updated = current === '19:30' ? '18:45' : '19:30';
    const nextSettings = {
      ...shiftSettings,
      [empCode]: { checkoutTime: updated },
    };
    setShiftSettings(nextSettings);
    localStorage.setItem('scoto_employee_shift_settings', JSON.stringify(nextSettings));
    showToast(`Scheduled checkout for ${empCode} set to ${updated === '19:30' ? '07:30 PM (Regular Standard)' : '06:45 PM (Designated Shift)'}.`);
    try {
      await updateEmployeeShiftTimingMutation.mutateAsync({
        employee_code: empCode,
        shift_end_time: updated,
      });
    } catch (err) {
      console.error('Failed to update employee shift timing on server:', err);
    }
  };

  // Fine Edit Modal State
  const [selectedFineRecord, setSelectedFineRecord] = useState(null);
  const [fineModalTab, setFineModalTab] = useState('morning'); // 'morning' | 'evening'
  const [permissionMinutesInput, setPermissionMinutesInput] = useState('0');
  const [earlyPermissionMinutesInput, setEarlyPermissionMinutesInput] = useState('0');
  const [assignedCheckoutInput, setAssignedCheckoutInput] = useState('19:30');
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
  // - If morning permission is approved (>0): cutoff is 09:30 + permission_minutes. 10m grace does NOT apply. Check-in after cutoff is late.
  // - If no permission (=0): 10-minute grace period up to 09:40 AM. Check-in up to 09:40 AM is on time.
  //   After 09:40 AM, late minutes calculated FROM 09:40 AM (e.g. 09:41 = 1m, 09:45 = 5m).
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
        return Math.floor((punch.getTime() - graceCutoff.getTime()) / (1000 * 60));
      }
    } catch {
      return 0;
    }
  };

  // Compute early exit minutes:
  // - If evening permission granted (>0): calculated from actual office closing time (18:30 / 6:30 PM = 1110 mins).
  //   e.g. 30m permission -> allowed exit from 18:00 (6:00 PM). Exits before 18:00 get early exit penalty.
  // - Without evening permission (=0): calculated against individually assigned closing time (19:30 or 18:45).
  const computeEarlyExit = (outIso, scheduledCheckout = '19:30', earlyPermMinutes = 0) => {
    if (!outIso) return { isEarly: false, earlyMinutes: 0, allowedExitStr: '' };
    try {
      const outDate = new Date(outIso);
      if (isNaN(outDate.getTime())) return { isEarly: false, earlyMinutes: 0, allowedExitStr: '' };

      const timeStr = typeof scheduledCheckout === 'string' ? scheduledCheckout : '19:30';
      const [schedHours, schedMins] = timeStr.split(':').map(Number);
      const schedTotalMins = (isNaN(schedHours) ? 19 : schedHours) * 60 + (isNaN(schedMins) ? 30 : schedMins);

      const outHours = outDate.getHours();
      const outMins = outDate.getMinutes();
      const outTotalMins = outHours * 60 + outMins;

      // Early permission offset:
      const permMins = Number(earlyPermMinutes) || 0;
      const baseExitMins = permMins > 0 ? (18 * 60 + 30) : schedTotalMins;
      const allowedExitMins = Math.max(0, baseExitMins - permMins);

      const allowedH = Math.floor(allowedExitMins / 60);
      const allowedM = allowedExitMins % 60;
      const period = allowedH >= 12 ? 'PM' : 'AM';
      const displayH = allowedH % 12 || 12;
      const allowedExitStr = `${String(displayH).padStart(2, '0')}:${String(allowedM).padStart(2, '0')} ${period}`;

      if (outTotalMins >= allowedExitMins) {
        return { isEarly: false, earlyMinutes: 0, allowedExitStr };
      }

      const diffMinutes = allowedExitMins - outTotalMins;
      return { isEarly: diffMinutes > 0, earlyMinutes: Math.max(0, diffMinutes), allowedExitStr };
    } catch {
      return { isEarly: false, earlyMinutes: 0, allowedExitStr: '' };
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
  const updateEmployeeShiftTimingMutation = useUpdateEmployeeShiftTiming();

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

  // Dynamic fine state recomputation based on late perm, early perm, and assigned closing time
  const recomputeFineState = (latePermVal, earlyPermVal, closingVal) => {
    if (!selectedFineRecord) return;
    const latePerm = Number(latePermVal) || 0;
    const earlyPerm = Number(earlyPermVal) || 0;
    const closing = closingVal || '19:30';

    const late = selectedFineRecord.first_in
      ? computeLateMinutes(selectedFineRecord.first_in, latePerm)
      : 0;
    const earlyInfo = selectedFineRecord.last_out
      ? computeEarlyExit(selectedFineRecord.last_out, closing, earlyPerm)
      : { earlyMinutes: 0 };
    const early = earlyInfo.earlyMinutes;

    if (late === 0 && early === 0) {
      setFineStatusInput('WAIVED');
      setFineAmountInput('0');
    } else if (fineStatusInput === 'WAIVED' && (late > 0 || early > 0)) {
      setFineStatusInput('CONFIRMED');
      setFineAmountInput(selectedFineRecord.fine_amount ? String(selectedFineRecord.fine_amount) : '100');
    }
  };

  const handleLatePermissionChange = (val) => {
    setPermissionMinutesInput(val);
    recomputeFineState(val, earlyPermissionMinutesInput, assignedCheckoutInput);
  };

  const handleEarlyPermissionChange = (val) => {
    setEarlyPermissionMinutesInput(val);
    recomputeFineState(permissionMinutesInput, val, assignedCheckoutInput);
  };

  const handleAssignedCheckoutChange = (val) => {
    setAssignedCheckoutInput(val);
    recomputeFineState(permissionMinutesInput, earlyPermissionMinutesInput, val);
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
    const initialLatePerm = record.permission_minutes || 0;
    const initialEarlyPerm = record.early_permission_minutes || 0;
    const initialClosing = record.scheduled_checkout
      ? String(record.scheduled_checkout).slice(0, 5)
      : getEmployeeCheckoutTime(record.employee_code);

    setPermissionMinutesInput(String(initialLatePerm));
    setEarlyPermissionMinutesInput(String(initialEarlyPerm));
    setAssignedCheckoutInput(initialClosing || '19:30');

    const late = record.first_in ? computeLateMinutes(record.first_in, initialLatePerm) : 0;
    const earlyInfo = record.last_out
      ? computeEarlyExit(record.last_out, initialClosing || '19:30', initialEarlyPerm)
      : { earlyMinutes: 0 };
    const early = record.early_exit_minutes || earlyInfo.earlyMinutes || 0;

    const hasViolation = late > 0 || early > 0;
    if (!hasViolation) {
      setFineAmountInput('0');
      setFineStatusInput('WAIVED');
    } else {
      setFineAmountInput(record.fine_amount ? String(record.fine_amount) : '100');
      setFineStatusInput(record.fine_status === 'WAIVED' ? 'WAIVED' : 'CONFIRMED');
    }
    setFineModalTab(late === 0 && early > 0 ? 'evening' : 'morning');
    setFineReasonInput(record.fine_reason || record.review_reason || '');
    setModalError('');
  };

  // Quick 1-click Waive for single operator
  const handleQuickWaive = async (record, e) => {
    if (e) e.stopPropagation();
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      const enteredBy = authUser.name || authUser.username || authUser.user_id || 'HR Admin';
      const sched = getEmployeeCheckoutTime(record.employee_code);
      const earlyInfo = computeEarlyExit(record.last_out, sched, record.early_permission_minutes);

      await saveLateFineMutation.mutateAsync({
        employee_code: record.employee_code,
        attendance_date: record.target_date || selectedDate,
        actual_check_in: record.first_in || null,
        shift_start_time: record.shift_start_time || '09:30',
        allowed_until: record.allowed_until || null,
        permission_minutes_applied: record.permission_minutes || 0,
        actual_check_out: record.last_out || null,
        shift_end_time: sched,
        early_exit_minutes: record.early_exit_minutes || earlyInfo.earlyMinutes || 0,
        early_permission_minutes: record.early_permission_minutes || 0,
        fine_type: (record.late_minutes > 0 && (record.early_exit_minutes > 0 || earlyInfo.isEarly)) ? 'BOTH' : (record.early_exit_minutes > 0 || earlyInfo.isEarly) ? 'EARLY_EXIT' : 'LATE_ARRIVAL',
        late_minutes: record.late_minutes || 0,
        fine_amount: 0,
        fine_status: 'WAIVED',
        reason: 'Penalty waived directly by attendance in-charge',
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
      const sched = getEmployeeCheckoutTime(record.employee_code);
      const earlyInfo = computeEarlyExit(record.last_out, sched, record.early_permission_minutes);
      const earlyMins = record.early_exit_minutes || earlyInfo.earlyMinutes || 0;
      const lateMins = record.late_minutes || 0;

      let fineType = 'LATE_ARRIVAL';
      if (lateMins > 0 && earlyMins > 0) fineType = 'BOTH';
      else if (earlyMins > 0) fineType = 'EARLY_EXIT';

      await saveLateFineMutation.mutateAsync({
        employee_code: record.employee_code,
        attendance_date: record.target_date || selectedDate,
        actual_check_in: record.first_in || null,
        shift_start_time: record.shift_start_time || '09:30',
        allowed_until: record.allowed_until || null,
        permission_minutes_applied: record.permission_minutes || 0,
        actual_check_out: record.last_out || null,
        shift_end_time: sched,
        early_exit_minutes: earlyMins,
        early_permission_minutes: record.early_permission_minutes || 0,
        fine_type: fineType,
        late_minutes: lateMins,
        fine_amount: amount,
        fine_status: 'CONFIRMED',
        reason: `Penalty confirmed (₹${amount}) by attendance in-charge`,
        entered_by: enteredBy,
      });
      showToast(`Fine of ₹${amount} confirmed for ${record.employee_name || record.employee_code}.`);
    } catch (err) {
      showToast(err.message || 'Failed to confirm fine.', 'error');
    }
  };

  // Submit Fine Mutation
  const handleSaveFine = async (e) => {
    e.preventDefault();
    if (!selectedFineRecord) return;
    setModalError('');

    const latePerm = Number(permissionMinutesInput) || 0;
    const earlyPerm = Number(earlyPermissionMinutesInput) || 0;
    const closingTime = assignedCheckoutInput || '19:30';

    const computedLate = selectedFineRecord.first_in
      ? computeLateMinutes(selectedFineRecord.first_in, latePerm)
      : 0;
    const earlyInfo = selectedFineRecord.last_out
      ? computeEarlyExit(selectedFineRecord.last_out, closingTime, earlyPerm)
      : { earlyMinutes: 0 };
    const computedEarly = earlyInfo.earlyMinutes;

    let fineType = 'LATE_ARRIVAL';
    if (computedLate > 0 && computedEarly > 0) {
      fineType = 'BOTH';
    } else if (computedEarly > 0) {
      fineType = 'EARLY_EXIT';
    } else if (computedLate > 0) {
      fineType = 'LATE_ARRIVAL';
    } else {
      fineType = 'NONE';
    }

    const hasViolations = computedLate > 0 || computedEarly > 0;
    const finalStatus = !hasViolations ? 'WAIVED' : (fineStatusInput === 'WAIVED' ? 'WAIVED' : 'CONFIRMED');
    const finalAmount = finalStatus === 'WAIVED' || !hasViolations ? 0 : Number(fineAmountInput);

    if (finalStatus === 'CONFIRMED' && (!finalAmount || Number(finalAmount) <= 0)) {
      setModalError('Please specify a valid fine amount (INR) before confirming.');
      return;
    }

    if (!enteredByInput.trim()) {
      setModalError('Entered by name/ID is required.');
      return;
    }

    try {
      // 1. Sync employee individually assigned closing time to state & database if changed
      const prevClosing = getEmployeeCheckoutTime(selectedFineRecord.employee_code);
      if (closingTime !== prevClosing) {
        const nextSettings = {
          ...shiftSettings,
          [selectedFineRecord.employee_code]: { checkoutTime: closingTime },
        };
        setShiftSettings(nextSettings);
        localStorage.setItem('scoto_employee_shift_settings', JSON.stringify(nextSettings));
        await updateEmployeeShiftTimingMutation.mutateAsync({
          employee_code: selectedFineRecord.employee_code,
          shift_end_time: closingTime,
        });
      }

      // 2. Persist Unified Late Fine & Early Exit assessment record
      await saveLateFineMutation.mutateAsync({
        employee_code: selectedFineRecord.employee_code,
        attendance_date: selectedFineRecord.target_date || selectedDate,
        actual_check_in: selectedFineRecord.first_in || null,
        shift_start_time: selectedFineRecord.shift_start_time || '09:30',
        allowed_until: selectedFineRecord.allowed_until || null,
        permission_minutes_applied: latePerm,
        actual_check_out: selectedFineRecord.last_out || null,
        shift_end_time: closingTime,
        early_exit_minutes: computedEarly,
        early_permission_minutes: earlyPerm,
        fine_type: fineType,
        late_minutes: computedLate,
        fine_amount: finalAmount,
        fine_status: finalStatus,
        reason: fineReasonInput.trim() || undefined,
        entered_by: enteredByInput.trim(),
      });

      setSelectedFineRecord(null);
      showToast(`Attendance penalty assessment saved for ${selectedFineRecord.employee_code}.`);
    } catch (err) {
      setModalError(err.message || 'Failed to persist penalty adjustment.');
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

      const sched = getEmployeeCheckoutTime(rec.employee_code);
      const earlyInfo = computeEarlyExit(rec.last_out, sched, rec.early_permission_minutes);
      const hasEarly = Boolean(rec.last_out && (rec.early_exit_minutes > 0 || earlyInfo.isEarly));
      const hasLate = Boolean(rec.first_in && rec.late_minutes > 0);
      const hasViolation = hasLate || hasEarly;

      let matchesStatus = true;
      if (fineStatusFilter === 'UNPROCESSED') {
        matchesStatus = Boolean(
          hasViolation &&
          rec.fine_status !== 'CONFIRMED' &&
          rec.fine_status !== 'WAIVED'
        );
      } else if (fineStatusFilter === 'CONFIRMED') {
        matchesStatus = rec.fine_status === 'CONFIRMED';
      } else if (fineStatusFilter === 'WAIVED') {
        matchesStatus = rec.fine_status === 'WAIVED';
      } else if (fineStatusFilter === 'EARLY_EXIT') {
        matchesStatus = hasEarly;
      } else if (fineStatusFilter === 'LATE') {
        matchesStatus = hasLate;
      }

      // Late/Violations Only filter excludes unpunched and on-time staff
      const matchesLate = !lateOnlyFilter || hasViolation;

      return matchesSearch && matchesStatus && matchesLate;
    });
  }, [dailyRecords, searchTerm, fineStatusFilter, lateOnlyFilter, shiftSettings]);

  // Statistics KPI computation from real DB records
  const stats = useMemo(() => {
    const totalStaff = dailyRecords.length;
    const notPunchedCount = dailyRecords.filter((r) => !r.first_in && !r.last_out).length;
    const lateEmployees = dailyRecords.filter((r) => r.first_in && r.late_minutes > 0);
    const lateCount = lateEmployees.length;

    let earlyCount = 0;
    let confirmedAmount = 0;
    let confirmedCount = 0;
    let unprocessedCount = 0;
    let waivedCount = 0;

    dailyRecords.forEach((r) => {
      const sched = getEmployeeCheckoutTime(r.employee_code);
      const earlyInfo = computeEarlyExit(r.last_out, sched, r.early_permission_minutes);
      const isEarly = Boolean(r.last_out && (r.early_exit_minutes > 0 || earlyInfo.isEarly));
      const isLate = Boolean(r.first_in && r.late_minutes > 0);
      if (isEarly) earlyCount++;

      if (r.fine_status === 'CONFIRMED') {
        confirmedCount++;
        if (r.fine_amount) {
          confirmedAmount += Number(r.fine_amount);
        }
      } else if (r.fine_status === 'WAIVED') {
        waivedCount++;
      } else if (isLate || isEarly) {
        unprocessedCount++;
      }
    });

    return {
      totalStaff,
      notPunchedCount,
      lateCount,
      earlyCount,
      confirmedCount,
      confirmedAmount,
      unprocessedCount,
      waivedCount,
    };
  }, [dailyRecords, shiftSettings]);

  // Export Daily Late Fines to Excel (Per-Day)
  const handleExportDaily = async () => {
    if (!filteredRecords.length) {
      showToast('No fine records found to export for this date.', 'error');
      return;
    }

    try {
      await exportDailyLateFinesExcel(filteredRecords, selectedDate, {
        company_name: 'SCOTO',
        getEmployeeCheckoutTime,
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
          title="Early Exits"
          value={`${stats.earlyCount}`}
          icon={Clock}
          color="purple"
          badge={
            <span className="text-xs font-bold text-purple-600">
              ({stats.totalStaff > 0 ? Math.round((stats.earlyCount / stats.totalStaff) * 100) : 0}%)
            </span>
          }
          changeLabel="Exited before scheduled closing"
        />

        <StatCard
          title="Fines to Confirm"
          value={`${stats.unprocessedCount}`}
          icon={AlertTriangle}
          color="rose"
          changeLabel="Unconfirmed late check-ins & exits"
        />

        <StatCard
          title="Confirmed Fines"
          value={`₹${stats.confirmedAmount.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          changeLabel={`${stats.confirmedCount} staff assessed (${stats.waivedCount} waived)`}
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
            <option value="">All Staff & Statuses</option>
            <option value="UNPROCESSED">Violations to Confirm ({stats.unprocessedCount})</option>
            <option value="LATE">Late Arrivals Only ({stats.lateCount})</option>
            <option value="EARLY_EXIT">Early Exits Only ({stats.earlyCount})</option>
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
            <span>Show Late & Early Exits Only</span>
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
                <th className="px-3 py-3 text-center">Shift Schedule</th>
                <th className="px-4 py-3">Check-IN & Late</th>
                <th className="px-4 py-3">Check-OUT & Early Exit</th>
                <th className="px-3 py-3">Fine Status</th>
                <th className="px-3 py-3">Fine Amount</th>
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
                    <p className="font-semibold text-slate-700">No penalty records matching criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      All employees are on time or filtered out for {selectedDate}.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const checkoutSched = getEmployeeCheckoutTime(rec.employee_code);
                  const isSpecialShift = checkoutSched === '18:45';
                  const earlyInfo = computeEarlyExit(rec.last_out, checkoutSched, rec.early_permission_minutes);
                  const isLate = Boolean(rec.first_in && rec.late_minutes > 0);
                  const isEarly = Boolean(rec.last_out && (rec.early_exit_minutes > 0 || earlyInfo.isEarly));
                  const isUnconfirmed = (isLate || isEarly) && rec.fine_status !== 'CONFIRMED' && rec.fine_status !== 'WAIVED';

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

                      {/* Shift Schedule Toggle */}
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleEmployeeShift(rec.employee_code, e)}
                          title="Click to toggle between 7:30 PM (Standard Regular) and 6:45 PM (Designated Shift)"
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold border cursor-pointer transition-colors ${
                            isSpecialShift
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{isSpecialShift ? '06:45 PM' : '07:30 PM'}</span>
                        </button>
                      </td>

                      {/* Check-IN & Late */}
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {rec.first_in ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold">
                              <Clock className="h-3.5 w-3.5 text-teal-600" />
                              <span>{formatTimeOnly(rec.first_in)}</span>
                            </div>
                            {rec.late_minutes > 0 ? (
                              <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 mt-0.5">
                                {formatMinutesToHM(rec.late_minutes)} late
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">On Time</span>
                            )}
                            {rec.permission_minutes > 0 && (
                              <span className="text-[10px] text-teal-700 block mt-0.5">
                                Late Perm: +{formatMinutesToHM(rec.permission_minutes)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Not Punched
                          </span>
                        )}
                      </td>

                      {/* Check-OUT & Early Exit */}
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {rec.last_out ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold">
                              <Clock className="h-3.5 w-3.5 text-indigo-600" />
                              <span>{formatTimeOnly(rec.last_out)}</span>
                            </div>
                            {(() => {
                              const earlyMins = rec.early_exit_minutes || earlyInfo.earlyMinutes || 0;
                              if (earlyMins > 0) {
                                return (
                                  <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 mt-0.5">
                                    {formatMinutesToHM(earlyMins)} early
                                  </span>
                                );
                              }
                              return <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">On Time</span>;
                            })()}
                            {rec.early_permission_minutes > 0 && (
                              <span className="text-[10px] text-indigo-700 block mt-0.5">
                                Early Perm: -{formatMinutesToHM(rec.early_permission_minutes)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Not Punched
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge
                          status={
                            rec.fine_status === 'CONFIRMED'
                              ? 'CONFIRMED'
                              : rec.fine_status === 'WAIVED'
                                ? 'WAIVED'
                                : !rec.first_in && !rec.last_out
                                  ? 'NONE'
                                  : isLate || isEarly
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

                      <td className="px-3 py-3 font-mono font-semibold text-slate-900">
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
          title="Late Fine & Early Exit Assessment"
          subtitle={`Employee: ${selectedFineRecord.employee_name} (${selectedFineRecord.employee_code}) • Date: ${selectedFineRecord.target_date || selectedDate}`}
          size="lg"
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
            {modalError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            {/* 2-Phase Session Tabs: Morning (Late Arrival) & Evening (Early Exit & Closing Timing) */}
            <div className="space-y-3">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 gap-2 bg-slate-50/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFineModalTab('morning')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    fineModalTab === 'morning'
                      ? 'bg-white text-teal-950 shadow-xs border border-teal-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Sun className={`h-4 w-4 ${fineModalTab === 'morning' ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>Morning Check-In</span>
                  {(() => {
                    if (!selectedFineRecord.first_in) {
                      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">No Punch</span>;
                    }
                    const lateMins = computeLateMinutes(selectedFineRecord.first_in, permissionMinutesInput);
                    if (lateMins > 0) {
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {formatMinutesToHM(lateMins)} late
                        </span>
                      );
                    }
                    return (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">
                        On Time
                      </span>
                    );
                  })()}
                </button>

                <button
                  type="button"
                  onClick={() => setFineModalTab('evening')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    fineModalTab === 'evening'
                      ? 'bg-white text-indigo-950 shadow-xs border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Moon className={`h-4 w-4 ${fineModalTab === 'evening' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>Evening Departure</span>
                  {(() => {
                    if (!selectedFineRecord.last_out) {
                      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">No Punch</span>;
                    }
                    const earlyInfo = computeEarlyExit(selectedFineRecord.last_out, assignedCheckoutInput, earlyPermissionMinutesInput);
                    if (earlyInfo.isEarly && earlyInfo.earlyMinutes > 0) {
                      return (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {formatMinutesToHM(earlyInfo.earlyMinutes)} early
                        </span>
                      );
                    }
                    return (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                        On Time
                      </span>
                    );
                  })()}
                </button>
              </div>

              {/* Tab 1 Content: Morning Check-In & Late Arrival */}
              {fineModalTab === 'morning' && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <span className="font-bold text-teal-950 flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-teal-600" />
                      Morning Check-In & Late Arrival
                    </span>
                    <span className="text-[10px] text-teal-700 font-medium">Shift Start: 09:30 AM</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-2.5 border border-teal-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Actual Check-IN</span>
                      <span className="font-mono font-bold text-slate-800 text-[13px]">
                        {selectedFineRecord.first_in ? formatTimeOnly(selectedFineRecord.first_in) : 'Not Punched'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Effective Late Delay</span>
                      {(() => {
                        if (!selectedFineRecord.first_in) {
                          return <span className="font-mono font-medium text-slate-400">0 mins (No Punch)</span>;
                        }
                        const lateMins = computeLateMinutes(selectedFineRecord.first_in, permissionMinutesInput);
                        if (lateMins === 0) {
                          return <span className="font-mono font-bold text-teal-700">0m (On Time / Permitted)</span>;
                        }
                        return <span className="font-mono font-bold text-rose-700">{formatMinutesToHM(lateMins)} late</span>;
                      })()}
                    </div>
                  </div>

                  {/* Late Permission Offset */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-teal-900 text-[11px]">Late Permission Offset</label>
                      <span className="text-[10px] text-teal-700">From 09:30 (no grace)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="240"
                        step="15"
                        value={permissionMinutesInput}
                        onChange={(e) => handleLatePermissionChange(e.target.value)}
                        placeholder="0"
                        className="w-20 rounded-md border border-teal-300 bg-white px-2 py-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                      />
                      <div className="flex flex-wrap gap-1">
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
                            onClick={() => handleLatePermissionChange(String(chip.mins))}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                              Number(permissionMinutesInput) === chip.mins
                                ? 'bg-teal-600 border-teal-600 text-white'
                                : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-50'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {Number(permissionMinutesInput) > 0 ? (
                      <p className="text-[10px] text-teal-800 font-medium mt-1">
                        Permission: Must check in by{' '}
                        <strong>
                          {(() => {
                            const d = new Date(`2000-01-01T09:30:00`);
                            d.setMinutes(d.getMinutes() + Number(permissionMinutesInput));
                            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          })()}
                        </strong> (09:30 AM + {permissionMinutesInput}m permission, grace does not apply)
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Cutoff: <strong>09:40 AM</strong> (09:30 AM + 10m grace). Late calculated from 09:40 AM.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setFineModalTab('evening')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Check Evening Departure →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2 Content: Evening Departure & Early Exit */}
              {fineModalTab === 'evening' && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Moon className="h-4 w-4 text-indigo-600" />
                      Evening Departure & Early Exit
                    </span>
                    <span className="text-[10px] text-indigo-700 font-medium">Configured Individually</span>
                  </div>

                  {/* Assigned Closing Time Switcher */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-800 text-[11px]">Assigned Office Closing</label>
                      <span className="text-[10px] text-indigo-700">Per-employee schedule</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAssignedCheckoutChange('19:30')}
                        className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${
                          assignedCheckoutInput === '19:30'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        07:30 PM (Regular)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssignedCheckoutChange('18:45')}
                        className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold border cursor-pointer transition-colors ${
                          assignedCheckoutInput === '18:45'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        06:45 PM (Designated)
                      </button>
                      <input
                        type="time"
                        value={assignedCheckoutInput}
                        onChange={(e) => handleAssignedCheckoutChange(e.target.value)}
                        className="w-20 rounded-md border border-indigo-200 bg-white px-1.5 py-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                        title="Custom shift closing time"
                      />
                    </div>
                  </div>

                  {/* Punch Out & Early Exit Display */}
                  <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-2.5 border border-indigo-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Actual Check-OUT</span>
                      <span className="font-mono font-bold text-slate-800 text-[13px]">
                        {selectedFineRecord.last_out ? formatTimeOnly(selectedFineRecord.last_out) : 'Not Punched'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Early Exit Duration</span>
                      {(() => {
                        if (!selectedFineRecord.last_out) {
                          return <span className="font-mono font-medium text-slate-400">0 mins (No Punch)</span>;
                        }
                        const earlyInfo = computeEarlyExit(selectedFineRecord.last_out, assignedCheckoutInput, earlyPermissionMinutesInput);
                        if (!earlyInfo.isEarly || earlyInfo.earlyMinutes === 0) {
                          return <span className="font-mono font-bold text-emerald-700">0m (On Time / Permitted)</span>;
                        }
                        return (
                          <span className="font-mono font-bold text-rose-700">
                            {formatMinutesToHM(earlyInfo.earlyMinutes)} early
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Early Permission Offset */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-indigo-950 text-[11px]">Early Exit Permission</label>
                      <span className="text-[10px] text-indigo-700">Allowed departure adjustment</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="240"
                        step="15"
                        value={earlyPermissionMinutesInput}
                        onChange={(e) => handleEarlyPermissionChange(e.target.value)}
                        placeholder="0"
                        className="w-20 rounded-md border border-indigo-300 bg-white px-2 py-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: 'None', mins: 0 },
                          { label: '+15m', mins: 15 },
                          { label: '+30m', mins: 30 },
                          { label: '+45m', mins: 45 },
                          { label: '+1h', mins: 60 },
                          { label: '+2h', mins: 120 },
                        ].map((chip) => (
                          <button
                            key={chip.mins}
                            type="button"
                            onClick={() => handleEarlyPermissionChange(String(chip.mins))}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                              Number(earlyPermissionMinutesInput) === chip.mins
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-indigo-200 text-indigo-800 hover:bg-indigo-50'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-900 font-medium mt-1">
                      {Number(earlyPermissionMinutesInput) > 0 ? (
                        <span>
                          Allowed exit from <strong>{computeEarlyExit(selectedFineRecord.last_out || new Date(), assignedCheckoutInput, earlyPermissionMinutesInput).allowedExitStr}</strong> (06:30 PM office closing minus {earlyPermissionMinutesInput}m permission)
                        </span>
                      ) : (
                        <span>Assigned closing time: <strong>{assignedCheckoutInput === '18:45' ? '06:45 PM (Designated Shift)' : '07:30 PM (Standard)'}</strong> (No early permission)</span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-start pt-1">
                    <button
                      type="button"
                      onClick={() => setFineModalTab('morning')}
                      className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>← Check Morning Check-In</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Assessment Summary & Fine Action */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">3. Assessment Outcome & Penalty Action</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const late = selectedFineRecord.first_in ? computeLateMinutes(selectedFineRecord.first_in, permissionMinutesInput) : 0;
                    const early = selectedFineRecord.last_out ? computeEarlyExit(selectedFineRecord.last_out, assignedCheckoutInput, earlyPermissionMinutesInput).earlyMinutes : 0;
                    return (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${late > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          Late: {late > 0 ? formatMinutesToHM(late) : '0m'}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${early > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          Early: {early > 0 ? formatMinutesToHM(early) : '0m'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fine Assessment Decision *</label>
                  <select
                    value={fineStatusInput}
                    onChange={(e) => setFineStatusInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CONFIRMED">CONFIRMED (Apply Fine Penalty)</option>
                    <option value="WAIVED">WAIVED (Excuse Penalty / Permitted - ₹0)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fine Amount (INR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    disabled={fineStatusInput === 'WAIVED'}
                    value={fineStatusInput === 'WAIVED' ? '0' : fineAmountInput}
                    onChange={(e) => setFineAmountInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reason / Remarks</label>
                  <input
                    type="text"
                    value={fineReasonInput}
                    onChange={(e) => setFineReasonInput(e.target.value)}
                    placeholder="e.g. Approved evening permission / Traffic delay / Assigned early closing..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Entered / Authorized By *</label>
                  <input
                    type="text"
                    required
                    value={enteredByInput}
                    onChange={(e) => setEnteredByInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ManualLateFinePage;

