import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Inbox, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, RefreshCw } from 'lucide-react';

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
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        const res = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? res : -res;
      }

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
  }, [data, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (!enablePagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, enablePagination]);

  const handleSort = (key, isSortable) => {
    if (!isSortable) return;
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <tr>
              {columns.map((col, index) => {
                const isSortable = col.sortable !== false && col.accessorKey;
                const isSorted = sortConfig.key === col.accessorKey;
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
                            sortConfig.direction === 'asc' ? (
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
                  key={row.id || `row-${rowIdx}`}
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
      {enablePagination && !isLoading && !isError && sortedData.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
          <div className="text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-700">
              {sortedData.length}
            </span>{' '}
            entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-indigo-600 font-semibold text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
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
