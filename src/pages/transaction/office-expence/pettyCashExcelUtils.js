import ExcelJS from 'exceljs';

/**
 * Downloads an ExcelJS workbook in the browser
 */
const saveWorkbook = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

// =============================================================================
// THEME & COLOR PALETTE (Strictly Matched to SCOTO ERP Web UI)
// =============================================================================
const FONT = 'Aptos';

// Corporate Slate & Blue — designed for clear, professional finance reports.
// ExcelJS colors use ARGB format (FF + RGB).
const C = {
  // Brand and layout
  tealAccent: 'FF2563EB',
  brandNavy: 'FFFFFFFF',
  brandIndigo: 'FFEAF2FF',
  navy: 'FFFFFFFF',
  indigo: 'FFEAF2FF',
  blue: 'FFEAF2FF',
  mint: 'FFF4F8FC',
  softTeal: 'FFEAF2FF',
  tableHeader: 'FFE8EEF5',
  slate: 'FFE8EEF5',
  slateLight: 'FFF4F7FA',
  itemHeaderBg: 'FFEAF2FF',
  itemHeaderAccent: 'FF2563EB',
  subtotalBg: 'FFF1F5F9',
  totalBg: 'FFEAF2FF',
  cardBg: 'FFFFFFFF',
  white: 'FFFFFFFF',
  // Typography and borders
  ink: 'FF0F172A',
  text: 'FF0F172A',
  muted: 'FF334155',
  border: 'FFD5DEE8',
  borderSoft: 'FFE5EAF0',
  zebra: 'FFF8FAFC',
  // Positive, warning, and negative values
  creditGreen: 'FF15803D',
  creditText: 'FF14532D',
  creditBg: 'FFDCFCE7',
  creditSoft: 'FFF0FDF4',
  greenText: 'FF14532D',
  greenBg: 'FFDCFCE7',
  debitRose: 'FFDC2626',
  debitText: 'FF991B1B',
  debitBg: 'FFFEE2E2',
  debitSoft: 'FFFEF2F2',
  roseText: 'FF991B1B',
  roseBg: 'FFFEE2E2',
  amberText: 'FF78350F',
  amberBg: 'FFFEF3C7',
  runningText: 'FF1E40AF',
  runningBg: 'FFEFF6FF',
  categories: {
    'Tea & Snacks': { text: 'FF78350F', bg: 'FFFEF3C7', bar: 'FFD97706' },
    'Drinking Water': { text: 'FF0369A1', bg: 'FFE0F2FE', bar: 'FF0284C7' },
    'Flowers': { text: 'FF831843', bg: 'FFFCE7F3', bar: 'FFDB2777' },
    'Stationery': { text: 'FF312E81', bg: 'FFEEF2FF', bar: 'FF4F46E5' },
    'Cleaning': { text: 'FF14532D', bg: 'FFDCFCE7', bar: 'FF16A34A' },
    'Maintenance': { text: 'FF7C2D12', bg: 'FFFFEDD5', bar: 'FFEA580C' },
    'Travel': { text: 'FF1E40AF', bg: 'FFEFF6FF', bar: 'FF2563EB' },
    'Other': { text: 'FF0F172A', bg: 'FFF1F5F9', bar: 'FF64748B' },
  },
};

const getCategoryPalette = (catName) => {
  return C.categories[catName] || C.categories['Other'];
};

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const line = (argb = C.borderSoft, style = 'thin') => ({ style, color: { argb } });
const allBorders = (argb = C.borderSoft) => ({
  top: line(argb),
  left: line(argb),
  bottom: line(argb),
  right: line(argb),
});

// Upgraded base font size from 10 to 11 for clearer readability, with bold and darker text
const font = (o = {}) => ({ name: FONT, size: 11, bold: true, color: { argb: C.text }, ...o });

// Number formats
const MONEY = '"₹"#,##0.00;[Red]-"₹"#,##0.00;"–"';
const INT = '#,##0;-#,##0;"–"';
const PCT = '0.0%';

const ALIGN = {
  left: { vertical: 'middle', horizontal: 'left', indent: 1 },
  center: { vertical: 'middle', horizontal: 'center' },
  right: { vertical: 'middle', horizontal: 'right', indent: 1 },
  wrap: { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 },
};

