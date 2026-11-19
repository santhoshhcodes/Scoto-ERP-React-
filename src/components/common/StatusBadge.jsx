import React from 'react';

const STATUS_CONFIGS = {
  // Backend DayStatusEnum & Attendance Statuses
  FULL_DAY: {
    label: 'Full Day',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  HALF_DAY: {
    label: 'Half Day',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  SHORT_HOURS: {
    label: 'Short Hours',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  SINGLE_PUNCH_ANOMALY: {
    label: 'Single Punch',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  NO_CHECK_IN_REVIEW: {
    label: 'No Check-In',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  PRESENT_CONFIRMED: {
    label: 'Present',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-600',
  },
  ABSENT_CONFIRMED: {
    label: 'Absent',
    bg: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-600',
  },
  ON_DUTY: {
    label: 'On Duty',
    bg: 'bg-blue-50 text-blue-800 border-blue-300',
    dot: 'bg-blue-600',
  },
  WFH: {
    label: 'WFH',
    bg: 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-400',
    dot: 'bg-cyan-600',
  },
  WORK_FROM_HOME: {
    label: 'WFH',
    bg: 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-400',
    dot: 'bg-cyan-600',
  },
  DEVICE_ISSUE: {
    label: 'Device Issue',
    bg: 'bg-purple-50 text-purple-800 border-purple-300',
    dot: 'bg-purple-600',
  },
  ON_LEAVE: {
    label: 'Casual Leave (CL)',
    bg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dot: 'bg-indigo-600',
  },
  COMP_OFF: {
    label: 'Comp Off',
    bg: 'bg-teal-50 text-teal-800 border-teal-300',
    dot: 'bg-teal-600',
  },
  ON_SITE: {
    label: 'Present (On-Site)',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400',
    dot: 'bg-emerald-600',
  },
  ON_FIELD: {
    label: 'Present (On-Site)',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400',
    dot: 'bg-emerald-600',
  },
  HALF_DAY_FIRST: {
    label: '1st Half (9:30-1:30)',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-600',
  },
  HALF_DAY_SECOND: {
    label: '2nd Half (1:30-7:30)',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-600',
  },
  LOP: {
    label: 'Loss of Pay (LOP)',
    bg: 'bg-red-50 text-red-800 border-red-300',
    dot: 'bg-red-600',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-600',
  },
  WAIVED: {
    label: 'Waived',
    bg: 'bg-teal-50 text-teal-800 border-teal-300',
    dot: 'bg-teal-600',
  },
  UNCONFIRMED: {
    label: 'Unconfirmed',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  ACTION_NEEDED: {
    label: 'Action Needed',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  ABSENT: {
    label: 'Absent',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },

  // Legacy / Additional Attendance Statuses
  PRESENT: {
    label: 'Present',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  LATE: {
    label: 'Late In',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  ON_LEAVE: {
    label: 'On Leave',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  HOLIDAY: {
    label: 'Holiday',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },

  // Punch Directions
  IN: {
    label: 'PUNCH IN',
    bg: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  OUT: {
    label: 'PUNCH OUT',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },

  // Payroll Statuses
  DRAFT: {
    label: 'Draft',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  LOCKED: {
    label: 'Locked',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  DISBURSED: {
    label: 'Disbursed',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  PAID: {
    label: 'Paid',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },

  // Voucher / Approval Statuses
  PENDING: {
    label: 'Pending Approval',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Approved',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },

  // General Statuses
  ACTIVE: {
    label: 'Active',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Inactive',
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  ONLINE: {
    label: 'Online',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500 animate-pulse',
  },
  OFFLINE: {
    label: 'Offline',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  SYNCED: {
    label: 'Synced',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
};

export const StatusBadge = ({
  status,
  customLabel,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();
  const config = STATUS_CONFIGS[normalized] || {
    label: customLabel || status.replace(/_/g, ' '),
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-medium px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {showDot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{customLabel || config.label}</span>
    </span>
  );
};

export default StatusBadge;
