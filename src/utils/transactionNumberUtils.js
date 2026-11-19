/**
 * Utility functions for Financial Year parsing and Transaction Number generation.
 * Format standard:
 *   Quotation:       SQ{FinYearCode}-{3-digit-seq}  e.g., SQ2627-001
 *   Proforma:        SP{FinYearCode}-{3-digit-seq}  e.g., SP2627-001
 *   Sales Invoice:   SI{FinYearCode}-{3-digit-seq}  e.g., SI2627-001
 */

/**
 * Normalizes a financial year string to YYYY-YYYY format (using hyphen).
 * E.g., '2026_2027' -> '2026-2027', '2025_2026' -> '2025-2026', 'ALL' -> 'ALL'
 */
export const normalizeFinYear = (finYear) => {
  if (!finYear || String(finYear).toUpperCase() === 'ALL') return 'ALL';
  const raw = String(finYear).trim();
  const cleaned = raw.replace(/\bfy[:\s]*/gi, '').trim();
  if (!cleaned || cleaned.toUpperCase() === 'ALL') return 'ALL';
  const matchFull = cleaned.match(/(\d{4})[-_](\d{4})/);
  if (matchFull) {
    return `${matchFull[1]}-${matchFull[2]}`;
  }
  const matchShort = cleaned.match(/(\d{2})[-_](\d{2})/);
  if (matchShort) {
    return `20${matchShort[1]}-20${matchShort[2]}`;
  }
  return cleaned.replace(/_/g, '-');
};

/**
 * Returns full financial year string 'YYYY-YYYY' (e.g. '2026-2027').
 */
export const getFullFinYear = (finYear, fallbackDate = new Date()) => {
  if (finYear && String(finYear).toUpperCase() !== 'ALL') {
    const cleaned = String(finYear).trim().replace(/_/g, '-');
    const fourDigitMatches = cleaned.match(/(\d{4})-(\d{4})/);
    if (fourDigitMatches) {
      return `${fourDigitMatches[1]}-${fourDigitMatches[2]}`;
    }
  }

  const date = fallbackDate ? new Date(fallbackDate) : new Date();
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const year = validDate.getFullYear();
  const month = validDate.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${endYear}`;
};

/**
 * Returns 4-digit financial year short code (e.g. '2627' for FY 2026-2027).
 */
export const getFinYearCode = (finYear, fallbackDate = new Date()) => {
  if (finYear && String(finYear).toUpperCase() !== 'ALL') {
    const cleaned = String(finYear).trim().replace(/_/g, '-');
    const fourDigitMatches = cleaned.match(/(\d{4})-(\d{4})/);
    if (fourDigitMatches) {
      return `${fourDigitMatches[1].slice(-2)}${fourDigitMatches[2].slice(-2)}`;
    }
    const twoDigitMatches = cleaned.match(/(\d{2})[-/](\d{2})/);
    if (twoDigitMatches) {
      return `${twoDigitMatches[1]}${twoDigitMatches[2]}`;
    }
    const plainFour = cleaned.match(/^\d{4}$/);
    if (plainFour) {
      return cleaned;
    }
  }

  const date = fallbackDate ? new Date(fallbackDate) : new Date();
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const year = validDate.getFullYear();
  const month = validDate.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
};

/**
 * Generates the next sequential transaction number for a given prefix and financial year.
 * Examples:
 *   prefix = 'SQ', finYear = '2026-2027' -> SQ2627-001 (or SQ2627-003 if 002 exists)
 *   prefix = 'SP', finYear = '2026-2027' -> SP2627-001
 *   prefix = 'SI', finYear = '2026-2027' -> SI2627-001
 *
 * @param {string} prefix - 'SQ' | 'SP' | 'SI'
 * @param {string} finYear - '2026-2027', '2025_2026', 'ALL', etc.
 * @param {Array} existingItems - Array of records with TransNo
 * @param {Date|string} fallbackDate - Date used when finYear is 'ALL'
 * @returns {string} - Formatted TransNo like 'SQ2627-001'
 */
export const generateNextTransactionNo = (prefix, finYear, existingItems = [], fallbackDate = new Date()) => {
  const finCode = getFinYearCode(finYear, fallbackDate);
  const pattern = new RegExp(`^${prefix}${finCode}-(\\d+)$`, 'i');

  let maxSeq = 0;
  if (Array.isArray(existingItems)) {
    for (const item of existingItems) {
      const transNo = String(item?.TransNo || item?.trans_no || '').trim();
      const match = transNo.match(pattern);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${finCode}-${String(nextSeq).padStart(3, '0')}`;
};