const colLetter = (n) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const setWidths = (sheet, widths) => {
  sheet.columns = widths.map((width) => ({ width }));
};

/**
 * Standard Merged Title & Subtitle banner
 */
const addTitle = (sheet, lastCol, title, subtitle) => {
  const end = colLetter(lastCol);
  sheet.mergeCells(`A1:${end}1`);
  const t = sheet.getCell('A1');
  t.value = title;
  t.font = font({ size: 18, bold: true, color: { argb: C.ink } });
  t.fill = solid(C.cardBg);
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(1).height = 34;

  sheet.mergeCells(`A2:${end}2`);
  const s = sheet.getCell('A2');
  s.value = subtitle;
  s.font = font({ size: 11, bold: true, color: { argb: C.ink } });
  s.fill = solid(C.mint);
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 22;
};

/**
 * KPI Info Strip
 */
const addInfoStrip = (sheet, labelRow, items) => {
  items.forEach(({ from, to, label, value, numFmt, align = 'left', valueColor = C.ink }) => {
    const a = `${colLetter(from)}${labelRow}`;
    const b = `${colLetter(from)}${labelRow + 1}`;
    if (to > from) {
      sheet.mergeCells(`${a}:${colLetter(to)}${labelRow}`);
      sheet.mergeCells(`${b}:${colLetter(to)}${labelRow + 1}`);
    }
    const lc = sheet.getCell(a);
    lc.value = label;
    lc.font = font({ size: 11, bold: true, color: { argb: C.muted } });
    lc.alignment = { vertical: 'bottom', horizontal: align === 'left' ? 'left' : align, indent: align === 'left' ? 1 : 0 };

    const vc = sheet.getCell(b);
    vc.value = value;
    if (numFmt) vc.numFmt = numFmt;
    vc.font = font({ size: 13, bold: true, color: { argb: valueColor } });
    vc.alignment = { vertical: 'middle', horizontal: align === 'left' ? 'left' : align, indent: align === 'left' ? 1 : 0 };

    for (let c = from; c <= to; c += 1) {
      [labelRow, labelRow + 1].forEach((r) => {
        const cell = sheet.getCell(r, c);
        cell.fill = solid(C.cardBg);
        cell.border = {
          top: r === labelRow ? line(C.border) : undefined,
          bottom: r === labelRow + 1 ? line(C.border) : undefined,
          left: c === from ? line(C.border) : undefined,
          right: c === to ? line(C.border) : undefined,
        };
      });
    }
  });
  sheet.getRow(labelRow).height = 18;
  sheet.getRow(labelRow + 1).height = 26;
};

const setupPage = (sheet, headerRowNum, landscape = true) => {
  sheet.pageSetup = {
    orientation: landscape ? 'landscape' : 'portrait',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    printTitlesRow: `1:${headerRowNum}`,
  };
  sheet.headerFooter.oddFooter = '&L&8SCOTO SYSTEC PRIVATE LIMITED&C&8Page &P of &N&R&8&D';
};

/**
 * Reusable Category Breakdown Sheet Builder (Used in both comprehensive ledger & monthly reconciliation)
 */
