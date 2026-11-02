import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  User,
  ScanFace,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useUpdateEmployee } from '../../api/employeeApi';

// Suggested departments based on organization structure
const DEPARTMENT_SUGGESTIONS = [
  '.NET Developer',
  'Mobile Application Developer',
  'PHP Developer',
  'Operations',
  'Maintenance',
  'Cleaning',
  'HR & Admin',
  'Accounts & Finance',
  'Sales & Marketing',
  'Management',
];

// Helper to detect missing or placeholder fields in an employee record
// By default checks critical fields (Actual Name, Department, Designation)
export const getMissingEmployeeFields = (emp, { onlyCritical = true } = {}) => {
  if (!emp) return [];
  const missing = [];

  // 1. Name check (missing or numeric terminal ID like "12")
  const isNumericName = Boolean(
    (emp.FirstName && (!/[a-zA-Z]/.test(emp.FirstName.trim()) || /^\d+$/.test(emp.FirstName.trim()))) ||
    (emp.DisplayName && (!/[a-zA-Z]/.test(emp.DisplayName.trim()) || /^\d+$/.test(emp.DisplayName.trim())))
  );
  if (isNumericName || !emp.FirstName || emp.FirstName.trim() === '') {
    missing.push({ key: 'FirstName', label: 'Actual Name', isCritical: true });
  }

  // 2. Department check
  if (!emp.DepartmentName || emp.DepartmentName.trim() === '' || emp.DepartmentName === '—') {
    missing.push({ key: 'DepartmentName', label: 'Department', isCritical: true });
  }

  // 3. Designation check
  if (!emp.DesignationName && !emp.JobTitle) {
    missing.push({ key: 'DesignationName', label: 'Designation', isCritical: true });
  }

  // Optional / secondary profile fields
  if (!onlyCritical) {
    // 4. Mobile Number check
    if (!emp.MobileNumber || emp.MobileNumber.trim() === '' || emp.MobileNumber === '—') {
      missing.push({ key: 'MobileNumber', label: 'Mobile Number', isCritical: false });
    }

    // 5. Date of Joining check (null or SQL server 1900-01-01 default)
    const dojStr = emp.DateOfJoining ? String(emp.DateOfJoining).split('T')[0] : '';
    if (!dojStr || dojStr === '1900-01-01' || dojStr === '—') {
      missing.push({ key: 'DateOfJoining', label: 'Joining Date', isCritical: false });
    }

    // 6. Address check
    if (!emp.AddressLine1 || emp.AddressLine1.trim() === '' || emp.AddressLine1 === '—') {
      missing.push({ key: 'AddressLine1', label: 'Address', isCritical: false });
    }
  }

  // Note: Manual employees do NOT have and do NOT require an eSSL Code.
  // We do NOT treat eSSL code as missing or action needed.

  return missing;
};

