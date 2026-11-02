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
// THEME (Strictly Matched to SCOTO ERP Web UI)
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

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const line = (argb = C.borderSoft, style = 'thin') => ({ style, color: { argb } });
const allBorders = (argb = C.borderSoft) => ({
  top: line(argb),
  left: line(argb),
  bottom: line(argb),
  right: line(argb),
});

const font = (o = {}) => ({ name: FONT, size: 11, bold: true, color: { argb: C.text }, ...o });

// Currency: zero shows as "–" so real values stand out
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

/** Merged title / subtitle block */
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

/** Label (small, grey) above value (bold) – "info card" strip */
const addInfoStrip = (sheet, labelRow, items) => {
  items.forEach(({ from, to, label, value, numFmt, align = 'left' }) => {
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
    vc.font = font({ size: 13, bold: true, color: { argb: C.ink } });
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
  sheet.getRow(labelRow + 1).height = 24;
};

/** Coloured group band above a header row, e.g. "EXPENSE BREAKDOWN" */
const addBand = (sheet, rowNum, bands) => {
  bands.forEach(({ from, to, label, fill }) => {
    if (to > from) sheet.mergeCells(rowNum, from, rowNum, to);
    for (let c = from; c <= to; c += 1) {
      const cell = sheet.getCell(rowNum, c);
      cell.fill = solid(fill);
      cell.border = allBorders(C.white);
    }
    const cell = sheet.getCell(rowNum, from);
    cell.value = label;
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.alignment = ALIGN.center;
  });
  sheet.getRow(rowNum).height = 18;
};

/** Header row; fills can be per-column via fillFor(colNum) */
const addHeader = (sheet, rowNum, headers, fillFor, height = 30) => {
  const row = sheet.getRow(rowNum);
  row.values = headers;
  row.height = height;
  row.eachCell((cell, colNum) => {
    cell.fill = solid(fillFor(colNum));
    cell.font = font({
  bold: true,
  color: { argb: C.ink },
});
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = allBorders(C.white);
  });
  return row;
};

const styleBodyRow = (row, isZebra, perCol) => {
  row.height = 22;
  row.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.font = font();
    cell.border = allBorders(C.borderSoft);
    if (isZebra) cell.fill = solid(C.zebra);
    perCol(cell, colNum);
  });
};

const styleTotalRow = (row, perCol) => {
  row.height = 26;
  row.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.fill = solid(C.totalBg);
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.border = {
      top: line(C.ink, 'thin'),
      bottom: line(C.ink, 'double'),
      left: line(C.borderSoft),
      right: line(C.borderSoft),
    };
    perCol(cell, colNum);
  });
};

const statusStyle = (cell, status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'PAID' || s === 'SETTLED' || s === 'APPROVED') {
    cell.font = font({ bold: true, color: { argb: C.greenText } });
    cell.fill = solid(C.greenBg);
  } else if (s === 'REJECTED' || s === 'CANCELLED') {
    cell.font = font({ bold: true, color: { argb: C.roseText } });
    cell.fill = solid(C.roseBg);
  } else {
    cell.font = font({ bold: true, color: { argb: C.amberText } });
    cell.fill = solid(C.amberBg);
  }
  cell.alignment = ALIGN.center;
};