const addCategoryBreakdownWorksheet = (workbook, transactions, scopeLabel, totalDebits) => {
  const catMap = new Map();
  transactions.forEach((tx) => {
    const isCredit = tx.isCredit || String(tx.TransactionType).toUpperCase() === 'CREDIT';
    if (!isCredit) {
      const cat = tx.Category || 'Other';
      const prev = catMap.get(cat) || { count: 0, amount: 0 };
      catMap.set(cat, {
        count: prev.count + 1,
        amount: prev.amount + Number(tx.Amount || 0),
      });
    }
  });

  const catList = Array.from(catMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.amount - a.amount);

  if (catList.length === 0) return;

  const sheet = workbook.addWorksheet('Category_Breakdown', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: C.tealAccent } },
  });

  setWidths(sheet, [8, 32, 20, 24, 20]);

  addTitle(
    sheet,
    5,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `OFFICE EXPENSE CATEGORY DISTRIBUTION — ${scopeLabel.toUpperCase()}`
  );

  addInfoStrip(sheet, 3, [
    { from: 1, to: 2, label: 'TOTAL EXPENSE CATEGORIES', value: `${catList.length} Categories`, align: 'left' },
    { from: 3, to: 5, label: 'TOTAL DEBIT OUTFLOW (₹)', value: totalDebits, numFmt: MONEY, valueColor: C.debitText, align: 'right' },
  ]);
  sheet.getRow(5).height = 10;

  const cHeadRow = sheet.getRow(6);
  cHeadRow.values = [
    'Rank',
    'Expense Category',
    'Vouchers / Bills',
    'Total Spent (₹)',
    'Share of Total Expenses',
  ];
  cHeadRow.height = 28;
  cHeadRow.eachCell((cell, col) => {
    cell.fill = solid(C.tableHeader);
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center', indent: col === 2 ? 1 : 0 };
    cell.border = allBorders(C.white);
  });

  catList.forEach((c, idx) => {
    const share = totalDebits > 0 ? c.amount / totalDebits : 0;
    const catPal = getCategoryPalette(c.category);

    const row = sheet.addRow([
      idx + 1,
      c.category,
      c.count,
      c.amount,
      share,
    ]);
    row.height = 25;

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = font({ size: 11 });
      cell.border = allBorders(C.borderSoft);
      if (idx % 2 === 1) cell.fill = solid(C.zebra);

      if (col === 1) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: C.muted } });
      } else if (col === 2) {
        // Category Cell formatted with screen matching background & colored bold text
        cell.font = font({ size: 11, bold: true, color: { argb: catPal.text } });
        cell.fill = solid(catPal.bg);
        cell.alignment = ALIGN.left;
      } else if (col === 3) {
        cell.alignment = ALIGN.center;
        cell.numFmt = INT;
        cell.font = font({ size: 11, bold: true });
      } else if (col === 4) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        cell.font = font({ size: 11, bold: true, color: { argb: C.debitText } });
      } else if (col === 5) {
        cell.alignment = ALIGN.right;
        cell.numFmt = PCT;
        cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
      }
    });
  });

  // Category Total row
  const cTotalRow = sheet.addRow([
    'TOTAL',
    'TOTAL ACROSS ALL CATEGORIES',
    transactions.filter((tx) => !tx.isCredit && String(tx.TransactionType).toUpperCase() !== 'CREDIT').length,
    totalDebits,
    totalDebits > 0 ? 1 : 0,
  ]);
  cTotalRow.height = 28;
  sheet.mergeCells(cTotalRow.number, 1, cTotalRow.number, 2);

  cTotalRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = solid(C.totalBg);
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.border = {
      top: line(C.ink, 'medium'),
      bottom: line(C.ink, 'double'),
      left: line(C.borderSoft),
      right: line(C.borderSoft),
    };
    if (col <= 2) {
      cell.alignment = ALIGN.left;
    } else if (col === 3) {
      cell.alignment = ALIGN.center;
      cell.numFmt = INT;
    } else if (col === 4) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.debitText } });
    } else {
      cell.alignment = ALIGN.right;
      cell.numFmt = PCT;
    }
  });

  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 5 } };
  setupPage(sheet, 6, false);
};

