import React, { createContext, useContext, useState, useMemo } from 'react';
import { useReportFinancialYears } from '../api/customerReportApi';
import {
  normalizeFinYear,
  getFullFinYear,
  getFinYearCode,
  generateNextTransactionNo,
} from '../utils/transactionNumberUtils';

/**
 * Calculates current Financial Year based on system date.
 * (In India, FY starts April 1st and ends March 31st).
 * E.g., for Nov 2026 -> "2026-2027"
 */
export const getSystemCurrentFinYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1 - 12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
};

export {
  normalizeFinYear,
  getFullFinYear,
  getFinYearCode,
  generateNextTransactionNo,
};

const FinancialYearContext = createContext(null);

export const FinancialYearProvider = ({ children }) => {
  const { data: finYearsRes, isLoading: isLoadingYears } = useReportFinancialYears();

  const currentSystemFY = useMemo(() => getSystemCurrentFinYear(), []);

  const availableYears = useMemo(() => {
    const rawFetched = finYearsRes?.data?.data || finYearsRes?.data || [];
    const normalizedFetched = Array.isArray(rawFetched)
      ? rawFetched.map((y) => (y === 'ALL' ? 'ALL' : normalizeFinYear(y)))
      : [];
    const base = ['ALL', currentSystemFY, '2025-2026', '2024-2025'];
    // Deduplicate while preserving order
    return Array.from(new Set([...base, ...normalizedFetched]));
  }, [finYearsRes, currentSystemFY]);

  const [selectedFinYear, setSelectedFinYearState] = useState(() => {
    try {
      const saved = localStorage.getItem('scoto_selected_fin_year');
      if (saved) {
        return normalizeFinYear(saved);
      }

      const loginFy = localStorage.getItem('scoto_fin_year');
      if (loginFy) {
        const parsed = JSON.parse(loginFy);
        const fyName = parsed?.name || parsed?.id;
        if (fyName) return normalizeFinYear(fyName);
      }
    } catch {
      // ignore parse errors
    }
    // Default to the current system financial year (e.g. 2026-2027)
    return getSystemCurrentFinYear();
  });

  const setSelectedFinYear = (year) => {
    const normalized = normalizeFinYear(year);
    setSelectedFinYearState(normalized);
    try {
      localStorage.setItem('scoto_selected_fin_year', normalized);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({
      selectedFinYear,
      setSelectedFinYear,
      availableYears,
      isLoadingYears,
      currentSystemFY,
    }),
    [selectedFinYear, availableYears, isLoadingYears, currentSystemFY]
  );

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  );
};

export const useFinancialYear = () => {
  const context = useContext(FinancialYearContext);
  if (!context) {
    const currentFY = getSystemCurrentFinYear();
    return {
      selectedFinYear: currentFY,
      setSelectedFinYear: () => {},
      availableYears: ['ALL', currentFY, '2025-2026', '2024-2025'],
      isLoadingYears: false,
      currentSystemFY: currentFY,
    };
  }
  return context;
};

export default FinancialYearContext;