const addDataBar = (sheet, ref, argb) => {
  sheet.addConditionalFormatting({
    ref,
    rules: [
      {
        type: 'dataBar',
        gradient: false,
        showValue: true,
        cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
        color: { argb },
      },
    ],
  });
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

const EXPENSE_HEAD_FILL = C.blue;

// =============================================================================
// WORKBOOK 1: EXECUTIVE TRAVEL EXPENSE AUDIT REPORT (3 sheets)
// =============================================================================
export const exportExecutiveTravelExcel = async ({
  overallSummary = {},
  staffSummaryList = [],
  claims = [],
  categoriesSummaryList = [],
  periodLabel = 'Overall',
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scoto ERP';
  workbook.lastModifiedBy = 'Scoto ERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const totalCompanySpend = Number(overallSummary.total_amount || 0);

  // ---------------------------------------------------------------------------
  // SHEET 1: EXECUTIVE SCORECARD
  // ---------------------------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Executive_Scorecard', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 7, xSplit: 3 }],
    properties: { tabColor: { argb: C.tealAccent } },
  });
  setWidths(sheet1, [8, 13, 26, 20, 9, 16, 16, 18, 16, 16, 20, 16]);

  addTitle(
    sheet1,
    12,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `TRAVEL EXPENSE AUDIT REPORT — ${periodLabel.toUpperCase()}`
  );

  addInfoStrip(sheet1, 3, [
    { from: 1, to: 3, label: 'GENERATED ON', value: new Date().toLocaleString('en-IN') },
    { from: 4, to: 6, label: 'SCOPE', value: periodLabel },
    { from: 7, to: 9, label: 'TOTAL SPEND', value: totalCompanySpend, numFmt: '"₹"#,##0.00' },
    { from: 10, to: 12, label: 'TOTAL CLAIMS', value: Number(overallSummary.claim_count || 0), numFmt: '#,##0' },
  ]);
  sheet1.getRow(5).height = 8;

  addBand(sheet1, 6, [
    { from: 1, to: 4, label: 'EMPLOYEE', fill: C.slate },
    { from: 5, to: 5, label: 'TRIPS', fill: C.slateLight },
    { from: 6, to: 10, label: 'EXPENSE BREAKDOWN', fill: C.softTeal },
    { from: 11, to: 12, label: 'TOTAL', fill: C.softTeal },
  ]);

  addHeader(
    sheet1,
    7,
    [
      'Rank',
      'Emp Code',
      'Employee Name',
      'Department',
      'Trips',
      'Petrol (₹)',
      'Food (₹)',
      'Bus / Transit (₹)',
      'Room Stay (₹)',
      'Other Misc (₹)',
      'Total Spend (₹)',
      'Budget Share',
    ],
    (c) => (c <= 4 ? C.slate : c === 5 ? C.slateLight : c <= 10 ? EXPENSE_HEAD_FILL : C.navy)
  );

  let sumTrips = 0;
  let sumPetrol = 0;
  let sumFood = 0;
  let sumBus = 0;
  let sumRoom = 0;
  let sumOther = 0;

  staffSummaryList.forEach((staff, idx) => {
    const staffTotal = Number(staff.total_amount || 0);
    const trips = Number(staff.claim_count || 0);
    const petrol = Number(staff.petrol_amount || 0);
    const food = Number(staff.food_amount || 0);
    const bus = Number(staff.bus_ticket_amount || 0);
    const room = Number(staff.room_amount || 0);
    const other = Number(staff.other_amount || 0);
    const share = totalCompanySpend > 0 ? staffTotal / totalCompanySpend : 0;

    sumTrips += trips;
    sumPetrol += petrol;
    sumFood += food;
    sumBus += bus;
    sumRoom += room;
    sumOther += other;

    const row = sheet1.addRow([
      idx + 1,
      staff.employee_code,
      staff.employee_name,
      staff.department_name || '-',
      trips,
      petrol,
      food,
      bus,
      room,
      other,
      staffTotal,
      share,
    ]);

    styleBodyRow(row, idx % 2 === 1, (cell, col) => {
      if (col === 1) {
        cell.alignment = ALIGN.center;
      } else if (col === 2) {
        cell.font = font({ bold: true, color: { argb: C.text } });
        cell.alignment = ALIGN.center;
      } else if (col === 3) {
        cell.font = font({ bold: true, color: { argb: C.ink } });
        cell.alignment = ALIGN.left;
      } else if (col === 4) {
        cell.alignment = ALIGN.left;
      } else if (col === 5) {
        cell.alignment = ALIGN.center;
        cell.numFmt = INT;
      } else if (col >= 6 && col <= 11) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (col === 11) cell.font = font({ bold: true, color: { argb: C.ink } });
      } else if (col === 12) {
        cell.alignment = ALIGN.right;
        cell.numFmt = PCT;
      }
    });
  });

  const firstData1 = 8;
  const lastData1 = 7 + staffSummaryList.length;

  const totalRow1 = sheet1.addRow([
    'TOTAL',
    '',
    'COMPANY TOTAL',
    '',
    sumTrips,
    sumPetrol,
    sumFood,
    sumBus,
    sumRoom,
    sumOther,
    totalCompanySpend,
    totalCompanySpend > 0 ? 1 : 0,
  ]);
  sheet1.mergeCells(totalRow1.number, 1, totalRow1.number, 2);
  styleTotalRow(totalRow1, (cell, col) => {
    if (col <= 4) {
      cell.alignment = ALIGN.left;
    } else if (col === 5) {
      cell.alignment = ALIGN.center;
      cell.numFmt = INT;
    } else if (col >= 6 && col <= 11) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
    } else {
      cell.alignment = ALIGN.right;
      cell.numFmt = PCT;
    }
  });

  if (staffSummaryList.length > 0) {
    sheet1.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7, column: 12 } };
    addDataBar(sheet1, `L${firstData1}:L${lastData1}`, 'FF93C5FD');
  }
  setupPage(sheet1, 7);

  // ---------------------------------------------------------------------------
  // SHEET 2: ITEMIZED TRIPS
  // ---------------------------------------------------------------------------
  const sheet2 = workbook.addWorksheet('Itemized_Trips', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5, xSplit: 5 }],
    properties: { tabColor: { argb: C.slate } },
  });
  setWidths(sheet2, [11, 13, 13, 12, 24, 24, 20, 30, 15, 15, 15, 15, 15, 18, 13, 18]);

  addTitle(
    sheet2,
    16,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `ITEMIZED TRAVEL CLAIM REGISTER — ${periodLabel.toUpperCase()}`
  );
  sheet2.getRow(3).height = 8;

  addBand(sheet2, 4, [
    { from: 1, to: 3, label: 'CLAIM & DATES', fill: C.slateLight },
    { from: 4, to: 5, label: 'EMPLOYEE', fill: C.slate },
    { from: 6, to: 8, label: 'TRIP DETAILS', fill: C.slateLight },
    { from: 9, to: 14, label: 'AMOUNTS', fill: C.softTeal },
    { from: 15, to: 16, label: 'SETTLEMENT', fill: C.slate },
  ]);

  addHeader(
    sheet2,
    5,
    [
      'Claim ID',
      'Start Date',
      'End Date',
      'Emp Code',
      'Employee Name',
      'Client / Customer',
      'Destination',
      'Purpose of Visit',
      'Petrol (₹)',
      'Food (₹)',
      'Bus (₹)',
      'Room (₹)',
      'Other (₹)',
      'Total (₹)',
      'Status',
      'Petty Cash Ref',
    ],
    (c) => (c <= 3 ? C.slateLight : c <= 5 ? C.slate : c <= 8 ? C.slateLight : c <= 13 ? EXPENSE_HEAD_FILL : c === 14 ? C.softTeal : C.slate)
  );

  claims.forEach((c, idx) => {
    const isPaid = c.status === 'PAID';
    const row = sheet2.addRow([
      c.claim_id,
      c.travel_start_date,
      c.travel_end_date,
      c.employee_code,
      c.employee_name,
      c.client_name || '-',
      c.destination,
      c.purpose,
      Number(c.petrol_amount || 0),
      Number(c.food_amount || 0),
      Number(c.bus_ticket_amount || 0),
      Number(c.room_amount || 0),
      Number(c.other_amount || 0),
      Number(c.total_amount || 0),
      c.status,
      c.expense_id ? `Voucher #${c.expense_id}` : (isPaid ? 'Settled' : 'Pending'),
    ]);

    styleBodyRow(row, idx % 2 === 1, (cell, col) => {
      if (col === 1 || col === 2 || col === 3) {
        cell.alignment = ALIGN.center;
      } else if (col === 4) {
        cell.font = font({ bold: true, color: { argb: C.text } });
        cell.alignment = ALIGN.center;
      } else if (col >= 5 && col <= 8) {
        cell.alignment = ALIGN.wrap;
        if (col === 5) cell.font = font({ bold: true, color: { argb: C.ink } });
      } else if (col >= 9 && col <= 14) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (col === 14) cell.font = font({ bold: true, color: { argb: C.ink } });
      } else if (col === 15) {
        statusStyle(cell, c.status);
      } else {
        cell.alignment = ALIGN.center;
      }
    });
  });

  if (claims.length > 0) {
    sheet2.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: 16 } };
  }
  setupPage(sheet2, 5);

  // ---------------------------------------------------------------------------
  // SHEET 3: CATEGORY DISTRIBUTION
  // ---------------------------------------------------------------------------
  const sheet3 = workbook.addWorksheet('Category_Distribution', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 3 }],
    properties: { tabColor: { argb: C.blue } },
  });
  setWidths(sheet3, [30, 14, 22, 20]);

  addTitle(
    sheet3,
    4,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `EXPENSE CATEGORY DISTRIBUTION — ${periodLabel.toUpperCase()}`
  );

  addHeader(
    sheet3,
    3,
    ['Expense Category', 'Item Count', 'Total Amount (₹)', 'Share of Total'],
    (c) => (c === 1 ? C.slate : c === 2 ? C.slateLight : C.navy),
    28
  );

  categoriesSummaryList.forEach((cat, idx) => {
    const amt = Number(cat.total_amount || 0);
    const count = Number(cat.item_count || 0);
    const share = totalCompanySpend > 0 ? amt / totalCompanySpend : 0;

    const row = sheet3.addRow([cat.expense_category, count, amt, share]);
    styleBodyRow(row, idx % 2 === 1, (cell, col) => {
      if (col === 1) {
        cell.font = font({ bold: true, color: { argb: C.ink } });
        cell.alignment = ALIGN.left;
      } else if (col === 2) {
        cell.alignment = ALIGN.center;
        cell.numFmt = INT;
      } else if (col === 3) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
      } else {
        cell.alignment = ALIGN.right;
        cell.numFmt = PCT;
      }
    });
  });

  if (categoriesSummaryList.length > 0) {
    addDataBar(sheet3, `D4:D${3 + categoriesSummaryList.length}`, 'FF93C5FD');
  }
  setupPage(sheet3, 3, false);

  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  await saveWorkbook(workbook, `SCOTO_Travel_Expense_Report_${cleanPeriod}`);
};