// =============================================================================
// 1. PETTY CASH LEDGER & CASH-FLOW AUDIT WORKBOOK
// =============================================================================
export const exportPettyCashLedgerExcel = async ({
  transactions = [],
  openingBalance = 0,
  totalReceived = 0,
  totalExpenses = 0,
  availableBalance = 0,
  scopeLabel = 'Comprehensive Ledger',
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scoto ERP';
  workbook.lastModifiedBy = 'Scoto ERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ---------------------------------------------------------------------------
  // SHEET 1: PETTY CASH LEDGER
  // ---------------------------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Petty_Cash_Ledger', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 6, xSplit: 3 }],
    properties: { tabColor: { argb: C.creditGreen } },
  });

  // 11 Columns with comfortable widths for 11pt font
  setWidths(sheet1, [8, 14, 13, 24, 10, 28, 18, 18, 22, 28, 16]);

  addTitle(
    sheet1,
    11,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `PETTY CASH LEDGER & RUNNING CASH-FLOW STATEMENT — ${scopeLabel.toUpperCase()}`
  );

  addInfoStrip(sheet1, 3, [
    { from: 1, to: 3, label: 'BROUGHT FORWARD / OPENING BALANCE', value: Number(openingBalance || 0), numFmt: MONEY, valueColor: C.text, align: 'right' },
    { from: 4, to: 5, label: 'TOTAL INFLOW / CREDITS (+)', value: Number(totalReceived || 0), numFmt: MONEY, valueColor: C.creditText, align: 'right' },
    { from: 6, to: 7, label: 'TOTAL EXPENSES / DEBITS (-)', value: Number(totalExpenses || 0), numFmt: MONEY, valueColor: C.debitText, align: 'right' },
    { from: 8, to: 11, label: 'AVAILABLE / CLOSING BALANCE', value: Number(availableBalance || 0), numFmt: MONEY, valueColor: C.runningText, align: 'right' },
  ]);

  sheet1.getRow(5).height = 10;

  // Header Row
  const headRow = sheet1.getRow(6);
  headRow.values = [
    'S.No',
    'Date',
    'Type',
    'Category',
    'Qty',
    'Party / Particulars Details',
    'Credit Inflow (+₹)',
    'Debit Expense (-₹)',
    'Cumulative Balance (₹)',
    'Remarks / Voucher Note',
    'Recorded By',
  ];
  headRow.height = 28;
  headRow.eachCell((cell, col) => {
    cell.fill = solid(
      col <= 3 ? C.tableHeader :
        col <= 6 ? C.brandNavy :
          col === 7 ? C.creditGreen :
            col === 8 ? C.debitRose :
              col === 9 ? C.brandIndigo : C.tableHeader
    );
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorders(C.white);
  });

  let sumCredits = 0;
  let sumDebits = 0;

  transactions.forEach((tx, idx) => {
    const isCredit = tx.isCredit || String(tx.TransactionType).toUpperCase() === 'CREDIT';
    const amt = Number(tx.Amount || 0);
    if (isCredit) sumCredits += amt;
    else sumDebits += amt;

    const party = isCredit
      ? (tx.ReceivedFrom || 'Owner / Management')
      : (tx.ReceiverName || '-');

    const catPal = getCategoryPalette(tx.Category || 'Other');

    const row = sheet1.addRow([
      idx + 1,
      tx.TransactionDate,
      isCredit ? 'CREDIT' : 'DEBIT',
      tx.Category || (isCredit ? 'Cash Inflow' : 'Office Expense'),
      tx.Quantity ? Number(tx.Quantity) : '-',
      party,
      isCredit ? amt : 0,
      !isCredit ? amt : 0,
      Number(tx.runningBalance !== undefined ? tx.runningBalance : 0),
      tx.Remarks || '-',
      tx.CreatedBy || '-',
    ]);
    row.height = 25;

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = font({ size: 11 });
      cell.border = allBorders(C.borderSoft);
      if (idx % 2 === 1) cell.fill = solid(C.zebra);

      if (col === 1) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: C.muted } });
      } else if (col === 2) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: C.text } });
      } else if (col === 3) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: isCredit ? C.creditText : C.debitText } });
        cell.fill = solid(isCredit ? C.creditSoft : C.debitSoft);
      } else if (col === 4) {
        cell.alignment = ALIGN.left;
        if (!isCredit) {
          cell.font = font({ size: 11, bold: true, color: { argb: catPal.text } });
          cell.fill = solid(catPal.bg);
        } else {
          cell.font = font({ size: 11, bold: true, color: { argb: C.creditText } });
          cell.fill = solid(C.creditSoft);
        }
      } else if (col === 5) {
        cell.alignment = ALIGN.center;
        if (cell.value !== '-') cell.numFmt = INT;
      } else if (col === 6) {
        cell.alignment = ALIGN.left;
        cell.font = font({ size: 11, bold: true, color: { argb: isCredit ? C.creditText : C.text } });
      } else if (col === 7) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (isCredit) {
          cell.font = font({ size: 11, bold: true, color: { argb: C.creditText } });
          cell.fill = solid(C.creditSoft);
        }
      } else if (col === 8) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (!isCredit) {
          cell.font = font({ size: 11, bold: true, color: { argb: C.debitText } });
          cell.fill = solid(C.debitSoft);
        }
      } else if (col === 9) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        cell.font = font({ size: 11, bold: true, color: { argb: C.runningText } });
        cell.fill = solid(C.runningBg);
      } else if (col === 10) {
        cell.alignment = ALIGN.left;
        cell.font = font({ size: 11, bold: true, italic: true, color: { argb: C.text } });
      } else if (col === 11) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: C.text } });
      }
    });
  });

  // Table Total Row
  const totalRow = sheet1.addRow([
    'TOTAL',
    'CUMULATIVE TRANSACTIONS SUMMARY',
    '',
    '',
    '',
    '',
    sumCredits,
    sumDebits,
    availableBalance,
    '',
    '',
  ]);
  totalRow.height = 28;
  sheet1.mergeCells(totalRow.number, 1, totalRow.number, 6);

  totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = solid(C.totalBg);
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.border = {
      top: line(C.ink, 'medium'),
      bottom: line(C.ink, 'double'),
      left: line(C.borderSoft),
      right: line(C.borderSoft),
    };
    if (col <= 6) {
      cell.alignment = ALIGN.left;
    } else if (col === 7) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.creditText } });
    } else if (col === 8) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.debitText } });
    } else if (col === 9) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.runningText } });
    } else {
      cell.alignment = ALIGN.center;
    }
  });

  if (transactions.length > 0) {
    sheet1.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 11 } };
  }
  setupPage(sheet1, 6, true);

  // ---------------------------------------------------------------------------
  // SHEET 2: EXPENSE CATEGORY BREAKDOWN
  // ---------------------------------------------------------------------------
  addCategoryBreakdownWorksheet(workbook, transactions, scopeLabel, sumDebits);

  await saveWorkbook(workbook, `SCOTO_Petty_Cash_Ledger_${new Date().toISOString().split('T')[0]}`);
};

