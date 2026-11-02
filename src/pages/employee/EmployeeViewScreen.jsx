import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Edit3,
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Building,
  MapPin,
  Clock,
  ScanFace,
  ShieldCheck,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  Share2,
  UserX,
  Heart,
  Landmark,
  CreditCard,
  DollarSign,
  Lock,
  Eye,
  Info,
} from 'lucide-react';
import scotoLogo from '../../assets/Scoto.png';

export const EmployeeViewScreen = ({
  employee,
  onBack,
  onEdit,
  onDeactivate,
}) => {
  if (!employee) return null;

  const isManual = employee.EmployeeSource === 'MANUAL';
  const isEssl = employee.EmployeeSource === 'ESSL' || Boolean(employee.ESSLEmployeeCode);

  // Role-based authorization for sensitive fields
  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userRole = (authUser.role || authUser.role_code || 'SystemAdmin').toUpperCase();
  const canAccessSensitiveData = [
    'SUPER_ADMIN',
    'ADMIN',
    'SYSTEMADMIN',
    'HR_MANAGER',
    'ACCOUNTS_OFFICER',
    '1',
    '2',
  ].includes(userRole);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateStr).split('T')[0];
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return '—';
    return `₹ ${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const maskIdentifier = (val, visibleChars = 4) => {
    if (!val) return '—';
    const str = String(val).trim();
    if (str.length <= visibleChars) return str;
    const maskedPart = '•'.repeat(str.length - visibleChars);
    return `${maskedPart}${str.slice(-visibleChars)}`;
  };

  const fullName =
    employee.DisplayName ||
    `${employee.FirstName || ''} ${employee.MiddleName || ''} ${employee.LastName || ''}`
      .replace(/\s+/g, ' ')
      .trim() ||
    employee.EmployeeCode;

  const avatarInitial = fullName.charAt(0).toUpperCase() || 'E';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Directory</span>
          </button>

          {/* Scoto Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 shadow-xs">
              <img src={scotoLogo} alt="SCOTO ERP Logo" className="h-full w-full object-contain" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-xs tracking-tight text-slate-800 flex items-center gap-1">
                  SCOTO <span className="text-indigo-600 font-black">ERP</span>
                </span>
                <span className="text-slate-300">•</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Staff Dossier: {fullName}
                </h1>
                <span className="font-mono text-xs font-bold rounded-md bg-indigo-50 text-indigo-700 px-2.5 py-0.5 border border-indigo-200">
                  {employee.EmployeeCode}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Complete personnel profile, departmental placement, biometric synchronization, and compensation
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(employee)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors shadow-2xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Staff Details</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-3xl font-black text-white shadow-lg ring-4 ring-white/10">
              {avatarInitial}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl text-white">
                  {fullName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
                    employee.IsActive !== false
                      ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 ring-rose-500/30'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      employee.IsActive !== false ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {employee.IsActive !== false ? 'Active Employee' : 'Inactive'}
                </span>
                <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                  {employee.EmploymentStatus || 'ACTIVE'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                  <strong className="text-white">{employee.DesignationName || employee.JobTitle || 'Staff Member'}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{employee.DepartmentName || 'Operations'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{employee.LocationName || 'Main Plant'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 md:border-t-0 md:pt-0">
            <div className="text-left md:text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Source Channel
              </span>
              <span className="text-sm font-bold text-white">
                {isEssl ? 'eSSL Face Terminal' : 'Manual Direct'}
              </span>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Employment Type
              </span>
              <span className="text-sm font-bold text-white">
                {employee.EmploymentType || 'Full Time'}
              </span>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Joined Date
              </span>
              <span className="text-sm font-bold text-indigo-300">
                {formatDate(employee.DateOfJoining)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Personal & Demographic Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Personal & Demographic Details
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Identity Records</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">First / Given Name</span>
                <p className="text-sm font-semibold text-slate-900">{employee.FirstName || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Middle Name</span>
                <p className="text-sm font-semibold text-slate-900">{employee.MiddleName || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Last Name / Surname</span>
                <p className="text-sm font-semibold text-slate-900">{employee.LastName || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Date of Birth</span>
                <p className="text-sm font-semibold text-slate-900">{formatDate(employee.DateOfBirth)}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Gender</span>
                <p className="text-sm font-semibold text-slate-900">{employee.Gender || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Blood Group</span>
                <p className="text-sm font-semibold text-slate-900 font-mono text-indigo-700">
                  {employee.BloodGroup || '—'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Marital Status</span>
                <p className="text-sm font-semibold text-slate-900">{employee.MaritalStatus || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Nationality</span>
                <p className="text-sm font-semibold text-slate-900">{employee.Nationality || 'Indian'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">ERP Role</span>
                <p className="text-sm font-semibold text-slate-900">{employee.AppRole || 'EMPLOYEE'}</p>
              </div>
            </div>
          </div>

          {/* Card: Residential Address & Contact */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Residential Address & Domicile
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Physical Residence</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium">Complete Street Address</span>
                <p className="text-sm font-semibold text-slate-900">
                  {[employee.AddressLine1, employee.AddressLine2].filter(Boolean).join(', ') || 'No street address recorded'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">City / Town</span>
                <p className="text-sm font-semibold text-slate-900">{employee.City || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">District</span>
                <p className="text-sm font-semibold text-slate-900">{employee.District || '—'}</p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">State & PIN Code</span>
                <p className="text-sm font-semibold text-slate-900">
                  {employee.State || 'Tamil Nadu'}{employee.PostalCode ? ` - ${employee.PostalCode}` : ''}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Country</span>
                <p className="text-sm font-semibold text-slate-900">{employee.Country || 'India'}</p>
              </div>
            </div>
          </div>

          {/* Card: Family & Emergency Contact */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Family & Emergency Contact
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Next of Kin</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Father's Name & Contact</span>
                <p className="text-sm font-semibold text-slate-900">{employee.FatherName || '—'}</p>
                {employee.FatherMobileNumber && (
                  <p className="font-mono text-xs text-slate-600">{employee.FatherMobileNumber}</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Mother's Name & Contact</span>
                <p className="text-sm font-semibold text-slate-900">{employee.MotherName || '—'}</p>
                {employee.MotherMobileNumber && (
                  <p className="font-mono text-xs text-slate-600">{employee.MotherMobileNumber}</p>
                )}
              </div>

              <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3 space-y-1 sm:col-span-2">
                <span className="text-rose-900 font-semibold block">Primary Emergency Contact</span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {employee.EmergencyContactName || 'No emergency contact registered'}
                    </p>
                    <span className="text-xs text-slate-500">
                      Relationship: {employee.EmergencyContactRelation || '—'}
                    </span>
                  </div>
                  {employee.EmergencyContactNumber && (
                    <a
                      href={`tel:${employee.EmergencyContactNumber}`}
                      className="font-mono font-bold text-rose-700 bg-rose-100/70 px-3 py-1 rounded-lg hover:bg-rose-200 transition-colors"
                    >
                      {employee.EmergencyContactNumber}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Bank Remittance Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Bank & Payroll Remittance
                </h3>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                Confidential
              </span>
            </div>

            {!canAccessSensitiveData ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Bank account details are restricted to authorized Payroll and HR administrators.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Bank Name</span>
                  <p className="text-sm font-semibold text-slate-900">{employee.BankName || '—'}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Branch</span>
                  <p className="text-sm font-semibold text-slate-900">{employee.BankBranch || '—'}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Account Holder</span>
                  <p className="text-sm font-semibold text-slate-900">{employee.AccountHolderName || '—'}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Account Number</span>
                  <p className="text-sm font-mono font-bold text-slate-900">
                    {employee.AccountNumber ? employee.AccountNumber : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">IFSC Code</span>
                  <p className="text-sm font-mono font-bold text-indigo-700">{employee.IFSCCode || '—'}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Account Type</span>
                  <p className="text-sm font-semibold text-slate-900">{employee.AccountType || 'SAVINGS'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Card: Statutory Compliance */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Statutory Identification & Tax Compliance
                </h3>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                Tax & Compliance
              </span>
            </div>

            {!canAccessSensitiveData ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Statutory identification numbers are restricted to authorized personnel.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Aadhaar Card Number</span>
                  <p className="text-sm font-mono font-bold text-slate-900">
                    {employee.AadhaarNumber ? employee.AadhaarNumber : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">Income Tax PAN Number</span>
                  <p className="text-sm font-mono font-bold text-slate-900">
                    {employee.PANNumber ? employee.PANNumber : '—'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">EPF Scheme Status</span>
                  <p className="text-sm font-bold text-emerald-700">
                    {employee.PFApplicable ? 'PF Enrolled' : 'Not Applicable'}
                  </p>
                </div>

                {employee.PFApplicable && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                      <span className="text-slate-500 font-medium">PF Universal Account (UAN)</span>
                      <p className="text-sm font-mono font-bold text-slate-900">{employee.PFUAN || '—'}</p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                      <span className="text-slate-500 font-medium">PF Member Account ID</span>
                      <p className="text-sm font-mono text-slate-900">{employee.PFNumber || '—'}</p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                      <span className="text-slate-500 font-medium">PF Enrollment Date</span>
                      <p className="text-sm font-semibold text-slate-900">{formatDate(employee.PFJoiningDate)}</p>
                    </div>
                  </>
                )}

                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                  <span className="text-slate-500 font-medium">ESIC Insurance Status</span>
                  <p className="text-sm font-bold text-emerald-700">
                    {employee.ESIApplicable ? 'ESI Enrolled' : 'Not Applicable'}
                  </p>
                </div>

                {employee.ESIApplicable && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1 sm:col-span-2">
                    <span className="text-slate-500 font-medium">ESI Insurance Number</span>
                    <p className="text-sm font-mono font-bold text-slate-900">{employee.ESINumber || '—'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card: Salary & Compensation Structure */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Compensation Package & Remuneration
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Payroll Structure
              </span>
            </div>

            {!canAccessSensitiveData ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Salary details are confidential and restricted to authorized management.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                    <span className="text-slate-500 font-medium">Salary Grade</span>
                    <p className="text-sm font-bold text-slate-900">{employee.SalaryGrade || 'Standard Band'}</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                    <span className="text-slate-500 font-medium">Pay Frequency</span>
                    <p className="text-sm font-bold text-slate-900">{employee.PayFrequency || 'MONTHLY'}</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-1">
                    <span className="text-slate-500 font-medium">Effective From</span>
                    <p className="text-sm font-bold text-slate-900">{formatDate(employee.SalaryEffectiveFrom)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Earnings Breakdown */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block border-b border-emerald-100 pb-2">
                      Earnings Breakdown
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-emerald-100/50">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.BasicSalary)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-100/50">
                        <span className="text-slate-600">House Rent Allowance (HRA)</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.HRA)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-100/50">
                        <span className="text-slate-600">Dearness Allowance (DA)</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.DA)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-emerald-100/50">
                        <span className="text-slate-600">Other Allowances</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.OtherAllowances)}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="font-bold text-emerald-950">Total Gross Salary</span>
                        <span className="font-mono font-extrabold text-sm text-emerald-900">
                          {formatCurrency(employee.GrossSalary)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-900 block border-b border-rose-100 pb-2">
                      Deductions & Contributions
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-rose-100/50">
                        <span className="text-slate-600">Employee PF</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.EmployeePFContribution)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-rose-100/50">
                        <span className="text-slate-600">Employee ESI</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.EmployeeESIContribution)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-rose-100/50">
                        <span className="text-slate-600">Professional Tax (PT)</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.ProfessionalTax)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-rose-100/50">
                        <span className="text-slate-600">Other Deductions</span>
                        <span className="font-mono font-semibold text-slate-900">{formatCurrency(employee.OtherDeductions)}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="font-bold text-indigo-950">Net Take-Home Salary</span>
                        <span className="font-mono font-extrabold text-sm text-indigo-900">
                          {formatCurrency(employee.NetSalary)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {employee.SalaryRemarks && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs">
                    <span className="text-slate-500 font-medium block">Salary Remarks</span>
                    <p className="text-slate-800 mt-0.5">{employee.SalaryRemarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card: Biometric Terminal Synchronization */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ScanFace className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Biometric Terminal Hardware Linkage
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">eSSL Face Integration</span>
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-4 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
                  <ScanFace className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-900">
                      {isEssl ? 'Active Biometric Device Linkage' : 'Manual Attendance Managed'}
                    </span>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                      {isEssl ? 'eSSL Terminal' : 'Manual Direct'}
                    </span>
                  </div>
                  <p className="text-xs text-teal-800/90 leading-relaxed">
                    {isEssl ? (
                      <>
                        Linked with biometric enrollment ID{' '}
                        <strong className="font-mono text-teal-900">
                          {employee.ESSLEmployeeCode || employee.EmployeeCode}
                        </strong>
                        . Clock-in and clock-out punches recorded on the physical hardware terminal
                        are automatically synchronized with the attendance module.
                      </>
                    ) : (
                      <>
                        Staff record was registered manually. Shift check-ins and check-outs are
                        recorded directly by authorized timekeepers in the daily attendance register.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Internal Notes */}
          {employee.Notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Internal Remarks & Notes
                </h3>
              </div>
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-3.5">
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {employee.Notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col wide) */}
        <div className="space-y-6">
          {/* Card: Contact Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Phone className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Contact & Communication
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Mobile Phone</span>
                  {employee.MobileNumber ? (
                    <a
                      href={`tel:${employee.MobileNumber}`}
                      className="font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {employee.MobileNumber}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not recorded</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Alternate Mobile</span>
                  {employee.AlternateMobileNumber ? (
                    <a
                      href={`tel:${employee.AlternateMobileNumber}`}
                      className="font-mono font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {employee.AlternateMobileNumber}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not recorded</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-500 block">Email Address</span>
                  {employee.Email ? (
                    <a
                      href={`mailto:${employee.Email}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                    >
                      {employee.Email}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not recorded</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Gender</span>
                  <span className="font-semibold text-slate-900">
                    {employee.Gender || 'Not Specified'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] text-slate-500 block">Plant / Facility</span>
                  <span className="font-semibold text-slate-900">
                    {employee.LocationName || 'Main Plant'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Audit & Record Identifiers */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Audit & Record Identifiers
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Database Record ID</span>
                <span className="font-mono font-bold text-slate-900">#{employee.EmployeeId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Employee Code</span>
                <span className="font-mono font-bold text-indigo-700">{employee.EmployeeCode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Source Channel</span>
                <span className="font-semibold text-slate-900">
                  {isEssl ? 'eSSL Terminal' : 'Manual Entry'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Account Status</span>
                <span
                  className={`font-semibold ${
                    employee.IsActive !== false ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {employee.IsActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              {employee.CreatedAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Created At</span>
                  <span className="text-slate-700">{formatDate(employee.CreatedAt)}</span>
                </div>
              )}
              {employee.UpdatedAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Last Updated</span>
                  <span className="text-slate-700">{formatDate(employee.UpdatedAt)}</span>
                </div>
              )}
            </div>

            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors shadow-2xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Modify Personnel Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeViewScreen;
