import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useReportFinancialYears } from '../api/customerReportApi';

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

const FinancialYearContext = createContext(null);

export const FinancialYearProvider = ({ children }) => {
  const { data: finYearsRes, isLoading: isLoadingYears } = useReportFinancialYears();

  const currentSystemFY = useMemo(() => getSystemCurrentFinYear(), []);

  const availableYears = useMemo(() => {
    const fetched = finYearsRes?.data?.data || finYearsRes?.data || [];
    const base = ['ALL', currentSystemFY, '2025_2026', '2024_2025'];
    // Deduplicate while preserving order
    return Array.from(new Set([...base, ...fetched]));
  }, [finYearsRes, currentSystemFY]);

  const [selectedFinYear, setSelectedFinYearState] = useState(() => {
    try {
      const saved = localStorage.getItem('scoto_selected_fin_year');
      if (saved && saved !== 'ALL') return saved;

      const loginFy = localStorage.getItem('scoto_fin_year');
      if (loginFy) {
        const parsed = JSON.parse(loginFy);
        const fyName = parsed?.name || parsed?.id;
        if (fyName && fyName !== 'ALL') return fyName;
      }
    } catch {
      // ignore parse errors
    }
    // Default to the current system financial year (e.g. 2026-2027)
    return getSystemCurrentFinYear();
  });

  const setSelectedFinYear = (year) => {
    setSelectedFinYearState(year);
    try {
      localStorage.setItem('scoto_selected_fin_year', year);
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
    return {
      selectedFinYear: getSystemCurrentFinYear(),
      setSelectedFinYear: () => {},
      availableYears: ['ALL', getSystemCurrentFinYear(), '2025_2026', '2024_2025'],
      isLoadingYears: false,
      currentSystemFY: getSystemCurrentFinYear(),
    };
  }
  return context;
};

export default FinancialYearContext;