// =============================================================================
// 2. PETTY CASH MONTHLY RECONCILIATION EXCEL EXPORT (With Category Breakdown)
// =============================================================================
export const exportMonthlyReconciliationExcel = async ({
  monthlyReportData,
  reportMonth,
  reportYear,
}) => {
  if (!monthlyReportData) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scoto ERP';
  workbook.lastModifiedBy = 'Scoto ERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[(reportMonth || 1) - 1];
  const periodLabel = `${monthName} ${reportYear}`;

  // ---------------------------------------------------------------------------
  // SHEET 1: MONTHLY RECONCILIATION STATEMENT
  // ---------------------------------------------------------------------------
  const sheet = workbook.addWorksheet('Monthly_Reconciliation', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 6 }],
    properties: { tabColor: { argb: C.tealAccent } },
  });

  setWidths(sheet, [8, 14, 13, 24, 28, 18, 18, 22]);

  addTitle(
    sheet,
    8,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `PETTY CASH MONTHLY RECONCILIATION STATEMENT — ${periodLabel.toUpperCase()}`
  );

  const opening = Number(monthlyReportData.opening_balance || 0);
  const received = Number(monthlyReportData.funds_received || 0);
  const expenses = Number(monthlyReportData.total_expenses || 0);
  const closing = Number(monthlyReportData.closing_balance || 0);

  addInfoStrip(sheet, 3, [
    { from: 1, to: 2, label: 'OPENING BALANCE (B/F)', value: opening, numFmt: MONEY, align: 'right' },
    { from: 3, to: 4, label: 'TOTAL RECEIVED (+)', value: received, numFmt: MONEY, valueColor: C.creditText, align: 'right' },
    { from: 5, to: 6, label: 'TOTAL EXPENSES (-)', value: expenses, numFmt: MONEY, valueColor: C.debitText, align: 'right' },
    { from: 7, to: 8, label: 'CLOSING RECONCILED BALANCE', value: closing, numFmt: MONEY, valueColor: C.runningText, align: 'right' },
  ]);

  sheet.getRow(5).height = 10;

  const headRow = sheet.getRow(6);
  headRow.values = [
    'S.No',
    'Date',
    'Type',
    'Category',
    'Particulars / Party',
    'Credit Inflow (+₹)',
    'Debit Expense (-₹)',
    'Cumulative Balance (₹)',
  ];
  headRow.height = 28;
  headRow.eachCell((cell, col) => {
    cell.fill = solid(
      col <= 3 ? C.tableHeader :
        col <= 5 ? C.brandNavy :
          col === 6 ? C.creditGreen :
            col === 7 ? C.debitRose : C.brandIndigo
    );
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorders(C.white);
  });

  const txs = monthlyReportData.transactions || [];
  let running = opening;

  txs.forEach((tx, idx) => {
    const isCredit = String(tx.TransactionType).toUpperCase() === 'CREDIT';
    const amt = Number(tx.Amount || 0);
    if (isCredit) running += amt;
    else running -= amt;

    const catPal = getCategoryPalette(tx.Category || 'Other');

    const row = sheet.addRow([
      idx + 1,
      tx.TransactionDate,
      isCredit ? 'CREDIT' : 'DEBIT',
      tx.Category || 'Other',
      isCredit ? (tx.ReceivedFrom || 'Management') : (tx.ReceiverName || '-'),
      isCredit ? amt : 0,
      !isCredit ? amt : 0,
      running,
    ]);
    row.height = 25;

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = font({ size: 11 });
      cell.border = allBorders(C.borderSoft);
      if (idx % 2 === 1) cell.fill = solid(C.zebra);

      if (col === 1 || col === 2) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: col === 1 ? C.muted : C.text } });
      } else if (col === 3) {
        cell.alignment = ALIGN.center;
        cell.font = font({ size: 11, bold: true, color: { argb: isCredit ? C.creditText : C.debitText } });
        cell.fill = solid(isCredit ? C.creditSoft : C.debitSoft);
      } else if (col === 4) {
        cell.alignment = ALIGN.left;
        if (!isCredit) {
          cell.font = font({ size: 11, bold: true, color: { argb: catPal.text } });
          cell.fill = solid(catPal.bg);
        } else {
          cell.font = font({ size: 11, bold: true, color: { argb: C.creditText } });
          cell.fill = solid(C.creditSoft);
        }
      } else if (col === 5) {
        cell.alignment = ALIGN.left;
        cell.font = font({ size: 11, bold: true, color: { argb: isCredit ? C.creditText : C.text } });
      } else if (col === 6) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (isCredit) {
          cell.font = font({ size: 11, bold: true, color: { argb: C.creditText } });
          cell.fill = solid(C.creditSoft);
        }
      } else if (col === 7) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (!isCredit) {
          cell.font = font({ size: 11, bold: true, color: { argb: C.debitText } });
          cell.fill = solid(C.debitSoft);
        }
      } else if (col === 8) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        cell.font = font({ size: 11, bold: true, color: { argb: C.runningText } });
        cell.fill = solid(C.runningBg);
      }
    });
  });

  const totRow = sheet.addRow([
    'TOTAL',
    `RECONCILED MONTH TOTALS — ${periodLabel}`,
    '',
    '',
    '',
    received,
    expenses,
    closing,
  ]);
  totRow.height = 28;
  sheet.mergeCells(totRow.number, 1, totRow.number, 5);

  totRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = solid(C.totalBg);
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.border = {
      top: line(C.ink, 'medium'),
      bottom: line(C.ink, 'double'),
      left: line(C.borderSoft),
      right: line(C.borderSoft),
    };
    if (col <= 5) {
      cell.alignment = ALIGN.left;
    } else if (col === 6) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.creditText } });
    } else if (col === 7) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.debitText } });
    } else {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
      cell.font = font({ size: 11, bold: true, color: { argb: C.runningText } });
    }
  });

  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 8 } };
  setupPage(sheet, 6, false);

  // ---------------------------------------------------------------------------
  // SHEET 2: EXPENSE CATEGORY BREAKDOWN (For the reconciled month)
  // ---------------------------------------------------------------------------
  addCategoryBreakdownWorksheet(workbook, txs, periodLabel, expenses);

  await saveWorkbook(workbook, `SCOTO_Monthly_Reconciliation_${monthName}_${reportYear}`);
};
