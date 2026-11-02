import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Universal safe comparison for strings, numbers, and dates.
 */
export function compareValues(a, b, direction = 'asc') {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;

  // Check if both can be parsed as numbers (including formatted strings like "₹1,200.50" or "100")
  const numA = typeof a === 'number' ? a : parseNumeric(a);
  const numB = typeof b === 'number' ? b : parseNumeric(b);

  if (numA !== null && numB !== null) {
    return direction === 'asc' ? numA - numB : numB - numA;
  }

  // Check if both look like dates (e.g., "2026-10-24", "2026-10-24T12:00:00")
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  if (dateA !== null && dateB !== null) {
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  }

  // Fallback to case-insensitive string comparison
  const strA = String(a).toLowerCase().trim();
  const strB = String(b).toLowerCase().trim();
  const res = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? res : -res;
}

function parseNumeric(val) {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;
  // Remove currency signs, commas, and spaces
  const clean = val.replace(/[₹$,\s]/g, '');
  if (clean === '' || isNaN(clean)) return null;
  return Number(clean);
}

function parseDate(val) {
  if (val instanceof Date) return val.getTime();
  if (typeof val !== 'string') return null;
  // Match standard YYYY-MM-DD or ISO strings
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const t = new Date(val).getTime();
    return isNaN(t) ? null : t;
  }
  return null;
}

/**
 * Hook to manage sort state and return sorted data.
 * Default sorts latest/newest first.
 */
export function useSortableData(items = [], defaultSort = { key: null, direction: 'desc' }) {
  const [sortConfig, setSortConfig] = useState(defaultSort);

  const sortedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!sortConfig || !sortConfig.key) return items;

    return [...items].sort((a, b) => {
      const aVal = typeof sortConfig.key === 'function' ? sortConfig.key(a) : a[sortConfig.key];
      const bVal = typeof sortConfig.key === 'function' ? sortConfig.key(b) : b[sortConfig.key];
      return compareValues(aVal, bVal, sortConfig.direction);
    });
  }, [items, sortConfig]);

  const requestSort = (key, defaultDir = 'desc') => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        if (prev.direction === 'desc') return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key: null, direction: null };
        return { key, direction: defaultDir };
      }
      return { key, direction: defaultDir };
    });
  };

  const resetSort = () => {
    setSortConfig(defaultSort);
  };

  return { sortedItems, sortConfig, requestSort, resetSort, setSortConfig };
}

/**
 * Industry-standard Sortable Table Header Component.
 */
export const SortableHeader = ({
  title,
  sortKey,
  sortConfig,
  onSort,
  align = 'left',
  defaultDir = 'desc',
  className = '',
  children,
}) => {
  const isSorted = sortConfig && sortConfig.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

  const alignClass =
    align === 'right'
      ? 'text-right justify-end'
      : align === 'center'
      ? 'text-center justify-center'
      : 'text-left justify-start';

  const handleClick = (e) => {
    e.preventDefault();
    if (onSort && sortKey) {
      onSort(sortKey, defaultDir);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <th
      scope="col"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`group cursor-pointer select-none transition-colors hover:text-slate-900 focus:outline-hidden ${className}`}
    >
      <div className={`inline-flex items-center gap-1.5 ${alignClass}`}>
        <span>{children || title}</span>
        <span className="shrink-0 transition-opacity">
          {direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-indigo-600 animate-in fade-in zoom-in-75 duration-150" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5 text-indigo-600 animate-in fade-in zoom-in-75 duration-150" />
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
      </div>
    </th>
  );
};