// =============================================================================
// WORKBOOK 2: INDIVIDUAL STAFF TRAVEL STATEMENT
// =============================================================================
export const exportStaffTravelExcel = async ({
  staff = {},
  claims = [],
  periodLabel = 'Overall',
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scoto ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Travel_Statement', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 11 }],
    properties: { tabColor: { argb: C.tealAccent } },
  });
  // Amount columns (G..L) line up with the summary cards above the table
  setWidths(sheet, [11, 13, 13, 24, 20, 28, 15, 15, 15, 15, 15, 19]);

  addTitle(
    sheet,
    12,
    'SCOTO SYSTEC PRIVATE LIMITED',
    'INDIVIDUAL TRAVEL EXPENSE AUDIT STATEMENT'
  );

  // Employee info strip (rows 3-4)
  addInfoStrip(sheet, 3, [
    { from: 1, to: 4, label: 'EMPLOYEE', value: `${staff.employee_name} (${staff.employee_code})` },
    { from: 5, to: 6, label: 'DEPARTMENT', value: staff.department_name || 'Operations' },
    { from: 7, to: 9, label: 'PERIOD', value: periodLabel },
    { from: 10, to: 12, label: 'STATEMENT DATE', value: new Date().toLocaleDateString('en-IN') },
  ]);
  sheet.getRow(5).height = 8;

  // Totals summary cards (rows 6-7) – aligned over the matching table columns
  const cards = [
    { from: 1, to: 6, label: 'TRIPS COMPLETED', value: Number(staff.claim_count || 0), numFmt: '#,##0' },
    { from: 7, to: 7, label: 'PETROL (₹)', value: Number(staff.petrol_amount || 0), numFmt: MONEY, align: 'right' },
    { from: 8, to: 8, label: 'FOOD (₹)', value: Number(staff.food_amount || 0), numFmt: MONEY, align: 'right' },
    { from: 9, to: 9, label: 'BUS / TRANSIT (₹)', value: Number(staff.bus_ticket_amount || 0), numFmt: MONEY, align: 'right' },
    { from: 10, to: 10, label: 'ROOM STAY (₹)', value: Number(staff.room_amount || 0), numFmt: MONEY, align: 'right' },
    { from: 11, to: 11, label: 'OTHER MISC (₹)', value: Number(staff.other_amount || 0), numFmt: MONEY, align: 'right' },
    { from: 12, to: 12, label: 'TOTAL DISBURSED (₹)', value: Number(staff.total_amount || 0), numFmt: MONEY, align: 'right' },
  ];
  addInfoStrip(sheet, 6, cards);
  // Emphasise the grand total card
  const grand = sheet.getCell('L7');
  grand.fill = solid(C.totalBg);
  grand.font = font({ size: 13, bold: true, color: { argb: C.ink } });
  sheet.getRow(7).height = 28;
  sheet.getRow(8).height = 10;

  // Section title (row 9)
  sheet.mergeCells('A9:L9');
  const sec = sheet.getCell('A9');
  sec.value = 'RECORDED CLIENT VISITS & TRAVEL EXPENSES';
  sec.font = font({ size: 11, bold: true, color: { argb: C.ink } });
  sec.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sec.border = { bottom: line(C.navy, 'medium') };
  sheet.getRow(9).height = 24;

  addBand(sheet, 10, [
    { from: 1, to: 3, label: 'CLAIM & DATES', fill: C.slateLight },
    { from: 4, to: 6, label: 'TRIP DETAILS', fill: C.slate },
    { from: 7, to: 11, label: 'EXPENSE BREAKDOWN', fill: C.softTeal },
    { from: 12, to: 12, label: 'TOTAL', fill: C.softTeal },
  ]);

  addHeader(
    sheet,
    11,
    [
      'Claim ID',
      'Start Date',
      'End Date',
      'Client / Customer',
      'Destination',
      'Purpose',
      'Petrol (₹)',
      'Food (₹)',
      'Bus (₹)',
      'Room (₹)',
      'Other (₹)',
      'Total Claim (₹)',
    ],
    (c) => (c <= 3 ? C.slateLight : c <= 6 ? C.slate : c <= 11 ? EXPENSE_HEAD_FILL : C.navy)
  );

  const staffClaims = claims.filter((c) => c.employee_code === staff.employee_code);

  staffClaims.forEach((c, idx) => {
    const row = sheet.addRow([
      c.claim_id,
      c.travel_start_date,
      c.travel_end_date,
      c.client_name || '-',
      c.destination,
      c.purpose,
      Number(c.petrol_amount || 0),
      Number(c.food_amount || 0),
      Number(c.bus_ticket_amount || 0),
      Number(c.room_amount || 0),
      Number(c.other_amount || 0),
      Number(c.total_amount || 0),
    ]);

    styleBodyRow(row, idx % 2 === 1, (cell, col) => {
      if (col <= 3) {
        cell.alignment = ALIGN.center;
      } else if (col <= 6) {
        cell.alignment = ALIGN.wrap;
      } else {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (col === 12) cell.font = font({ bold: true, color: { argb: C.ink } });
      }
    });
  });

  if (staffClaims.length > 0) {
    sheet.autoFilter = { from: { row: 11, column: 1 }, to: { row: 11, column: 12 } };
  }

  // Signature block (line above each label)
  const sigRow = sheet.rowCount + 4;
  sheet.getRow(sigRow).height = 22;
  [
    { from: 1, to: 3, label: 'Prepared By' },
    { from: 5, to: 7, label: 'Employee Signature' },
    { from: 9, to: 12, label: 'Authorized By' },
  ].forEach(({ from, to, label }) => {
    sheet.mergeCells(sigRow, from, sigRow, to);
    for (let c = from; c <= to; c += 1) {
      sheet.getCell(sigRow, c).border = { top: line(C.ink) };
    }
    const cell = sheet.getCell(sigRow, from);
    cell.value = label;
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.alignment = { vertical: 'top', horizontal: 'center' };
  });

  setupPage(sheet, 11);

  const cleanName = String(staff.employee_name || '').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  await saveWorkbook(workbook, `SCOTO_Travel_${staff.employee_code}_${cleanName}_${cleanPeriod}`);
};