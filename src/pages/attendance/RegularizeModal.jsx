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
  Search,
  X,
  Home,
  PlusCircle,
} from 'lucide-react';
import { useCustomerClients } from '../../api/customerReportApi';

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
  const [onDutySchedule, setOnDutySchedule] = useState('split'); // 'split' (Morning Office + Afternoon Visit) | 'full' (Full Day OD) | 'range'
  const [onDutyDepartureTime, setOnDutyDepartureTime] = useState('13:30');
  const [onDutyStartDate, setOnDutyStartDate] = useState('');
  const [onDutyEndDate, setOnDutyEndDate] = useState('');
  const [clientSource, setClientSource] = useState('new'); // 'new' (No ledger needed) | 'ledger'
  const [customClientName, setCustomClientName] = useState('');
  const [clientVisitNote, setClientVisitNote] = useState('');

  // WFH (Work From Home) multi-day support
  const [wfhType, setWfhType] = useState('single'); // 'single' | 'range'
  const [wfhStartDate, setWfhStartDate] = useState('');
  const [wfhEndDate, setWfhEndDate] = useState('');

  // On-Site staff settings inside adjustment
  const [onSiteType, setOnSiteType] = useState('single'); // 'single' | 'range'
  const [onSiteStartDate, setOnSiteStartDate] = useState('');
  const [onSiteEndDate, setOnSiteEndDate] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [placeOfVisit, setPlaceOfVisit] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [setOnSiteMaster, setSetOnSiteMaster] = useState(false);
  const [removeOnSiteMaster, setRemoveOnSiteMaster] = useState(false);

  // Customer clients query from Acc_Mst_Ledger
  const { data: clientsData } = useCustomerClients(clientSearchTerm);
  const clientOptions = Array.isArray(clientsData) ? clientsData : (clientsData?.data || []);

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
      setOnSiteStartDate(targetDate);
      setOnSiteEndDate(targetDate);
      setOnSiteType('single');
      setWfhStartDate(targetDate);
      setWfhEndDate(targetDate);
      setWfhType('single');
      setPlaceOfVisit(timesheet.place_of_visit || '');
      if (timesheet.client_name) {
        setClientSearchTerm(timesheet.client_name);
        setCustomClientName(timesheet.client_name);
        setSelectedClient({
          LedgerName: timesheet.client_name,
          LedgerCode: timesheet.client_code || '',
          City: timesheet.place_of_visit || '',
        });
        if (timesheet.client_code && timesheet.client_code !== 'NEW_CLIENT') {
          setClientSource('ledger');
        } else {
          setClientSource('new');
        }
      } else {
        setSelectedClient(null);
        setClientSearchTerm('');
        setCustomClientName('');
        setClientSource('new');
      }

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
      } else if (currentStatus === 'WFH' || currentStatus === 'WORK_FROM_HOME' || timesheet.review_status === 'WFH') {
        setReviewStatus('WFH');
        setSetOnSiteMaster(false);
        setRemoveOnSiteMaster(false);
      } else if (currentStatus === 'ON_DUTY') {
        setReviewStatus('ON_DUTY');
        setOnDutySchedule(firstInStr && firstInStr !== '--:--' ? 'split' : 'full');
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
        setOnDutyDepartureTime(deviceOut);
      } else {
        setOnDutyDepartureTime('13:30');
        if (currentStatus === 'HALF_DAY') {
          // For Half Day without checkout punch, don't force full shift end
          setCorrectedOutTime('');
        } else {
          setCorrectedOutTime(defaultCheckoutTime);
        }
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

    // Resolve client details
    const resolvedClientName =
      reviewStatus === 'ON_DUTY' && clientSource === 'new'
        ? customClientName.trim()
        : (selectedClient?.LedgerName || clientSearchTerm.trim() || customClientName.trim());

    const resolvedClientCode =
      reviewStatus === 'ON_DUTY' && clientSource === 'new'
        ? 'NEW_CLIENT'
        : (selectedClient?.LedgerCode || (reviewStatus === 'ON_DUTY' ? 'ON_DUTY' : undefined));

    const resolvedPlaceOfVisit = placeOfVisit.trim() || selectedClient?.City || '';

    // Validate Mandatory Client Name and Place of Visit for BOTH On-Site and On-Duty
    if (reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD') {
      if (!resolvedClientName) {
        setFormError('Client Name is mandatory for On-Site deployment.');
        return;
      }
      if (!resolvedPlaceOfVisit) {
        setFormError('Place of Visit / Site Location is mandatory for On-Site deployment.');
        return;
      }
    }

    if (reviewStatus === 'ON_DUTY') {
      if (!resolvedClientName) {
        setFormError('Client Name is mandatory for On Duty. Enter a client name or select from ledger.');
        return;
      }
      if (!resolvedPlaceOfVisit) {
        setFormError('Place of Visit / Site Location is mandatory for On Duty.');
        return;
      }
    }

    // Validate Multi-Day On-Site Deployment Range
    if ((reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD') && onSiteType === 'range') {
      if (!onSiteStartDate || !onSiteEndDate) {
        setFormError('Please select both Start Date and End Date for multi-day On-Site deployment.');
        return;
      }
      if (onSiteEndDate < onSiteStartDate) {
        setFormError('On-Site End Date cannot be earlier than Start Date.');
        return;
      }
    }

    // Validate Multi-Day WFH Range
    if (reviewStatus === 'WFH' && wfhType === 'range') {
      if (!wfhStartDate || !wfhEndDate) {
        setFormError('Please select both Start Date and End Date for multi-day WFH.');
        return;
      }
      if (wfhEndDate < wfhStartDate) {
        setFormError('WFH End Date cannot be earlier than Start Date.');
        return;
      }
    }

    // Handle Multi-Day On Duty Range
    if (reviewStatus === 'ON_DUTY' && onDutySchedule === 'range') {
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
        client_name: resolvedClientName,
        client_code: resolvedClientCode,
        place_of_visit: resolvedPlaceOfVisit,
        reason: reviewReason.trim() || (clientVisitNote.trim() ? `On Duty: ${resolvedClientName} (${resolvedPlaceOfVisit}) - ${clientVisitNote.trim()}` : `On Duty: ${resolvedClientName} (${resolvedPlaceOfVisit})`),
        created_by: reviewedBy.trim(),
        apply_permission: false,
        permission_minutes: 0,
        early_permission_minutes: 0,
      });
      return;
    }

    // Build ISO timestamps and categories
    let correctedCheckIn = null;
    let correctedCheckOut = null;
    let finalCategory = undefined;
    let finalOnDutyMinutes = 0;
    let finalEarlyPermMinutes = 0;

    if (reviewStatus === 'PRESENT_CONFIRMED') {
      finalCategory = 'FULL_DAY';
      if (correctedInTime) correctedCheckIn = `${targetDate}T${correctedInTime}:00`;
      if (correctedOutTime) correctedCheckOut = `${targetDate}T${correctedOutTime}:00`;
      finalEarlyPermMinutes = applyEarlyPermission ? Number(earlyPermissionMinutes) : 0;
    } else if (reviewStatus === 'WFH') {
      finalCategory = 'WORK_FROM_HOME';
      correctedCheckIn = `${targetDate}T09:30:00`;
      correctedCheckOut = `${targetDate}T${defaultCheckoutTime}:00`;
      finalEarlyPermMinutes = 0;
    } else if (reviewStatus === 'HALF_DAY') {
      finalCategory = halfDaySlot;
      if (correctedInTime) correctedCheckIn = `${targetDate}T${correctedInTime}:00`;
      if (correctedOutTime) correctedCheckOut = `${targetDate}T${correctedOutTime}:00`;
      finalEarlyPermMinutes = applyEarlyPermission ? Number(earlyPermissionMinutes) : 0;
    } else if (reviewStatus === 'ON_DUTY') {
      if (onDutySchedule === 'split') {
        finalCategory = 'ON_DUTY_SPLIT';
        const inT = correctedInTime || '09:30';
        correctedCheckIn = `${targetDate}T${inT}:00`;
        // Log scheduled shift end so full day hours are recognized
        correctedCheckOut = `${targetDate}T${defaultCheckoutTime}:00`;

        // Calculate afternoon duration: departure to shift end
        try {
          const [depH, depM] = (onDutyDepartureTime || '13:30').split(':').map(Number);
          const [endH, endM] = defaultCheckoutTime.split(':').map(Number);
          const diffMins = (endH * 60 + endM) - (depH * 60 + depM);
          finalOnDutyMinutes = Math.max(0, diffMins);
          finalEarlyPermMinutes = Math.max(0, diffMins);
        } catch {
          finalOnDutyMinutes = 360;
          finalEarlyPermMinutes = 360;
        }
      } else {
        finalCategory = 'ON_DUTY_SINGLE';
        correctedCheckIn = `${targetDate}T09:30:00`;
        correctedCheckOut = `${targetDate}T${defaultCheckoutTime}:00`;
        finalOnDutyMinutes = 480;
        finalEarlyPermMinutes = 0;
      }
    } else if (reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD') {
      finalCategory = 'ON_SITE';
      correctedCheckIn = `${targetDate}T09:30:00`;
      correctedCheckOut = `${targetDate}T${defaultCheckoutTime}:00`;
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
    const isWfhSelected = reviewStatus === 'WFH' || reviewStatus === 'WORK_FROM_HOME';
    const computedStartDate =
      isOnSiteSelected && onSiteType === 'range'
        ? (onSiteStartDate || targetDate)
        : isWfhSelected && wfhType === 'range'
          ? (wfhStartDate || targetDate)
          : targetDate;

    const computedEndDate =
      isOnSiteSelected && onSiteType === 'range'
        ? (onSiteEndDate || targetDate)
        : isWfhSelected && wfhType === 'range'
          ? (wfhEndDate || targetDate)
          : targetDate;

    let composedReason = reviewReason.trim();
    if (!composedReason) {
      if (reviewStatus === 'WFH') {
        composedReason = 'Work From Home (Remote)';
      } else if (reviewStatus === 'ON_DUTY') {
        if (onDutySchedule === 'split') {
          composedReason = `Office morning + Afternoon site visit to ${resolvedClientName} (${resolvedPlaceOfVisit}) [Departed: ${onDutyDepartureTime || '13:30'}]${clientVisitNote.trim() ? ` - ${clientVisitNote.trim()}` : ''}`;
        } else {
          composedReason = `On Duty visit to ${resolvedClientName} (${resolvedPlaceOfVisit})${clientVisitNote.trim() ? ` - ${clientVisitNote.trim()}` : ''}`;
        }
      } else if (isOnSiteSelected) {
        composedReason = `On-Site Staff: ${resolvedClientName} (${resolvedPlaceOfVisit})`;
      }
    } else if (!isOnSiteSelected && reviewStatus !== 'ON_DUTY' && applyClientVisit) {
      const visitHoursNum = parseFloat(clientVisitHours) || 0;
      finalOnDutyMinutes = Math.round(visitHoursNum * 60);
      const visitNote = `Partial Client Visit: ${clientVisitHours}h${clientVisitLocation.trim() ? ` at ${clientVisitLocation.trim()}` : ''}`;
      composedReason = `${composedReason} | ${visitNote}`;
    }

    onRegularize({
      employee_code: timesheet.employee_code || timesheet.code,
      attendance_date: targetDate,
      start_date: computedStartDate,
      end_date: computedEndDate,
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
      review_reason: composedReason,
      corrected_check_in: correctedCheckIn,
      corrected_check_out: correctedCheckOut,
      reviewed_by: reviewedBy.trim(),
      apply_permission: (reviewStatus === 'PRESENT_CONFIRMED' || reviewStatus === 'HALF_DAY') ? applyPermission : false,
      permission_minutes: (reviewStatus === 'PRESENT_CONFIRMED' || reviewStatus === 'HALF_DAY') && applyPermission ? Number(permissionMinutes) : 0,
      early_permission_minutes: finalEarlyPermMinutes,
      on_duty_minutes: finalOnDutyMinutes,
      set_on_site_master: setOnSiteMaster,
      remove_on_site_master: removeOnSiteMaster,
      set_on_field_master: setOnSiteMaster,
      remove_on_field_master: removeOnSiteMaster,
      client_name: (reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD' || reviewStatus === 'ON_DUTY') ? resolvedClientName : undefined,
      client_code: (reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD' || reviewStatus === 'ON_DUTY') ? resolvedClientCode : undefined,
      place_of_visit: (reviewStatus === 'ON_SITE' || reviewStatus === 'ON_FIELD' || reviewStatus === 'ON_DUTY') ? resolvedPlaceOfVisit : undefined,
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
            {[
              { id: 'PRESENT_CONFIRMED', label: 'Present (Full Day)', desc: `Standard Shift (${defaultCheckoutTime === '18:45' ? '6:45 PM' : '7:30 PM'})` },
              { id: 'WFH', label: 'Work From Home (WFH)', desc: 'Remote Full Day' },
              { id: 'HALF_DAY', label: 'Half Day', desc: '1st or 2nd Half' },
              { id: 'ON_DUTY', label: 'On Duty (OD)', desc: 'Client / Site Visit' },
              { id: 'ON_SITE', label: 'On-Site Staff', desc: 'External Deployment' },
              { id: 'ON_LEAVE', label: 'Casual Leave (CL)', desc: 'Approved Paid Leave' },
              { id: 'COMP_OFF', label: 'Comp Off', desc: 'Compensatory Leave' },
              { id: 'LOP', label: 'Loss of Pay (LOP)', desc: 'Unpaid Absence' },
              { id: 'ABSENT_CONFIRMED', label: 'Mark Absent', desc: 'Unexcused Absence' },
            ].map((opt) => {
              const isSelected = reviewStatus === opt.id || (opt.id === 'ON_SITE' && reviewStatus === 'ON_FIELD');
              const isOnSiteOption = opt.id === 'ON_SITE';
              const isAbsentOption = opt.id === 'ABSENT_CONFIRMED';
              const isWfhOption = opt.id === 'WFH';
              const isOnDutyOption = opt.id === 'ON_DUTY';

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
                      ? isWfhOption
                        ? 'border-cyan-600 bg-cyan-50/80 ring-1 ring-cyan-600'
                        : isOnDutyOption
                          ? 'border-blue-600 bg-blue-50/80 ring-1 ring-blue-600'
                          : isOnSiteOption
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
                        ? isWfhOption
                          ? 'text-cyan-950 font-bold'
                          : isOnDutyOption
                            ? 'text-blue-950 font-bold'
                            : isOnSiteOption
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

        {/* Work From Home (WFH) Mode Card */}
        {reviewStatus === 'WFH' && (
          <div className="rounded-xl border border-cyan-300 bg-cyan-50/70 p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 shrink-0">
                <Home className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-cyan-950 text-xs flex items-center gap-1.5">
                  <span>Work From Home (Remote)</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-200 text-cyan-800">
                    Auto-Present
                  </span>
                </div>
                <p className="text-[11px] text-cyan-800 mt-0.5 leading-relaxed">
                  Terminal punches are waived. Attendance is recorded as <strong>Present (WFH)</strong> with ₹0 penalty for late or early exit.
                </p>
              </div>
            </div>

            {/* Scope Toggle: Single Day vs Multi-Day Range */}
            <div className="flex items-center justify-between gap-2 border-t border-cyan-200/80 pt-2.5">
              <span className="text-xs font-semibold text-cyan-950 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-600" />
                Schedule Scope
              </span>
              <div className="flex items-center gap-1 bg-white border border-cyan-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setWfhType('single')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    wfhType === 'single'
                      ? 'bg-cyan-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setWfhType('range')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    wfhType === 'range'
                      ? 'bg-cyan-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Range (Multi-Day)
                </button>
              </div>
            </div>

            {/* Multi-Day Range Pickers */}
            {wfhType === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={wfhStartDate}
                    onChange={(e) => setWfhStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    To Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={wfhEndDate}
                    onChange={(e) => setWfhEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="sm:col-span-2 text-[10px] text-cyan-800 bg-cyan-100/70 rounded px-2.5 py-1.5 leading-relaxed border border-cyan-200/60">
                  All working days in this date range will be recorded as <strong>Present (WFH)</strong> without requiring terminal punches.
                </div>
              </div>
            )}
          </div>
        )}

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
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sky-950 text-xs flex items-center gap-1.5">
                  <span>On-Site / Field Deployment</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-200/80 text-sky-800">
                    Auto-Present
                  </span>
                </div>
                <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                  Terminal punches are waived. Attendance is permanently recorded as <strong className="text-sky-900">Present (On-Site)</strong> for the selected dates.
                </p>
              </div>
            </div>

            {/* Scope Toggle: Single Day vs Multi-Day Range */}
            <div className="flex items-center justify-between gap-2 border-t border-sky-200/70 pt-2.5">
              <span className="text-xs font-semibold text-sky-950 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-sky-600" />
                Deployment Scope
              </span>
              <div className="flex items-center gap-1 bg-white border border-sky-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setOnSiteType('single')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onSiteType === 'single'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setOnSiteType('range')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onSiteType === 'range'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Range (Multi-Day)
                </button>
              </div>
            </div>

            {/* Multi-Day Range Pickers */}
            {onSiteType === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={onSiteStartDate}
                    onChange={(e) => setOnSiteStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    To Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={onSiteEndDate}
                    onChange={(e) => setOnSiteEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-2 text-[10px] text-sky-800 bg-sky-100/70 rounded px-2.5 py-1.5 leading-relaxed border border-sky-200/60">
                  All working days in this date range will be recorded as <strong>Present (On-Site)</strong> with zero penalties.
                </div>
              </div>
            )}

            {/* Client Site Selection (from Acc_Mst_Ledger) */}
            <div className="pt-2 border-t border-sky-200/70">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-sky-600" />
                  Client / Customer Site *
                </span>
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearchTerm('');
                    }}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </label>

              {selectedClient ? (
                <div className="flex items-center justify-between bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-800 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold text-[10px]">
                      {selectedClient.LedgerCode}
                    </span>
                    <span className="font-semibold text-slate-900">{selectedClient.LedgerName}</span>
                    {selectedClient.City && (
                      <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {selectedClient.City}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    placeholder="Search client (e.g. Annai Vellanganni, Vanitha Textiles)..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                  />

                  {isClientDropdownOpen && clientSearchTerm.trim().length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                      {clientOptions && clientOptions.length > 0 ? (
                        clientOptions.slice(0, 8).map((client) => (
                          <div
                            key={client.LedgerCode || client.id}
                            onMouseDown={() => {
                              setSelectedClient(client);
                              setClientSearchTerm(client.LedgerName);
                              if (client.City && !placeOfVisit) {
                                setPlaceOfVisit(client.City);
                              }
                              setIsClientDropdownOpen(false);
                            }}
                            className="px-3 py-1.5 hover:bg-sky-50 cursor-pointer flex items-center justify-between text-slate-700"
                          >
                            <span className="font-medium text-slate-900">{client.LedgerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {client.LedgerCode} {client.City ? `• ${client.City}` : ''}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                          No matching client found. Custom entry will be saved directly.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Place of Visit / Site Location */}
            <div className="pt-2 border-t border-sky-200/70">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  Place of Visit / Site Location *
                </span>
                <span className="text-[10px] text-slate-400 font-normal">City, branch, or factory address</span>
              </label>
              <input
                type="text"
                required
                value={placeOfVisit}
                onChange={(e) => setPlaceOfVisit(e.target.value)}
                placeholder="e.g. Tiruppur Unit 2, Ring Road Factory, Coimbatore Site..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
              />
            </div>

            {/* Profile sync toggle */}
            <div className="pt-2 border-t border-sky-200/70 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-sky-950">
                <input
                  type="checkbox"
                  checked={setOnSiteMaster}
                  onChange={(e) => setSetOnSiteMaster(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Update persistent On-Site role in Employee Profile</span>
              </label>
              <span className="text-[10px] text-slate-500">
                (Optional for temporary visits)
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

        {/* On Duty Mode: Partial Day (Office + Client Visit) vs Full Day vs Date Range */}
        {reviewStatus === 'ON_DUTY' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-semibold text-blue-950 block text-xs flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-blue-600" />
                On Duty Assignment Scope & Schedule
              </span>
              <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setOnDutySchedule('split')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onDutySchedule === 'split'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Partial Day (Office + Visit)
                </button>
                <button
                  type="button"
                  onClick={() => setOnDutySchedule('full')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onDutySchedule === 'full'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Day On Duty
                </button>
                <button
                  type="button"
                  onClick={() => setOnDutySchedule('range')}
                  className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                    onDutySchedule === 'range'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Date Range (Multi-Day)
                </button>
              </div>
            </div>

            {/* Partial Day Schedule: Office In-Punch + Client Departure/Visit Time */}
            {onDutySchedule === 'split' && (
              <div className="space-y-2.5 border-t border-blue-200/70 pt-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span>Office Check-IN Time *</span>
                      {timesheet?.first_in && (
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                          Device Punch
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={correctedInTime}
                        onChange={(e) => setCorrectedInTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 font-mono font-semibold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                      <span>Office Exit / Client Departure Time *</span>
                      {timesheet?.last_out && timesheet.last_out !== timesheet.first_in && (
                        <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                          Device Punch
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-500" />
                      <input
                        type="time"
                        required
                        value={onDutyDepartureTime}
                        onChange={(e) => setOnDutyDepartureTime(e.target.value)}
                        className="w-full rounded-lg border border-blue-300 bg-white py-1.5 pl-9 pr-3 text-xs text-blue-900 font-mono font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-blue-800 bg-blue-100/70 rounded px-2.5 py-1.5 leading-relaxed border border-blue-200/60 flex items-start gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    Office hours captured from device punches. Outside visit time credited to On-Duty (OD). Early departure fine is waived (₹0 penalty).
                  </div>
                </div>
              </div>
            )}

            {/* Date Range Option */}
            {onDutySchedule === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-blue-200/70">
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
                  All working days in this date range recorded as <strong>Present (On Duty)</strong> without terminal punches.
                </div>
              </div>
            )}

            {/* Full Day Option Notice */}
            {onDutySchedule === 'full' && (
              <div className="border-t border-blue-200/70 pt-2 text-[10px] text-blue-800 bg-blue-100/60 rounded px-2.5 py-1.5 leading-relaxed">
                Full-day client assignment. Terminal punches excused with zero penalties.
              </div>
            )}

            {/* Mandatory Client Information for On Duty */}
            <div className="border-t border-blue-200/70 pt-2.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  Client Information *
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="clientSource"
                      checked={clientSource === 'new'}
                      onChange={() => setClientSource('new')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-blue-900 font-semibold">New Client (No Ledger Needed)</span>
                  </label>
                  <span className="text-slate-300">|</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="clientSource"
                      checked={clientSource === 'ledger'}
                      onChange={() => setClientSource('ledger')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Existing Ledger</span>
                  </label>
                </div>
              </div>

              {clientSource === 'new' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Client / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    placeholder="e.g. Senthil Spinners, Royal Garments, Texcorp..."
                    className="w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Recorded directly in attendance records without requiring an accounting ledger.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>Search Client from Ledger *</span>
                    {selectedClient && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(null);
                          setClientSearchTerm('');
                        }}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </label>

                  {selectedClient ? (
                    <div className="flex items-center justify-between bg-white border border-blue-300 rounded-lg p-2 text-xs text-slate-800 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
                          {selectedClient.LedgerCode}
                        </span>
                        <span className="font-semibold text-slate-900">{selectedClient.LedgerName}</span>
                        {selectedClient.City && (
                          <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {selectedClient.City}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value);
                          setIsClientDropdownOpen(true);
                        }}
                        onFocus={() => setIsClientDropdownOpen(true)}
                        placeholder="Search existing client ledger..."
                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      {isClientDropdownOpen && clientSearchTerm.trim().length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                          {clientOptions && clientOptions.length > 0 ? (
                            clientOptions.slice(0, 8).map((client) => (
                              <div
                                key={client.LedgerCode || client.id}
                                onMouseDown={() => {
                                  setSelectedClient(client);
                                  setClientSearchTerm(client.LedgerName);
                                  if (client.City && !placeOfVisit) {
                                    setPlaceOfVisit(client.City);
                                  }
                                  setIsClientDropdownOpen(false);
                                }}
                                className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-slate-700"
                              >
                                <span className="font-medium text-slate-900">{client.LedgerName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {client.LedgerCode} {client.City ? `• ${client.City}` : ''}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                              No matching client found in ledger.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory Place of Visit for On Duty */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Place of Visit / Site Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />
                  <input
                    type="text"
                    required
                    value={placeOfVisit}
                    onChange={(e) => setPlaceOfVisit(e.target.value)}
                    placeholder="e.g. Ring Road Unit, Avinashi Site, Client Factory..."
                    className="w-full rounded-lg border border-blue-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Visit Purpose Note */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Visit Purpose / Activity Note (Optional)
                </label>
                <input
                  type="text"
                  value={clientVisitNote}
                  onChange={(e) => setClientVisitNote(e.target.value)}
                  placeholder="e.g. ERP demonstration, machine maintenance, quarterly site audit..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Office Biometric Timestamps & Permissions - ONLY for Office Presence & Adjustments */}
        {reviewStatus !== 'ON_SITE' &&
          reviewStatus !== 'ON_FIELD' &&
          reviewStatus !== 'ON_LEAVE' &&
          reviewStatus !== 'LOP' &&
          reviewStatus !== 'ABSENT_CONFIRMED' &&
          reviewStatus !== 'COMP_OFF' &&
          reviewStatus !== 'WFH' &&
          reviewStatus !== 'ON_DUTY' && (
            <>
              {/* Timestamps */}
              {(reviewStatus === 'PRESENT_CONFIRMED' ||
                reviewStatus === 'HALF_DAY') && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Check-IN Time *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={correctedInTime}
                        onChange={(e) => setCorrectedInTime(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 font-mono font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Check-OUT Time *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="time"
                        required
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
                  <span>Late Arrival Permission (Waive Morning Late Penalty)</span>
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
                  <span>Early Departure Permission (Relieve Before Shift End)</span>
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
                  <span>Partial Client Visit / External Duty</span>
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
            </>
          )}

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
            Reviewed / Confirmed By *
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
