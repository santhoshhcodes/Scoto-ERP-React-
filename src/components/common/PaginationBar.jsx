import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Enterprise Pagination Bar for Scoto ERP
 * Supports server-side or client-side paging, smart ellipsis windowing,
 * dynamic page size selector, and responsive layout.
 */
export const PaginationBar = ({
  page = 1,
  pageSize = 20,
  totalRecords = 0,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'entries',
  className = '',
  isLoading = false,
}) => {
  const calculatedTotalPages = Math.max(
    1,
    totalPages !== undefined ? totalPages : Math.ceil((totalRecords || 0) / (pageSize || 1))
  );

  const activePage = Math.min(Math.max(1, page), calculatedTotalPages);

  const startEntry = totalRecords === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endEntry = Math.min(activePage * pageSize, totalRecords);

  const handlePageClick = (p) => {
    if (p < 1 || p > calculatedTotalPages || p === activePage || isLoading) return;
    if (onPageChange) {
      onPageChange(p);
    }
  };

  const getPageNumbers = () => {
    const total = calculatedTotalPages;
    const current = activePage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 ${className}`}
    >
      {/* Left: Summary and Page Size */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-800">{startEntry}</span> to{' '}
          <span className="font-semibold text-slate-800">{endEntry}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalRecords}</span> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-[11px] text-slate-500">Per page:</span>
            <select
              value={pageSize}
              disabled={isLoading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handlePageClick(activePage - 1)}
          disabled={activePage <= 1 || isLoading}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 select-none">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                disabled={isLoading}
                className={`h-7 min-w-[28px] px-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activePage === p
                    ? 'bg-indigo-600 font-bold text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => handlePageClick(activePage + 1)}
          disabled={activePage >= calculatedTotalPages || isLoading}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