export const QuickFillDetailsModal = ({
  employee,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const updateEmployeeMutation = useUpdateEmployee();

  const isManual = useMemo(() => {
    if (!employee) return false;
    return (
      employee.EmployeeSource === 'MANUAL' ||
      String(employee.EmployeeCode || '').startsWith('M')
    );
  }, [employee]);

  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    ESSLEmployeeCode: '',
    DepartmentName: '',
    DesignationName: '',
    MobileNumber: '',
    Email: '',
    DateOfJoining: '',
    AddressLine1: '',
    City: '',
    State: '',
    PostalCode: '',
  });

  const [errorMsg, setErrorMsg] = useState(null);

  // Compute missing fields for this employee (shows all empty fields in modal banner)
  const missingFields = useMemo(() => {
    return getMissingEmployeeFields(employee, { onlyCritical: false });
  }, [employee]);

  // Check if current name is numeric
  const isNumericName = useMemo(() => {
    if (!employee) return false;
    return Boolean(
      (employee.FirstName && (!/[a-zA-Z]/.test(employee.FirstName.trim()) || /^\d+$/.test(employee.FirstName.trim()))) ||
      (employee.DisplayName && (!/[a-zA-Z]/.test(employee.DisplayName.trim()) || /^\d+$/.test(employee.DisplayName.trim())))
    );
  }, [employee]);

  // Populate form data whenever employee changes
  useEffect(() => {
    if (employee && isOpen) {
      let doj = '';
      if (employee.DateOfJoining) {
        const rawDoj = String(employee.DateOfJoining).split('T')[0];
        if (rawDoj !== '1900-01-01') doj = rawDoj;
      }

      setFormData({
        FirstName: employee.FirstName || employee.DisplayName || '',
        LastName: employee.LastName || '',
        ESSLEmployeeCode: employee.ESSLEmployeeCode || '',
        DepartmentName: employee.DepartmentName || '',
        DesignationName: employee.DesignationName || employee.JobTitle || '',
        MobileNumber: employee.MobileNumber || '',
        Email: employee.Email || '',
        DateOfJoining: doj,
        AddressLine1: employee.AddressLine1 || '',
        City: employee.City || '',
        State: employee.State || '',
        PostalCode: employee.PostalCode || '',
      });
      setErrorMsg(null);
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.FirstName.trim()) {
      setErrorMsg('First Name / Staff Name is required.');
      return;
    }

    try {
      setErrorMsg(null);

      // Assemble payload - only send cleaned values
      const payload = {
        FirstName: formData.FirstName.trim(),
        LastName: formData.LastName.trim() || null,
        DisplayName: `${formData.FirstName.trim()} ${formData.LastName.trim()}`.trim(),
        DepartmentName: formData.DepartmentName.trim() || null,
        DesignationName: formData.DesignationName.trim() || null,
        JobTitle: formData.DesignationName.trim() || null,
        MobileNumber: formData.MobileNumber.trim() || null,
        Email: formData.Email.trim() || null,
        AddressLine1: formData.AddressLine1.trim() || null,
        City: formData.City.trim() || null,
        State: formData.State.trim() || null,
        PostalCode: formData.PostalCode.trim() || null,
      };

      if (formData.DateOfJoining) {
        payload.DateOfJoining = formData.DateOfJoining;
      }

      // Only pass eSSL code if employee is not a manual staff member
      if (!isManual && formData.ESSLEmployeeCode.trim()) {
        payload.ESSLEmployeeCode = formData.ESSLEmployeeCode.trim();
      }

      await updateEmployeeMutation.mutateAsync({
        id: employee.EmployeeId,
        payload,
      });

      if (onSuccess) {
        onSuccess(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update employee details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Quick Fill Details
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {employee.EmployeeCode}
                </span>
                {isManual && (
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                    Manual Staff
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Update missing information on the fly without navigating away
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Missing Fields Banner */}
        {missingFields.length > 0 && (
          <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Missing Fields ({missingFields.length}): </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {missingFields.map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center rounded bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[72vh] overflow-y-auto">
          {/* Name Row */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Staff Member Name <span className="text-rose-500">*</span>
              </span>
              {isNumericName && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Terminal ID assigned as Name
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First Name *"
                value={formData.FirstName}
                onChange={(e) => handleChange('FirstName', e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
              <input
                type="text"
                placeholder="Last Name (Optional)"
                value={formData.LastName}
                onChange={(e) => handleChange('LastName', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Biometric eSSL Code (ONLY for ESSL synced staff; hidden for manual staff) */}
          {!isManual && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <ScanFace className="h-3.5 w-3.5 text-teal-600" />
                eSSL Biometric Device Code
              </label>
              <input
                type="text"
                placeholder="e.g. 12 (terminal user ID)"
                value={formData.ESSLEmployeeCode}
                onChange={(e) => handleChange('ESSLEmployeeCode', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 font-mono placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-0.5 text-[10px] text-slate-400">
                Links punches from eSSL biometric terminal to this employee profile.
              </p>
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                Department
              </span>
              <span className="text-[10px] text-slate-400">Select or type custom</span>
            </label>
            <input
              type="text"
              list="department-suggestions"
              placeholder="e.g. .NET Developer, Operations, Cleaning"
              value={formData.DepartmentName}
              onChange={(e) => handleChange('DepartmentName', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
            <datalist id="department-suggestions">
              {DEPARTMENT_SUGGESTIONS.map((dept) => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
          </div>

          {/* Designation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              Designation / Role
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Software Engineer, Electrical Technician"
              value={formData.DesignationName}
              onChange={(e) => handleChange('DesignationName', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Contact (Phone & Email) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={formData.MobileNumber}
                onChange={(e) => handleChange('MobileNumber', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 font-mono placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@scoto.com"
                value={formData.Email}
                onChange={(e) => handleChange('Email', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Date of Joining */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Date of Joining
            </label>
            <input
              type="date"
              value={formData.DateOfJoining}
              onChange={(e) => handleChange('DateOfJoining', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Address Details */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
              Address Details
            </label>
            <input
              type="text"
              placeholder="Street Address, Door No, Area / Landmark"
              value={formData.AddressLine1}
              onChange={(e) => handleChange('AddressLine1', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="City"
                value={formData.City}
                onChange={(e) => handleChange('City', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="State"
                value={formData.State}
                onChange={(e) => handleChange('State', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Pincode"
                value={formData.PostalCode}
                onChange={(e) => handleChange('PostalCode', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-slate-900 font-mono placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={updateEmployeeMutation.isPending}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateEmployeeMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 cursor-pointer transition-all"
            >
              {updateEmployeeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickFillDetailsModal;
