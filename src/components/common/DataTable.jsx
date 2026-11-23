import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load records.',
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria at this time.',
  pageSize = 10,
  enablePagination = true,
  onRowClick,
  className = '',
  // Server-side pagination & sorting props (optional, fallback to client-side)
  serverPagination = false,
  page = 1,
  totalRecords = 0,
  totalPages = 1,
  sortBy = null,
  sortOrder = 'desc',
  onPageChange,
  onPageSizeChange,
  onSortChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  // Client-side state fallback
  const [clientPage, setClientPage] = useState(1);
  const [clientSort, setClientSort] = useState({ key: null, direction: 'asc' });

  const activePage = serverPagination ? page : clientPage;
  const activeSortKey = serverPagination ? sortBy : clientSort.key;
  const activeSortDir = serverPagination ? (sortOrder || 'desc').toLowerCase() : clientSort.direction;

  // Client-side sorting (only used when serverPagination is false)
  const sortedData = useMemo(() => {
    if (serverPagination || !clientSort.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[clientSort.key];
      const bVal = b[clientSort.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        const res = aVal.localeCompare(bVal);
        return clientSort.direction === 'asc' ? res : -res;
      }

      if (clientSort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [data, clientSort, serverPagination]);

  // Compute total pages & records
  const calculatedTotalPages = serverPagination
    ? Math.max(1, totalPages || Math.ceil((totalRecords || data.length) / pageSize))
    : Math.max(1, Math.ceil(sortedData.length / pageSize));

  const calculatedTotalRecords = serverPagination
    ? totalRecords || data.length
    : sortedData.length;

  // Paginated Data
  const paginatedData = useMemo(() => {
    if (serverPagination) return data;
    if (!enablePagination) return sortedData;
    const start = (clientPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [data, sortedData, clientPage, pageSize, enablePagination, serverPagination]);

  // Sort header click handler
  const handleSort = (key, isSortable) => {
    if (!isSortable) return;
    if (serverPagination) {
      if (onSortChange) {
        const nextDir = activeSortKey === key && activeSortDir === 'asc' ? 'desc' : 'asc';
        onSortChange(key, nextDir);
      }
    } else {
      setClientSort((prev) => {
        if (prev.key === key) {
          if (prev.direction === 'asc') return { key, direction: 'desc' };
          return { key: null, direction: 'asc' };
        }
        return { key, direction: 'asc' };
      });
    }
  };

  // Page change handler
  const handlePageClick = (p) => {
    if (p < 1 || p > calculatedTotalPages) return;
    if (serverPagination) {
      if (onPageChange) onPageChange(p);
    } else {
      setClientPage(p);
    }
  };

  // Smart page numbers window (with ellipsis)
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

  const startEntry = calculatedTotalRecords === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endEntry = Math.min(activePage * pageSize, calculatedTotalRecords);

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              {columns.map((col, index) => {
                const isSortable = col.sortable !== false && col.accessorKey;
                const isSorted = activeSortKey === col.accessorKey;
                return (
                  <th
                    key={col.id || col.accessorKey || index}
                    scope="col"
                    onClick={() => handleSort(col.accessorKey, isSortable)}
                    className={`px-4 py-3.5 text-xs font-semibold ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${isSortable ? 'cursor-pointer select-none hover:text-slate-900' : ''} ${col.className || ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            activeSortDir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className="px-4 py-4">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              // Error State
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-slate-900">
                      Failed to fetch data
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">{errorMessage}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Inbox className="h-6 w-6" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-slate-900">
                      {emptyTitle}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {emptyDescription}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row.id || row.TransNo || row.ItemCode || row.LedgerCode || row.EmployeeId || `row-${rowIdx}`}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.id || col.accessorKey || colIdx}
                      className={`px-4 py-3.5 text-sm ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.cellRender
                        ? col.cellRender(row, rowIdx)
                        : col.accessorKey
                        ? row[col.accessorKey] ?? '--'
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && !isLoading && !isError && calculatedTotalRecords > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
          <div className="flex items-center gap-4 text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{startEntry}</span> to{' '}
              <span className="font-semibold text-slate-700">{endEntry}</span> of{' '}
              <span className="font-semibold text-slate-700">{calculatedTotalRecords}</span> entries
            </div>

            {onPageSizeChange && (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
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

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageClick(activePage - 1)}
              disabled={activePage === 1}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <div className="flex items-center gap-1 px-1">
              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageClick(p)}
                    className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                      activePage === p
                        ? 'bg-indigo-600 font-semibold text-white'
                        : 'text-slate-600 hover:bg-slate-200 cursor-pointer'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => handlePageClick(activePage + 1)}
              disabled={activePage === calculatedTotalPages}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
