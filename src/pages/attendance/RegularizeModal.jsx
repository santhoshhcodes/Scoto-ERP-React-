import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  UserCheck,
  Briefcase,
  AlertTriangle,
  Building2,
  MapPin,
} from 'lucide-react';

// Helper to parse time strings or dates safely to HH:mm
const formatToHHMM = (val) => {
  if (!val || val === '--:--') return '';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    if (typeof val === 'string' && val.includes(':')) {
      const parts = val.trim().split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].slice(0, 2)}`;
      }
    }
  } catch {}
  return '';
};

export const RegularizeModal = ({
  isOpen,
  onClose,
  timesheet,
  onRegularize,
  isLoading = false,
  apiError = null,
  defaultCheckoutTime = '19:30', // '19:30' or '18:45'
}) => {
  const [reviewStatus, setReviewStatus] = useState('PRESENT_CONFIRMED');
  const [halfDaySlot, setHalfDaySlot] = useState('HALF_DAY_FIRST'); // 'HALF_DAY_FIRST' (9:30-1:30) | 'HALF_DAY_SECOND' (1:30-7:30)

  const [halfDayLeaveType, setHalfDayLeaveType] = useState('CL'); // 'CL' (Casual Leave) | 'LOP' (Loss of Pay)
  const [onDutyType, setOnDutyType] = useState('single'); // 'single' | 'range'
  const [onDutyStartDate, setOnDutyStartDate] = useState('');
  const [onDutyEndDate, setOnDutyEndDate] = useState('');

  // On-Site staff settings inside adjustment
  const [setOnSiteMaster, setSetOnSiteMaster] = useState(true);
  const [removeOnSiteMaster, setRemoveOnSiteMaster] = useState(false);

  const [correctedInTime, setCorrectedInTime] = useState('');
  const [correctedOutTime, setCorrectedOutTime] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewedBy, setReviewedBy] = useState('');
  const [formError, setFormError] = useState('');

  // Late arrival permission settings
  const [applyPermission, setApplyPermission] = useState(false);
  const [permissionMinutes, setPermissionMinutes] = useState('30');

  // Early departure permission settings
  const [applyEarlyPermission, setApplyEarlyPermission] = useState(false);
  const [earlyPermissionMinutes, setEarlyPermissionMinutes] = useState('30');

  // Partial On-Duty / Client Visit Hours
  const [applyClientVisit, setApplyClientVisit] = useState(false);
  const [clientVisitHours, setClientVisitHours] = useState('2.0');
  const [clientVisitLocation, setClientVisitLocation] = useState('');

  // Extract logged in user safely
  useEffect(() => {
    try {
      const authUser = JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
      setReviewedBy(authUser.name || authUser.username || authUser.user_id || 'Authorized Reviewer');
    } catch {
      setReviewedBy('Authorized Reviewer');
    }
  }, [isOpen]);

  useEffect(() => {
    if (timesheet) {
      const currentStatus = timesheet.review_status || timesheet.status;
      const targetDate = timesheet.target_date || timesheet.date || '';

      setOnDutyStartDate(targetDate);
      setOnDutyEndDate(targetDate);

      const isCurrentOnSite =
        timesheet.is_on_site ||
        timesheet.is_on_field ||
        currentStatus === 'ON_SITE' ||
        currentStatus === 'ON_FIELD';

      // Check if arrival was after 13:30 (1:30 PM)
      let isLateAfterOneThirty = false;
      const firstInStr = timesheet.first_in || timesheet.firstIn;
      if (firstInStr && firstInStr !== '--:--') {
        try {
          const d = new Date(firstInStr);
          if (!isNaN(d.getTime())) {
            const hours = d.getHours();
            const minutes = d.getMinutes();
            if (hours > 13 || (hours === 13 && minutes >= 30)) {
              isLateAfterOneThirty = true;
            }
          }
        } catch {}
      }

      if (isCurrentOnSite) {
        setReviewStatus('ON_SITE');
        setSetOnSiteMaster(true);
        setRemoveOnSiteMaster(false);
      } else if (currentStatus === 'ON_DUTY') {
        setReviewStatus('ON_DUTY');
        setOnDutyType('single');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else if (
        currentStatus === 'HALF_DAY' ||
        currentStatus === 'HALF_DAY_FIRST' ||
        currentStatus === 'HALF_DAY_SECOND' ||
        isLateAfterOneThirty
      ) {
        setReviewStatus('HALF_DAY');
        setHalfDaySlot(
          currentStatus === 'HALF_DAY_FIRST'
            ? 'HALF_DAY_FIRST'
            : isLateAfterOneThirty || currentStatus === 'HALF_DAY_SECOND'
              ? 'HALF_DAY_SECOND'
              : 'HALF_DAY_FIRST'
        );
        setHalfDayLeaveType(
          timesheet.leave_type === 'LOP' || currentStatus === 'LOP' ? 'LOP' : 'CL'
        );
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else if (currentStatus === 'COMP_OFF') {
        setReviewStatus('COMP_OFF');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else if (currentStatus === 'ON_LEAVE' || currentStatus === 'CL') {
        setReviewStatus('ON_LEAVE');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else if (currentStatus === 'LOP') {
        setReviewStatus('LOP');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else if (currentStatus === 'ABSENT_CONFIRMED' || currentStatus === 'Absent' || currentStatus === 'ABSENT') {
        setReviewStatus('ABSENT_CONFIRMED');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else {
        setReviewStatus('PRESENT_CONFIRMED');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      }

      const rawReason = timesheet.review_reason || '';
      if (
        rawReason.toLowerCase().includes('regularized') ||
        rawReason.toLowerCase().includes('confirmed directly')
      ) {
        setReviewReason('');
      } else {
        setReviewReason(rawReason);
      }

      // Pre-fill late permission if existing
      if (timesheet.permission_minutes > 0) {
        setApplyPermission(true);
        setPermissionMinutes(String(timesheet.permission_minutes));
      } else {
        setApplyPermission(false);
        setPermissionMinutes('30');
      }

      // Pre-fill early exit permission if existing
      if (timesheet.early_permission_minutes > 0) {
        setApplyEarlyPermission(true);
        setEarlyPermissionMinutes(String(timesheet.early_permission_minutes));
      } else {
        setApplyEarlyPermission(false);
        setEarlyPermissionMinutes('30');
      }

      // Parse actual device check-in and check-out punches
      const deviceIn = formatToHHMM(timesheet.first_in || timesheet.firstIn);
      const deviceOut = formatToHHMM(timesheet.last_out || timesheet.lastOut);

      if (deviceIn) {
        setCorrectedInTime(deviceIn);
      } else {
        setCorrectedInTime('09:30');
      }

      if (deviceOut) {
        setCorrectedOutTime(deviceOut);
      } else if (currentStatus === 'HALF_DAY') {
        // For Half Day without checkout punch, don't force full shift end
        setCorrectedOutTime('');
      } else {
        setCorrectedOutTime(defaultCheckoutTime);
      }

      setFormError('');
    }
  }, [timesheet, defaultCheckoutTime]);

  // Note: Check-in and check-out punch times are kept intact for Half Day as per actual attendance records.
  // Reviewer can manually adjust the editable times without automated overwriting on slot change.

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!timesheet) return;
    setFormError('');

    const targetDate = timesheet.target_date || timesheet.date;
    if (!targetDate) {
      setFormError('Attendance date is missing.');
      return;
    }

    if (!reviewedBy.trim()) {
      setFormError('Reviewer name / ID is required.');
      return;
    }

    // Handle Multi-Day On Duty Range
    if (reviewStatus === 'ON_DUTY' && onDutyType === 'range') {
      if (!onDutyStartDate || !onDutyEndDate) {
        setFormError('Please select both Start Date and End Date for multi-day On Duty.');
        return;
      }
      if (onDutyEndDate < onDutyStartDate) {
        setFormError('On Duty End Date cannot be earlier than Start Date.');
        return;
      }

      onRegularize({
        is_multi_day_on_duty: true,
        employee_code: timesheet.employee_code || timesheet.code,
        start_date: onDutyStartDate,
        end_date: onDutyEndDate,
        leave_type: 'ON_DUTY',
        reason: reviewReason.trim() || 'On Duty (Multi-Day Field Assignment)',
        created_by: reviewedBy.trim(),
        apply_permission: applyPermission,
        permission_minutes: applyPermission ? Number(permissionMinutes) : 0,
      });
      return;
    }

    // Build ISO timestamps if times were entered
    let correctedCheckIn = null;
    let correctedCheckOut = null;
    let finalCategory = undefined;

    if (reviewStatus === 'PRESENT_CONFIRMED') {
      finalCategory = 'FULL_DAY';
      if (correctedInTime) correctedCheckIn = `${targetDate}T${correctedInTime}:00`;
      if (correctedOutTime) correctedCheckOut = `${targetDate}T${correctedOutTime}:00`;
    } else if (reviewStatus === 'HALF_DAY') {
      finalCategory = halfDaySlot;
      if (correctedInTime) correctedCheckIn = `${targetDate}T${correctedInTime}:00`;
      if (correctedOutTime) correctedCheckOut = `${targetDate}T${correctedOutTime}:00`;
    } else if (reviewStatus === 'ON_DUTY') {
      finalCategory = 'ON_DUTY_SINGLE';
      if (correctedInTime) correctedCheckIn = `${targetDate}T${correctedInTime}:00`;
      if (correctedOutTime) correctedCheckOut = `${targetDate}T${correctedOutTime}:00`;
    } else if (reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD') {
      finalCategory = 'ON_SITE';
      if (correctedInTime) correctedCheckIn = `${targetDate}T${correctedInTime}:00`;
      if (correctedOutTime) correctedCheckOut = `${targetDate}T${correctedOutTime}:00`;
    } else if (reviewStatus === 'COMP_OFF') {
      finalCategory = 'COMPENSATION';
    } else if (reviewStatus === 'ON_LEAVE') {
      finalCategory = 'CASUAL_LEAVE';
    } else if (reviewStatus === 'LOP') {
      finalCategory = 'LOSS_OF_PAY';
    } else if (reviewStatus === 'ABSENT_CONFIRMED') {
      finalCategory = 'ABSENT';
    }

    // Validation: Check-out must not precede check-in
    if (correctedCheckIn && correctedCheckOut && correctedCheckOut < correctedCheckIn) {
      setFormError('Check-Out time cannot precede Check-In time.');
      return;
    }

    const isOnSiteSelected = reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD';

    // Construct augmented reason if client visit was added
    let composedReason = reviewReason.trim();
    let onDutyMinutesTotal = 0;
    if (applyClientVisit) {
      const visitHoursNum = parseFloat(clientVisitHours) || 0;
      onDutyMinutesTotal = Math.round(visitHoursNum * 60);
      const visitNote = `Partial Client Visit: ${clientVisitHours}h${clientVisitLocation.trim() ? ` at ${clientVisitLocation.trim()}` : ''}`;
      composedReason = composedReason ? `${composedReason} | ${visitNote}` : visitNote;
    }

    onRegularize({
      employee_code: timesheet.employee_code || timesheet.code,
      attendance_date: targetDate,
      review_status: reviewStatus === 'ON_FIELD' ? 'ON_SITE' : reviewStatus,
      review_category: finalCategory,
      leave_type:
        reviewStatus === 'HALF_DAY'
          ? halfDayLeaveType
          : reviewStatus === 'ON_LEAVE'
            ? 'CL'
            : reviewStatus === 'LOP'
              ? 'LOP'
              : undefined,
      leave_session:
        reviewStatus === 'HALF_DAY'
          ? halfDaySlot === 'HALF_DAY_FIRST'
            ? '1ST_HALF'
            : '2ND_HALF'
          : undefined,
      review_reason: composedReason || (isOnSiteSelected ? 'On-Site Staff' : undefined),
      corrected_check_in: correctedCheckIn,
      corrected_check_out: correctedCheckOut,
      reviewed_by: reviewedBy.trim(),
      apply_permission: applyPermission,
      permission_minutes: applyPermission ? Number(permissionMinutes) : 0,
      early_permission_minutes: applyEarlyPermission ? Number(earlyPermissionMinutes) : 0,
      on_duty_minutes: onDutyMinutesTotal,
      set_on_site_master: setOnSiteMaster,
      remove_on_site_master: removeOnSiteMaster,
      set_on_field_master: setOnSiteMaster,
      remove_on_field_master: removeOnSiteMaster,
      is_on_site_action: isOnSiteSelected,
      is_on_field_action: isOnSiteSelected,
    });
  };

  if (!timesheet) return null;

  const isMissingOutPunch =
    timesheet.first_in && (!timesheet.last_out || timesheet.last_out === timesheet.first_in);

  // Check if arrival was past 13:30 (1:30 PM)
  let isLateAfterOneThirty = false;
  const firstInStr = timesheet.first_in || timesheet.firstIn;
  if (firstInStr && firstInStr !== '--:--') {
    try {
      const d = new Date(firstInStr);
      if (!isNaN(d.getTime())) {
        const hours = d.getHours();
        const minutes = d.getMinutes();
        if (hours > 13 || (hours === 13 && minutes >= 30)) {
          isLateAfterOneThirty = true;
        }
      }
    } catch {}
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Adjustment & Leave Regularization"
      subtitle={`Employee: ${timesheet.employee_name || timesheet.name} (${timesheet.employee_code || timesheet.code}) • Date: ${timesheet.target_date || timesheet.date}`}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isLoading ? 'Saving Attendance...' : 'Confirm & Save Attendance'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Error Banners */}
        {(formError || apiError) && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>Validation Error</span>
            </div>
            <p className="mt-1 text-xs text-rose-700">{formError || apiError}</p>
          </div>
        )}

        {/* Missing Out-Punch Alert & Auto Pre-fill Notice */}
        {isMissingOutPunch && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-xs">Single Punch / Missing Check-Out Detected</div>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Pre-filled with scheduled shift end: <strong className="font-mono text-amber-950">{defaultCheckoutTime === '18:45' ? '06:45 PM (Special Shift)' : '07:30 PM (Standard)'}</strong>.
                Adjust the Check-OUT time below if the employee left at a different time.
              </div>
            </div>
          </div>
        )}

        {/* Late Punch After 01:30 PM Notice */}
        {isLateAfterOneThirty && (
          <div className="rounded-lg border border-purple-300 bg-purple-50 p-2.5 text-purple-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600 shrink-0" />
            <span className="text-[11px]">
              Late arrival after <strong>01:30 PM</strong> detected. Recommended category: <strong className="text-purple-950">Half Day (Second Half)</strong>.
            </span>
          </div>
        )}

        {/* Attendance Status Selection */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Attendance Status Action *
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { id: 'PRESENT_CONFIRMED', label: 'Present (Full Day)', desc: `9:30 AM – ${defaultCheckoutTime === '18:45' ? '6:45 PM' : '7:30 PM'} shift` },
              { id: 'HALF_DAY', label: 'Half Day', desc: '1st or 2nd Half Shift' },
              { id: 'ON_DUTY', label: 'On Duty (OD)', desc: 'Single / Multi-Day Assignment' },
              { id: 'ON_SITE', label: 'On-Site Staff', desc: 'Continuous / Auto-Present' },
              { id: 'ON_LEAVE', label: 'Casual Leave (CL)', desc: 'Approved Paid CL' },
              { id: 'COMP_OFF', label: 'Comp Off', desc: 'Compensation Leave' },
              { id: 'LOP', label: 'Loss of Pay (LOP)', desc: 'Unpaid / Deduct Salary' },
              { id: 'ABSENT_CONFIRMED', label: 'Absent (Unexcused)', desc: 'Mark Absent / No Pay' },
            ].map((opt) => {
              const isSelected = reviewStatus === opt.id || (opt.id === 'ON_SITE' && reviewStatus === 'ON_FIELD');
              const isOnSiteOption = opt.id === 'ON_SITE';
              const isAbsentOption = opt.id === 'ABSENT_CONFIRMED';

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setReviewStatus(opt.id);
                    if (opt.id === 'ON_SITE') {
                      setSetOnSiteMaster(true);
                    }
                  }}
                  className={`flex flex-col items-start rounded-lg border p-2.5 text-left cursor-pointer transition-all ${
                    isSelected
                      ? isOnSiteOption
                        ? 'border-sky-600 bg-sky-50/80 ring-1 ring-sky-600'
                        : isAbsentOption
                          ? 'border-rose-600 bg-rose-50/80 ring-1 ring-rose-600'
                          : 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`font-semibold text-xs ${
                      isSelected
                        ? isOnSiteOption
                          ? 'text-sky-900'
                          : isAbsentOption
                            ? 'text-rose-900'
                            : 'text-indigo-900'
                        : 'text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing On-Site Master status reminder when another status is selected */}
        {(timesheet.is_on_site || timesheet.is_on_field) &&
          reviewStatus !== 'ON_SITE' &&
          reviewStatus !== 'ON_FIELD' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-amber-900">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  This employee has persistent <strong>On-Site Staff</strong> active in Master profile.
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-amber-800 text-[11px] shrink-0">
                <input
                  type="checkbox"
                  checked={removeOnSiteMaster}
                  onChange={(e) => setRemoveOnSiteMaster(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Remove On-Site status from Master</span>
              </label>
            </div>
          )}

        {/* On-Site Staff Mode Info & Settings */}
        {(reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD') && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sky-950 text-xs flex items-center gap-1.5">
                  <span>Continuous On-Site Staff Mode</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-200/80 text-sky-800">
                    Auto-Present
                  </span>
                </div>
                <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                  Employee will be automatically marked as <strong className="text-sky-900">Present (On-Site)</strong> for daily attendance without requiring terminal punches until modified.
                  <strong className="block mt-1 text-sky-950">
                    Note: If they visit office and punch at the biometric device, the system automatically detects it, records exact punch times, and transitions them to in-office status.
                  </strong>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-sky-200/80 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sky-900">
                <input
                  type="checkbox"
                      checked={setOnSiteMaster}
                  onChange={(e) => setSetOnSiteMaster(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Set persistent On-Site flag in Employee Master Profile (dbo.Employee_Mst)</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-sky-200 text-sky-700">
                {timesheet.is_on_site || timesheet.is_on_field ? 'Active in Profile' : 'Will Activate'}
              </span>
            </div>
          </div>
        )}

        {/* Half Day Slot & Leave Deduction Selector */}
        {reviewStatus === 'HALF_DAY' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
            <div>
              <span className="font-semibold text-amber-900 block text-xs mb-1.5">
                Select Half Day Session *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                    halfDaySlot === 'HALF_DAY_FIRST'
                      ? 'border-amber-500 bg-white shadow-xs font-semibold text-amber-900'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="halfDaySlot"
                    checked={halfDaySlot === 'HALF_DAY_FIRST'}
                    onChange={() => setHalfDaySlot('HALF_DAY_FIRST')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold">First Half (Morning)</div>
                    <div className="text-[10px] text-slate-500">Morning Shift Session</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                    halfDaySlot === 'HALF_DAY_SECOND'
                      ? 'border-amber-500 bg-white shadow-xs font-semibold text-amber-900'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="halfDaySlot"
                    checked={halfDaySlot === 'HALF_DAY_SECOND'}
                    onChange={() => setHalfDaySlot('HALF_DAY_SECOND')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold">Second Half (Afternoon)</div>
                    <div className="text-[10px] text-slate-500">Afternoon Shift Session</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <span className="font-semibold text-amber-900 block text-xs mb-1.5">
                Half Day Leave Deduction Type *
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                    halfDayLeaveType === 'CL'
                      ? 'border-amber-500 bg-white shadow-xs font-semibold text-amber-900'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="halfDayLeaveType"
                    checked={halfDayLeaveType === 'CL'}
                    onChange={() => setHalfDayLeaveType('CL')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold">Casual Leave (CL)</div>
                    <div className="text-[10px] text-slate-500">Deduct 0.5 Day Paid Leave</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all ${
                    halfDayLeaveType === 'LOP'
                      ? 'border-amber-500 bg-white shadow-xs font-semibold text-amber-900'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="halfDayLeaveType"
                    checked={halfDayLeaveType === 'LOP'}
                    onChange={() => setHalfDayLeaveType('LOP')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold">Loss of Pay (LOP)</div>
                    <div className="text-[10px] text-slate-500">Deduct 0.5 Day Salary</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* On Duty Mode: Single Day vs Date Range */}
        {reviewStatus === 'ON_DUTY' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 block text-xs">
                On Duty Assignment Scope
              </span>
              <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setOnDutyType('single')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onDutyType === 'single'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setOnDutyType('range')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onDutyType === 'range'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Range (Multi-Day)
                </button>
              </div>
            </div>

            {onDutyType === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={onDutyStartDate}
                    onChange={(e) => setOnDutyStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    To Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={onDutyEndDate}
                    onChange={(e) => setOnDutyEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2 text-[10px] text-blue-700 bg-blue-100/60 rounded px-2 py-1">
                  Employee will be marked <strong>Present (On Duty)</strong> for each day in this date range without needing terminal punches.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timestamps */}
        {(reviewStatus === 'PRESENT_CONFIRMED' ||
          reviewStatus === 'HALF_DAY' ||
          reviewStatus === 'ON_SITE' ||
          reviewStatus === 'ON_FIELD' ||
          (reviewStatus === 'ON_DUTY' && onDutyType === 'single')) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Check-IN Time {reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD' ? '(Optional)' : '*'}
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  required={reviewStatus !== 'ON_SITE' && reviewStatus !== 'ON_FIELD'}
                  value={correctedInTime}
                  onChange={(e) => setCorrectedInTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 font-mono font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Check-OUT Time {reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD' ? '(Optional)' : '*'}
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  required={reviewStatus !== 'ON_SITE' && reviewStatus !== 'ON_FIELD'}
                  value={correctedOutTime}
                  onChange={(e) => setCorrectedOutTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 font-mono font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Scheduled Checkout for this employee: <strong className="text-slate-800">{defaultCheckoutTime === '18:45' ? '06:45 PM (Special Shift)' : '07:30 PM (Standard)'}</strong></span>
              <button
                type="button"
                onClick={() => setCorrectedOutTime(defaultCheckoutTime)}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
              >
                Reset to {defaultCheckoutTime}
              </button>
            </div>
          </div>
        )}

        {/* 1. Late Arrival Permission (Excuse Morning Late Punch) */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-purple-900 text-xs">
            <input
              type="checkbox"
              checked={applyPermission}
              onChange={(e) => setApplyPermission(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Grant Late Arrival Permission (Waive Morning Delay Fine)</span>
          </label>

          {applyPermission && (
            <div className="mt-2.5 flex items-center gap-3">
              <label className="text-[11px] font-medium text-purple-800">
                Permission Duration:
              </label>
              <select
                value={permissionMinutes}
                onChange={(e) => setPermissionMinutes(e.target.value)}
                className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-semibold text-purple-900 focus:border-purple-500 focus:outline-none"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes (1 Hour)</option>
                <option value="90">90 Minutes (1.5 Hours)</option>
                <option value="120">120 Minutes (2 Hours)</option>
              </select>
              <span className="text-[10px] text-purple-700">
                Grace extended to {permissionMinutes === '30' ? '10:00 AM' : permissionMinutes === '60' ? '10:30 AM' : `+${permissionMinutes}m`}.
              </span>
            </div>
          )}
        </div>

        {/* 2. Early Departure Permission (Relieve Before Scheduled End Time) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-900 text-xs">
            <input
              type="checkbox"
              checked={applyEarlyPermission}
              onChange={(e) => setApplyEarlyPermission(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span>Grant Early Exit / Departure Permission (Relieve Before Shift End)</span>
          </label>

          {applyEarlyPermission && (
            <div className="mt-2.5 flex items-center gap-3">
              <label className="text-[11px] font-medium text-amber-800">
                Early Permission Duration:
              </label>
              <select
                value={earlyPermissionMinutes}
                onChange={(e) => setEarlyPermissionMinutes(e.target.value)}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="15">15 Minutes Early</option>
                <option value="30">30 Minutes Early</option>
                <option value="45">45 Minutes Early</option>
                <option value="60">60 Minutes Early (1 Hour)</option>
                <option value="90">90 Minutes Early (1.5 Hours)</option>
                <option value="120">120 Minutes Early (2 Hours)</option>
              </select>
              <span className="text-[10px] text-amber-700">
                Permits early exit from scheduled {defaultCheckoutTime === '18:45' ? '06:45 PM' : '07:30 PM'} shift without penalty.
              </span>
            </div>
          )}
        </div>

        {/* 3. Partial On-Duty / Client Visit Hours */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-teal-900 text-xs">
            <input
              type="checkbox"
              checked={applyClientVisit}
              onChange={(e) => setApplyClientVisit(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Include Partial Client Visit / On-Duty Hours</span>
          </label>

          {applyClientVisit && (
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-teal-800 mb-1">
                  Client Visit Duration (Hours)
                </label>
                <select
                  value={clientVisitHours}
                  onChange={(e) => setClientVisitHours(e.target.value)}
                  className="w-full rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-900 focus:border-teal-500 focus:outline-none"
                >
                  <option value="1.0">1.0 Hour</option>
                  <option value="1.5">1.5 Hours</option>
                  <option value="2.0">2.0 Hours</option>
                  <option value="2.5">2.5 Hours</option>
                  <option value="3.0">3.0 Hours</option>
                  <option value="4.0">4.0 Hours</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-teal-800 mb-1">
                  Client / Site Location Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Site Inspection / Vendor Meet"
                  value={clientVisitLocation}
                  onChange={(e) => setClientVisitLocation(e.target.value)}
                  className="w-full rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Reason / Remarks */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Reason / Justification Notes
          </label>
          <textarea
            rows={2}
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            placeholder="e.g. Approved First Half / Client site field visit / Official permission..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Operator Confirmation */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Confirmed By (Operator) *
          </label>
          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder="e.g. HR Admin / Shift Supervisor"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default RegularizeModal;
