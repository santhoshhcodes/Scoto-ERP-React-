import React from 'react';
import { Search, X, RotateCcw, Filter } from 'lucide-react';

export const FilterBar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  departments = [],
  selectedDepartment = '',
  onDepartmentChange,
  statuses = [],
  selectedStatus = '',
  onStatusChange,
  dateValue = '',
  onDateChange,
  onResetFilters,
  extraActions,
  className = '',
}) => {
  const hasActiveFilters = Boolean(
    searchValue || selectedDepartment || selectedStatus || (dateValue && onDateChange)
  );

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs ${className}`}
    >
      {/* Search & Filters Left Group */}
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        {/* Search Box */}
        {onSearchChange && (
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Department Filter */}
        {onDepartmentChange && departments.length > 0 && (
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}

        {/* Status Filter */}
        {onStatusChange && statuses.length > 0 && (
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {statuses.map((st) => (
              <option key={st.value || st} value={st.value || st}>
                {st.label || st}
              </option>
            ))}
          </select>
        )}

        {/* Date Filter */}
        {onDateChange && (
          <input
            type="date"
            value={dateValue}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}

        {/* Reset Filters */}
        {hasActiveFilters && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Reset all filters"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Right Extra Actions Slot */}
      {extraActions && (
        <div className="flex items-center gap-2">{extraActions}</div>
      )}
    </div>
  );
};

export default FilterBar;
