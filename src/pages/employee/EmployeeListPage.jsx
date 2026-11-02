import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  ScanFace,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Edit3,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  UserX,
  Sparkles,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { StatCard, StatusBadge } from '../../components/common';
import { exportToExcel } from '../../utils/excelUtils';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '../../api/employeeApi';
import AddEditEmployeeScreen from './AddEditEmployeeScreen';
import EmployeeViewScreen from './EmployeeViewScreen';
import QuickFillDetailsModal, { getMissingEmployeeFields } from './QuickFillDetailsModal';
import scotoLogo from '../../assets/Scoto.png';

export const EmployeeListPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL' | 'ESSL' | 'MANUAL'
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ACTIVE' (default) | 'INACTIVE' | 'ACTION_NEEDED' | 'ALL'
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ESSL' | 'MANUAL'

  // Screen navigation modes: 'list' | 'add' | 'edit' | 'view'
  const [viewMode, setViewMode] = useState('list');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Quick-fill modal for missing fields
  const [quickFillEmployee, setQuickFillEmployee] = useState(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries & Mutations
  const {
    data: employees = [],
    isLoading,
    isFetching,
    refetch,
  } = useEmployees({
    search: searchTerm,
    limit: 100,
  });

  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();

  const handleDeactivateEmployee = async (employee) => {
    if (!employee) return;
    const confirmed = window.confirm(
      `Are you sure you want to deactivate employee ${employee.EmployeeCode} (${employee.DisplayName || employee.FirstName})?\n\nThis will soft-deactivate the record in ERP, hiding them from active lists and attendance reconciliation while preserving all historical records.`
    );
    if (!confirmed) return;

    try {
      await deleteEmployeeMutation.mutateAsync(employee.EmployeeId);
      showToast(`Employee ${employee.EmployeeCode} has been deactivated.`);
      refetch();
      if (viewMode === 'view') {
        setViewMode('list');
        setSelectedEmployee(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to deactivate employee.', 'error');
    }
  };


  // Statistics Summary
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.IsActive !== false).length;
    const inactive = total - active;
    const essl = employees.filter(
      (e) => e.EmployeeSource === 'ESSL' || Boolean(e.ESSLEmployeeCode)
    ).length;
    const manual = employees.filter((e) => e.EmployeeSource === 'MANUAL').length;
    const actionNeededCount = employees.filter(
      (e) => getMissingEmployeeFields(e).length > 0
    ).length;

    return { total, active, inactive, essl, manual, actionNeededCount };
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    const cleanSearch = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      // Search filter
      const matchesSearch =
        !cleanSearch ||
        emp.EmployeeCode?.toLowerCase().includes(cleanSearch) ||
        emp.DisplayName?.toLowerCase().includes(cleanSearch) ||
        emp.FirstName?.toLowerCase().includes(cleanSearch) ||
        emp.LastName?.toLowerCase().includes(cleanSearch) ||
        emp.DepartmentName?.toLowerCase().includes(cleanSearch) ||
        emp.DesignationName?.toLowerCase().includes(cleanSearch) ||
        emp.MobileNumber?.includes(cleanSearch);

      // Source filter
      const isEssl = emp.EmployeeSource === 'ESSL' || Boolean(emp.ESSLEmployeeCode);
      const isManual = emp.EmployeeSource === 'MANUAL';

      let matchesSource = true;
      const targetSource = activeTab !== 'ALL' ? activeTab : sourceFilter;
      if (targetSource === 'ESSL') matchesSource = isEssl;
      else if (targetSource === 'MANUAL') matchesSource = isManual;

      // Status filter: by default 'ACTIVE' shows ONLY active employees
      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = emp.IsActive !== false;
      } else if (statusFilter === 'INACTIVE') {
        matchesStatus = emp.IsActive === false;
      } else if (statusFilter === 'ACTION_NEEDED') {
        matchesStatus = getMissingEmployeeFields(emp).length > 0;
      }

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [employees, searchTerm, sourceFilter, statusFilter, activeTab]);

  // Handle Create / Edit Submission
  const handleSaveEmployee = async (payload) => {
    try {
      if (viewMode === 'edit' && selectedEmployee) {
        const wasInactive = selectedEmployee.IsActive === false;
        const nowActive = payload.IsActive === true;
        const updated = await updateEmployeeMutation.mutateAsync({
          id: selectedEmployee.EmployeeId,
          payload,
        });
        const targetCode = selectedEmployee.EmployeeCode || payload.EmployeeCode || 'record';
        if (wasInactive && nowActive) {
          showToast(`Employee ${targetCode} reactivated & updated successfully.`);
        } else {
          showToast(`Employee ${targetCode} updated successfully.`);
        }
        await refetch();
        setSelectedEmployee(null);
      } else {
        await createEmployeeMutation.mutateAsync(payload);
        showToast(`Employee ${payload.EmployeeCode} created successfully.`);
        await refetch();
        setSelectedEmployee(null);
      }
      setViewMode('list');
    } catch (err) {
      showToast(err.message || 'Failed to save employee.', 'error');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredEmployees.length) {
      showToast('No employee records to export.', 'error');
      return;
    }

    const exportData = filteredEmployees.map((emp, i) => ({
      'S.No': i + 1,
      'Employee Code': emp.EmployeeCode,
      'Full Name': emp.DisplayName || `${emp.FirstName} ${emp.LastName || ''}`.trim(),
      'Source': emp.EmployeeSource === 'MANUAL' ? 'Manual' : 'eSSL Face',
      'eSSL Device Code': emp.ESSLEmployeeCode || '—',
      'Department': emp.DepartmentName || '—',
      'Designation': emp.DesignationName || '—',
      'Mobile Number': emp.MobileNumber || '—',
      'Email': emp.Email || '—',
      'Employment Type': emp.EmploymentType || 'FULL_TIME',
      'Date of Joining': emp.DateOfJoining ? String(emp.DateOfJoining).split('T')[0] : '—',
      'Status': emp.IsActive !== false ? 'Active' : 'Inactive',
      'Notes': emp.Notes || '',
    }));

    exportToExcel(
      exportData,
      `Employee_Directory_${new Date().toISOString().split('T')[0]}`,
      'Employees'
    );
    showToast('Employee directory exported to Excel.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs shadow-xs animate-in fade-in ${toastType === 'error'
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
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="cursor-pointer opacity-70 hover:opacity-100 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Screen Mode: Add Employee */}
      {viewMode === 'add' && (
        <AddEditEmployeeScreen
          employeeToEdit={null}
          onBack={() => {
            setViewMode('list');
            setSelectedEmployee(null);
          }}
          onSave={handleSaveEmployee}
          isLoading={createEmployeeMutation.isPending}
        />
      )}

      {/* Screen Mode: Edit Employee */}
      {viewMode === 'edit' && (
        <AddEditEmployeeScreen
          employeeToEdit={selectedEmployee}
          onBack={() => {
            setViewMode('list');
            setSelectedEmployee(null);
          }}
          onSave={handleSaveEmployee}
          isLoading={updateEmployeeMutation.isPending}
        />
      )}

      {/* Screen Mode: View Employee Dossier */}
      {viewMode === 'view' && (
        <EmployeeViewScreen
          employee={selectedEmployee}
          onBack={() => {
            setViewMode('list');
            setSelectedEmployee(null);
          }}
          onEdit={(emp) => {
            setSelectedEmployee(emp);
            setViewMode('edit');
          }}
        />
      )}

      {/* Screen Mode: Directory Table & Insights */}
      {viewMode === 'list' && (
        <>
          {/* Header & Controls */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 shadow-xs">
                <img src={scotoLogo} alt="SCOTO ERP Logo" className="h-full w-full object-contain" />
              </div> */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* <span className="font-extrabold text-xs tracking-tight text-slate-800 flex items-center gap-1">
                    SCOTO <span className="text-indigo-600 font-black">ERP</span>
                  </span> */}
                  {/* <span className="text-slate-300">•</span> */}
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Employee Directory & Master
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    Workforce Mst
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Complete personnel directory: biometric eSSL device linked staff & manual employee onboarding
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Export to Excel */}
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isFetching ? 'animate-spin' : ''}`} />
                <span>{isFetching ? 'Syncing...' : 'Refresh'}</span>
              </button>

              {/* Add Employee Button */}
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setViewMode('add');
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Monitored Workforce"
              value={`${stats.total}`}
              icon={Users}
              color="indigo"
              changeLabel="Total registered staff"
            />

            <StatCard
              title="Active Personnel"
              value={`${stats.active}`}
              icon={UserCheck}
              color="emerald"
              changeLabel="Currently employed"
            />

            <StatCard
              title="eSSL Face Terminal Synced"
              value={`${stats.essl}`}
              icon={ScanFace}
              color="teal"
              changeLabel="Biometric synced"
            />

            <StatCard
              title="Manual Staff Records"
              value={`${stats.manual}`}
              icon={ShieldCheck}
              color="purple"
              changeLabel="Direct entry staff"
            />
          </div>

          {/* Main Status Segmented Control (Active Staff is default) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all ${statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${statusFilter === 'ACTIVE' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Active Staff (Default)</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${statusFilter === 'ACTIVE' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'
                    }`}
                >
                  {stats.active}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all ${statusFilter === 'INACTIVE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <UserX className={`h-3.5 w-3.5 ${statusFilter === 'INACTIVE' ? 'text-white' : 'text-rose-500'}`} />
                <span>Inactive Staff</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${statusFilter === 'INACTIVE' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800'
                    }`}
                >
                  {stats.inactive}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('ACTION_NEEDED')}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold cursor-pointer transition-all ${statusFilter === 'ACTION_NEEDED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <AlertTriangle className={`h-3.5 w-3.5 ${statusFilter === 'ACTION_NEEDED' ? 'text-white' : 'text-amber-600'}`} />
                <span>Action Needed (Incomplete Profiles)</span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${statusFilter === 'ACTION_NEEDED' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800'
                    }`}
                >
                  {stats.actionNeededCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
              >
                <span>All Staff</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {stats.total}
                </span>
              </button>
            </div>

            {/* Current View Pill */}
            <div className="text-[11px] font-medium text-slate-500">
              Showing: <strong className="text-slate-800">{
                statusFilter === 'ACTIVE'
                  ? 'Active Employees (Default)'
                  : statusFilter === 'INACTIVE'
                    ? 'Inactive / Relieved Staff'
                    : statusFilter === 'ACTION_NEEDED'
                      ? 'Profiles Missing Required Fields'
                      : 'All Registered Staff'
              }</strong> ({filteredEmployees.length})
            </div>
          </div>

          {/* Quick Filter Navigation Tabs & Search Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
            {/* Source Filters */}
            {/* <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: 'All Sources', count: stats.total },
                { id: 'ESSL', label: 'eSSL Face Synced', count: stats.essl },
                { id: 'MANUAL', label: 'Manual Staff', count: stats.manual },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div> */}

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code, employee name, phone, department..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

          {/* Main Records Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Source / Terminal</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Designation / Role</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Joining Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                        Loading employee workforce directory...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No employees found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting search filters or onboarding a new employee.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isEssl = emp.EmployeeSource === 'ESSL' || Boolean(emp.ESSLEmployeeCode);
                      const isManual = emp.EmployeeSource === 'MANUAL';
                      const isNumericName = Boolean(
                        (emp.FirstName && (!/[a-zA-Z]/.test(emp.FirstName.trim()) || /^\d+$/.test(emp.FirstName.trim()))) ||
                        (emp.DisplayName && (!/[a-zA-Z]/.test(emp.DisplayName.trim()) || /^\d+$/.test(emp.DisplayName.trim())))
                      );
                      const missingFields = getMissingEmployeeFields(emp);
                      const hasMissing = missingFields.length > 0;

                      return (
                        <tr key={emp.EmployeeId} className="hover:bg-slate-50/70 transition-colors">
                          {/* Staff Member */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700 ring-1 ring-indigo-200 text-xs shrink-0">
                                {emp.DisplayName
                                  ? emp.DisplayName.charAt(0).toUpperCase()
                                  : emp.FirstName
                                    ? emp.FirstName.charAt(0).toUpperCase()
                                    : 'E'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {emp.DisplayName || `${emp.FirstName} ${emp.LastName || ''}`.trim()}
                                  </span>
                                  {isNumericName && (
                                    <button
                                      type="button"
                                      onClick={() => setQuickFillEmployee(emp)}
                                      title="Biometric terminal assigned a number as employee name. Click to quick-fill actual staff name."
                                      className="inline-flex items-center gap-1 rounded bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                                    >
                                      <AlertTriangle className="h-3 w-3 text-amber-700 shrink-0" />
                                      Update Name
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-indigo-600">
                                  <span>{emp.EmployeeCode}</span>
                                  {emp.IsActive === false && (
                                    <span className="text-rose-600 font-bold text-[10px]">(Inactive)</span>
                                  )}
                                </div>
                                {hasMissing && (
                                  <button
                                    type="button"
                                    onClick={() => setQuickFillEmployee(emp)}
                                    className="inline-flex items-center gap-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs mt-1"
                                    title={`Missing fields: ${missingFields.map((m) => m.label).join(', ')}. Click to quick fill!`}
                                  >
                                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span>Action Needed ({missingFields.length} missing)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Source */}
                          <td className="px-4 py-3">
                            {isEssl ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
                                  <ScanFace className="h-3 w-3 text-teal-600" />
                                  <span>eSSL Face</span>
                                </span>
                                {emp.ESSLEmployeeCode && (
                                  <div className="font-mono text-[10px] text-slate-500">
                                    ID: <strong>{emp.ESSLEmployeeCode}</strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                                <UserCheck className="h-3 w-3 text-slate-500" />
                                <span>Manual Staff</span>
                              </span>
                            )}
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {emp.DepartmentName && emp.DepartmentName !== '—' ? (
                              <span>{emp.DepartmentName}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setQuickFillEmployee(emp)}
                                className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 font-medium hover:underline cursor-pointer group"
                                title="Department missing. Click to add"
                              >
                                <span className="text-slate-400 group-hover:text-amber-600">—</span>
                                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded px-1 group-hover:bg-amber-100">
                                  Add
                                </span>
                              </button>
                            )}
                          </td>

                          {/* Designation */}
                          <td className="px-4 py-3 text-slate-600">
                            {emp.DesignationName || emp.JobTitle ? (
                              <span>{emp.DesignationName || emp.JobTitle}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setQuickFillEmployee(emp)}
                                className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 font-medium hover:underline cursor-pointer group"
                                title="Designation missing. Click to add"
                              >
                                <span className="text-slate-400 group-hover:text-amber-600">—</span>
                                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded px-1 group-hover:bg-amber-100">
                                  Add
                                </span>
                              </button>
                            )}
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {emp.MobileNumber && emp.MobileNumber !== '—' ? (
                                <div className="flex items-center gap-1 font-mono text-slate-700">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span>{emp.MobileNumber}</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setQuickFillEmployee(emp)}
                                  className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 font-medium hover:underline cursor-pointer group"
                                  title="Mobile number missing. Click to add"
                                >
                                  <span className="text-slate-400 group-hover:text-amber-600">—</span>
                                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded px-1 group-hover:bg-amber-100">
                                    Add Phone
                                  </span>
                                </button>
                              )}
                              {emp.Email ? (
                                <div className="flex items-center gap-1 text-slate-500 truncate max-w-[140px]">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  <span>{emp.Email}</span>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* Date of Joining */}
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {emp.DateOfJoining && String(emp.DateOfJoining).split('T')[0] !== '1900-01-01' ? (
                              <span>{String(emp.DateOfJoining).split('T')[0]}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setQuickFillEmployee(emp)}
                                className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 font-medium hover:underline cursor-pointer group"
                                title="Date of joining missing. Click to add"
                              >
                                <span className="text-slate-400 group-hover:text-amber-600">—</span>
                                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded px-1 group-hover:bg-amber-100">
                                  Add DOJ
                                </span>
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${emp.IsActive !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                            >
                              {emp.IsActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Quick Fill Button: ONLY shown when profile needs action/completion */}
                              {hasMissing && (
                                <button
                                  type="button"
                                  onClick={() => setQuickFillEmployee(emp)}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer shadow-2xs transition-colors"
                                  title="Quick Fill Missing Details (Name, Dept, Designation)"
                                >
                                  <Sparkles className="h-3 w-3 text-amber-600" />
                                  <span>Quick Fill</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setViewMode('view');
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
                                title="View Employee Dossier Screen"
                              >
                                <Eye className="h-3 w-3 text-slate-500" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setViewMode('edit');
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors"
                                title="Edit Staff Member Profile"
                              >
                                <Edit3 className="h-3 w-3 text-indigo-600" />
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

          {/* Quick-Fill Details Modal */}
          <QuickFillDetailsModal
            employee={quickFillEmployee}
            isOpen={Boolean(quickFillEmployee)}
            onClose={() => setQuickFillEmployee(null)}
            onSuccess={async () => {
              showToast(`Updated details for employee ${quickFillEmployee?.EmployeeCode}.`);
              await queryClient.invalidateQueries({ queryKey: ['employees'] });
              await refetch();
              setQuickFillEmployee(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default EmployeeListPage;
