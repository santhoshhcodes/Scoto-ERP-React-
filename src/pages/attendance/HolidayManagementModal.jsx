import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  X,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeleteHoliday,
} from '../../api/attendanceApi';

export const HolidayManagementModal = ({ isOpen, onClose, onHolidayChanged }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);

  // Form State
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState('FESTIVAL');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Queries & Mutations
  const { data: holidays = [], isLoading, isFetching, refetch } = useHolidays(selectedYear);
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  const resetForm = () => {
    setHolidayDate('');
    setHolidayName('');
    setHolidayType('FESTIVAL');
    setDescription('');
    setIsAddingNew(false);
    setEditingHolidayId(null);
    setErrorMessage('');
  };

  const handleStartEdit = (h) => {
    setEditingHolidayId(h.holiday_id);
    setHolidayDate(typeof h.holiday_date === 'string' ? h.holiday_date.split('T')[0] : '');
    setHolidayName(h.holiday_name);
    setHolidayType(h.holiday_type || 'FESTIVAL');
    setDescription(h.description || '');
    setIsAddingNew(true);
    setErrorMessage('');
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!holidayDate) {
      setErrorMessage('Holiday Date is required.');
      return;
    }
    if (!holidayName.trim()) {
      setErrorMessage('Holiday Name is required (e.g. Diwali).');
      return;
    }

    try {
      const year = new Date(holidayDate).getFullYear();
      if (editingHolidayId) {
        await updateMutation.mutateAsync({
          id: editingHolidayId,
          holiday_date: holidayDate,
          holiday_name: holidayName.trim(),
          holiday_type: holidayType,
          description: description.trim() || undefined,
          year: year,
        });
        setSuccessMessage(`Holiday "${holidayName.trim()}" updated successfully.`);
      } else {
        await createMutation.mutateAsync({
          holiday_date: holidayDate,
          holiday_name: holidayName.trim(),
          holiday_type: holidayType,
          description: description.trim() || undefined,
          year: year,
          created_by: 'HR Admin',
        });
        setSuccessMessage(`Holiday "${holidayName.trim()}" added to office calendar.`);
      }

      resetForm();
      refetch();
      if (onHolidayChanged) onHolidayChanged();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Failed to save holiday.');
    }
  };

  const handleDeleteHoliday = async (h) => {
    if (!window.confirm(`Are you sure you want to remove "${h.holiday_name}" (${h.holiday_date}) from office holidays?`)) {
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await deleteMutation.mutateAsync(h.holiday_id);
      setSuccessMessage(`Holiday "${h.holiday_name}" deleted successfully.`);
      refetch();
      if (onHolidayChanged) onHolidayChanged();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Failed to delete holiday.');
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Office Holidays & Festive Calendar Master"
      subtitle="Manage company-wide holidays (Diwali, Pongal, National Holidays). Holidays apply automatically to all staff including On-Site teams."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Calendar Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Alerts & Messages */}
        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Add / Edit Form Card */}
        {isAddingNew ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span className="font-bold text-indigo-950 text-sm">
                  {editingHolidayId ? 'Edit Holiday' : 'Add New Office Holiday'}
                </span>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Holiday Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Holiday Date *
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Holiday Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Holiday / Occasion Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali, Pongal, Gandhi Jayanti..."
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Holiday Type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Holiday Category
                </label>
                <select
                  value={holidayType}
                  onChange={(e) => setHolidayType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="FESTIVAL">Festival Holiday (Diwali / Pongal / Eid / Christmas)</option>
                  <option value="NATIONAL">National Holiday (Republic Day / Independence Day)</option>
                  <option value="OFFICIAL">Company / Office Declared Holiday</option>
                  <option value="OPTIONAL">Optional / Restricted Holiday</option>
                </select>
              </div>

              {/* Description / Notes */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Description / Circular Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office closed for Deepavali celebrations."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingHolidayId
                        ? 'Update Holiday'
                        : 'Confirm & Add Holiday'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
              <span className="font-bold text-slate-800 text-sm">
                Configured Holidays for {selectedYear} ({holidays.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Office Holiday</span>
            </button>
          </div>
        )}

        {/* Holidays List Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="px-3.5 py-2.5">Date</th>
                <th className="px-3.5 py-2.5">Holiday Name</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Notes</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-indigo-600 mb-1" />
                    <span>Loading holidays...</span>
                  </td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <span className="font-semibold text-slate-700 block">No holidays scheduled for {selectedYear}</span>
                    <span className="text-[11px] text-slate-400">
                      Click &ldquo;Add Office Holiday&rdquo; to insert holidays like Diwali, Pongal, Republic Day, etc.
                    </span>
                  </td>
                </tr>
              ) : (
                holidays.map((h) => {
                  const isFestival = h.holiday_type === 'FESTIVAL';
                  const isNational = h.holiday_type === 'NATIONAL';

                  return (
                    <tr key={h.holiday_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{formatDateDisplay(h.holiday_date)}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        {h.holiday_name}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isFestival
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isNational
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {h.holiday_type || 'OFFICIAL'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[11px] max-w-[200px] truncate" title={h.description}>
                        {h.description || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(h)}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer transition-colors"
                            title="Edit Holiday"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHoliday(h)}
                            disabled={deleteMutation.isPending}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Delete Holiday"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {/* Information Callout */}
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
          <strong>Note:</strong> Days declared as office holidays will automatically mark all employees
          (including regular and persistent On-Site staff) as <strong className="text-indigo-700">Holiday</strong> on the Daily and Monthly Desks.
        </div>
      </div>
    </Modal>
  );
};

export default HolidayManagementModal;
