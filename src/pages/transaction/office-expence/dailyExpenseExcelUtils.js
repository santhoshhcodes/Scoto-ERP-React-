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

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const line = (argb = C.borderSoft, style = 'thin') => ({ style, color: { argb } });
const allBorders = (argb = C.borderSoft) => ({
  top: line(argb),
  left: line(argb),
  bottom: line(argb),
  right: line(argb),
});

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
 * Executive KPI strip (small grey label, bold value)
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
  sheet.getRow(labelRow).height = 16;
  sheet.getRow(labelRow + 1).height = 24;
};

/**
 * Status cell styling (Settled = Green, Unsettled = Amber)
 */
const statusStyle = (cell, status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'SETTLED' || s === 'PAID') {
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

// =============================================================================
// MAIN EXPORT: ITEM-WISE & VENDOR-WISE DETAILED OFFICE EXPENSE AUDIT WORKBOOK
// =============================================================================
export const exportDailyOfficeExpenseExcel = async ({
  registerEntries = [],
  vendorSummaries = [],
  settlementHistory = [],
  filterFromDate = '',
  filterToDate = '',
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scoto ERP';
  workbook.lastModifiedBy = 'Scoto ERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const periodLabel = filterFromDate && filterToDate
    ? `${filterFromDate} to ${filterToDate}`
    : 'Selected Period';

  // Compute Grand Totals across register
  let totalGrandAmount = 0;
  let totalGrandQty = 0;
  let totalSettledAmount = 0;
  let totalUnsettledAmount = 0;

  registerEntries.forEach((e) => {
    const amt = Number(e.amount || 0);
    const qty = Number(e.qty || 0);
    totalGrandAmount += amt;
    totalGrandQty += qty;
    if (String(e.status).toUpperCase() === 'SETTLED') {
      totalSettledAmount += amt;
    } else {
      totalUnsettledAmount += amt;
    }
  });

  // Group register entries by item name
  const itemsMap = new Map();
  registerEntries.forEach((entry) => {
    const key = entry.itemName || 'Uncategorized Item';
    if (!itemsMap.has(key)) {
      itemsMap.set(key, {
        itemName: key,
        category: entry.category || 'Other',
        vendor: entry.vendor || 'General Vendor',
        entries: [],
        subtotalQty: 0,
        subtotalAmount: 0,
        unit: entry.unit || 'units',
        rate: entry.rate || 0,
      });
    }
    const group = itemsMap.get(key);
    group.entries.push(entry);
    group.subtotalQty += Number(entry.qty || 0);
    group.subtotalAmount += Number(entry.amount || 0);
    if (!group.vendor && entry.vendor) group.vendor = entry.vendor;
    if (!group.rate && entry.rate) group.rate = entry.rate;
  });

  const sortedGroups = Array.from(itemsMap.values()).sort((a, b) =>
    b.subtotalAmount - a.subtotalAmount
  );

  // ---------------------------------------------------------------------------
  // SHEET 1: ITEM & VENDOR WISE DETAILED STATEMENT
  // ---------------------------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Item_Wise_Expenses', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: C.tealAccent } },
  });

  // 11 Columns: S.No, Date, Day, Item Name, Category, Vendor, Quantity, Unit, Unit Rate, Amount, Status
  setWidths(sheet1, [7, 13, 11, 24, 18, 22, 10, 10, 14, 16, 14]);

  addTitle(
    sheet1,
    11,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `DAILY OFFICE EXPENSES & BILLS REGISTER — ITEM & VENDOR ITEMIZED STATEMENT (${periodLabel.toUpperCase()})`
  );

  addInfoStrip(sheet1, 3, [
    { from: 1, to: 3, label: 'PERIOD (FROM - TO)', value: periodLabel },
    { from: 4, to: 5, label: 'ITEMS LOGGED', value: `${sortedGroups.length} Active Items` },
    { from: 6, to: 7, label: 'TOTAL CONSUMPTION SPEND', value: totalGrandAmount, numFmt: MONEY, valueColor: C.navy, align: 'right' },
    { from: 8, to: 9, label: 'SETTLED WITH VENDORS', value: totalSettledAmount, numFmt: MONEY, valueColor: C.greenText, align: 'right' },
    { from: 10, to: 11, label: 'OUTSTANDING BILLS', value: totalUnsettledAmount, numFmt: MONEY, valueColor: C.amberText, align: 'right' },
  ]);

  sheet1.getRow(5).height = 10;

  let currentRowIdx = 6;

  // Render each Item Group with Section Header, Table Headers, Data Rows, and Group Subtotal
  sortedGroups.forEach((group, gIdx) => {
    // 1. Group Header Card (Top Banner for the Item & Vendor)
    const headerRow = sheet1.getRow(currentRowIdx);
    sheet1.mergeCells(`A${currentRowIdx}:E${currentRowIdx}`);
    sheet1.mergeCells(`F${currentRowIdx}:H${currentRowIdx}`);
    sheet1.mergeCells(`I${currentRowIdx}:K${currentRowIdx}`);

    const cellTitle = sheet1.getCell(`A${currentRowIdx}`);
    cellTitle.value = `ITEM: ${group.itemName.toUpperCase()}   •   CATEGORY: ${group.category.toUpperCase()}`;
    cellTitle.font = font({ size: 11, bold: true, color: { argb: C.itemHeaderAccent } });
    cellTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const cellVendor = sheet1.getCell(`F${currentRowIdx}`);
    cellVendor.value = `SUPPLIER: ${group.vendor.toUpperCase()}`;
    cellVendor.font = font({ size: 11, bold: true, color: { argb: C.text } });
    cellVendor.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const cellSummary = sheet1.getCell(`I${currentRowIdx}`);
    cellSummary.value = `TOTAL: ₹${group.subtotalAmount.toFixed(2)} (${group.subtotalQty} ${group.unit || 'units'})`;
    cellSummary.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cellSummary.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    for (let c = 1; c <= 11; c += 1) {
      const cell = sheet1.getCell(currentRowIdx, c);
      cell.fill = solid(C.itemHeaderBg);
      cell.border = {
        top: line(C.indigo, 'medium'),
        bottom: line(C.indigo, 'thin'),
        left: c === 1 ? line(C.indigo, 'medium') : undefined,
        right: c === 11 ? line(C.indigo, 'medium') : undefined,
      };
    }
    headerRow.height = 24;
    currentRowIdx += 1;

    // 2. Table Column Headers for this Item
    const colHeaderRow = sheet1.getRow(currentRowIdx);
    colHeaderRow.values = [
      '#',
      'Date',
      'Day',
      'Item Description',
      'Category',
      'Vendor / Supplier',
      'Qty',
      'Unit',
      'Rate (₹)',
      'Total Amount (₹)',
      'Status',
    ];
    colHeaderRow.height = 24;
    colHeaderRow.eachCell((cell, colNum) => {
      cell.fill = solid(colNum <= 3 ? C.slate : colNum <= 6 ? C.slateLight : colNum <= 9 ? C.indigo : C.navy);
      cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = allBorders(C.white);
    });
    currentRowIdx += 1;

    // 3. Transactions under this Item
    group.entries.forEach((e, rIdx) => {
      const d = new Date(e.date);
      const dayName = !isNaN(d.getTime())
        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
        : '-';

      const dataRow = sheet1.getRow(currentRowIdx);
      dataRow.values = [
        rIdx + 1,
        e.date,
        dayName,
        e.itemName,
        e.category || 'Other',
        e.vendor || group.vendor,
        Number(e.qty || 0),
        e.unit || group.unit || 'units',
        Number(e.rate || 0),
        Number(e.amount || 0),
        e.status,
      ];
      dataRow.height = 22;

      dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = font({ size: 11, bold: true });
        cell.border = allBorders(C.borderSoft);
        if (rIdx % 2 === 1) cell.fill = solid(C.zebra);

        if (col === 1 || col === 3) {
          cell.alignment = ALIGN.center;
        } else if (col === 2) {
          cell.alignment = ALIGN.center;
          cell.font = font({ size: 11, bold: true, color: { argb: C.text } });
        } else if (col === 4) {
          cell.alignment = ALIGN.left;
          cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
        } else if (col === 5 || col === 6) {
          cell.alignment = ALIGN.left;
          cell.font = font({ size: 11, bold: true, color: { argb: C.text } });
        } else if (col === 7) {
          cell.alignment = ALIGN.center;
          cell.numFmt = INT;
          cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
        } else if (col === 8) {
          cell.alignment = ALIGN.center;
          cell.font = font({ size: 11, bold: true, color: { argb: C.muted } });
        } else if (col === 9) {
          cell.alignment = ALIGN.right;
          cell.numFmt = MONEY;
          cell.font = font({ size: 11, bold: true, color: { argb: C.text } });
        } else if (col === 10) {
          cell.alignment = ALIGN.right;
          cell.numFmt = MONEY;
          cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
        } else if (col === 11) {
          statusStyle(cell, e.status);
        }
      });

      currentRowIdx += 1;
    });

    // 4. Subtotal Row for this item group
    const subtotalRow = sheet1.getRow(currentRowIdx);
    sheet1.mergeCells(`A${currentRowIdx}:F${currentRowIdx}`);
    const subLabel = sheet1.getCell(`A${currentRowIdx}`);
    subLabel.value = `SUBTOTAL — ${group.itemName.toUpperCase()} (${group.entries.length} Entries)`;
    subLabel.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    subLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

    const subQty = sheet1.getCell(`G${currentRowIdx}`);
    subQty.value = group.subtotalQty;
    subQty.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    subQty.numFmt = INT;
    subQty.alignment = ALIGN.center;

    const subUnit = sheet1.getCell(`H${currentRowIdx}`);
    subUnit.value = group.unit || 'units';
    subUnit.font = font({ size: 11, bold: true, color: { argb: C.muted } });
    subUnit.alignment = ALIGN.center;

    const subRate = sheet1.getCell(`I${currentRowIdx}`);
    subRate.value = '';

    const subAmt = sheet1.getCell(`J${currentRowIdx}`);
    subAmt.value = group.subtotalAmount;
    subAmt.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    subAmt.numFmt = MONEY;
    subAmt.alignment = ALIGN.right;

    const subStatus = sheet1.getCell(`K${currentRowIdx}`);
    subStatus.value = '';

    for (let c = 1; c <= 11; c += 1) {
      const cell = sheet1.getCell(currentRowIdx, c);
      cell.fill = solid(C.subtotalBg);
      cell.border = {
        top: line(C.slate, 'thin'),
        bottom: line(C.slate, 'thin'),
        left: c === 1 ? line(C.slate, 'thin') : undefined,
        right: c === 11 ? line(C.slate, 'thin') : undefined,
      };
    }
    subtotalRow.height = 24;
    currentRowIdx += 1;

    // Blank separator row
    sheet1.getRow(currentRowIdx).height = 10;
    currentRowIdx += 1;
  });

  // 5. Grand Company Total Row at the bottom
  const grandRow = sheet1.getRow(currentRowIdx);
  sheet1.mergeCells(`A${currentRowIdx}:F${currentRowIdx}`);
  const grandLabel = sheet1.getCell(`A${currentRowIdx}`);
  grandLabel.value = 'COMPANY GRAND TOTAL — ALL OFFICE EXPENSES & CONSUMPTION';
  grandLabel.font = font({ size: 11, bold: true, color: { argb: C.ink } });
  grandLabel.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

  const grandQty = sheet1.getCell(`G${currentRowIdx}`);
  grandQty.value = totalGrandQty;
  grandQty.font = font({ size: 12, bold: true, color: { argb: C.ink } });
  grandQty.numFmt = INT;
  grandQty.alignment = ALIGN.center;

  sheet1.getCell(`H${currentRowIdx}`).value = 'Units';
  sheet1.getCell(`I${currentRowIdx}`).value = '';

  const grandAmt = sheet1.getCell(`J${currentRowIdx}`);
  grandAmt.value = totalGrandAmount;
  grandAmt.font = font({ size: 12, bold: true, color: { argb: C.ink } });
  grandAmt.numFmt = MONEY;
  grandAmt.alignment = ALIGN.right;

  sheet1.getCell(`K${currentRowIdx}`).value = '';

  for (let c = 1; c <= 11; c += 1) {
    const cell = sheet1.getCell(currentRowIdx, c);
    cell.fill = solid(C.totalBg);
    cell.border = {
      top: line(C.ink, 'medium'),
      bottom: line(C.ink, 'double'),
      left: c === 1 ? line(C.ink, 'medium') : undefined,
      right: c === 11 ? line(C.ink, 'medium') : undefined,
    };
  }
  grandRow.height = 28;

  setupPage(sheet1, 5, true);

  // ---------------------------------------------------------------------------
  // SHEET 2: VENDOR BILLING & SETTLEMENT SUMMARY
  // ---------------------------------------------------------------------------
  const sheet2 = workbook.addWorksheet('Vendor_Settlement_Summary', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: C.slate } },
  });

  setWidths(sheet2, [8, 26, 20, 16, 20, 20, 20, 16]);

  addTitle(
    sheet2,
    8,
    'SCOTO SYSTEC PRIVATE LIMITED',
    `VENDOR BILLING & SETTLEMENT AUDIT REPORT (${periodLabel.toUpperCase()})`
  );

  addInfoStrip(sheet2, 3, [
    { from: 1, to: 2, label: 'TOTAL VENDORS', value: `${vendorSummaries.length} Vendors` },
    { from: 3, to: 4, label: 'TOTAL BILLED AMOUNT', value: totalGrandAmount, numFmt: MONEY, align: 'right' },
    { from: 5, to: 6, label: 'TOTAL SETTLED (PAID)', value: totalSettledAmount, numFmt: MONEY, valueColor: C.greenText, align: 'right' },
    { from: 7, to: 8, label: 'OUTSTANDING TO SETTLE', value: totalUnsettledAmount, numFmt: MONEY, valueColor: C.amberText, align: 'right' },
  ]);

  sheet2.getRow(5).height = 10;

  // Header row for sheet 2
  const vHeadRow = sheet2.getRow(6);
  vHeadRow.values = [
    'Rank',
    'Vendor / Supplier Name',
    'Category',
    'Units Supplied',
    'Total Billed (₹)',
    'Settled Amount (₹)',
    'Outstanding Due (₹)',
    'Settlement Status',
  ];
  vHeadRow.height = 26;
  vHeadRow.eachCell((cell, col) => {
    cell.fill = solid(col <= 3 ? C.slate : col === 4 ? C.slateLight : col <= 7 ? C.softTeal : C.slate);
    cell.font = font({
  bold: true,
  color: { argb: C.ink },
});
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorders(C.white);
  });

  let vSumQty = 0;
  let vSumBilled = 0;
  let vSumSettled = 0;
  let vSumDue = 0;

  vendorSummaries.forEach((v, idx) => {
    const billed = Number(v.totalAmount || 0);
    const settled = Number(v.settledAmount || 0);
    const due = Number(v.unsettledAmount || 0);
    const qty = Number(v.totalItems || 0);

    vSumQty += qty;
    vSumBilled += billed;
    vSumSettled += settled;
    vSumDue += due;

    const row = sheet2.addRow([
      idx + 1,
      v.vendor,
      v.category || 'Other',
      qty,
      billed,
      settled,
      due,
      due <= 0 ? 'SETTLED' : 'PENDING DUE',
    ]);
    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = font();
      cell.border = allBorders(C.borderSoft);
      if (idx % 2 === 1) cell.fill = solid(C.zebra);

      if (col === 1) {
        cell.alignment = ALIGN.center;
      } else if (col === 2) {
        cell.font = font({ bold: true, color: { argb: C.ink } });
        cell.alignment = ALIGN.left;
      } else if (col === 3) {
        cell.alignment = ALIGN.left;
      } else if (col === 4) {
        cell.alignment = ALIGN.center;
        cell.numFmt = INT;
      } else if (col >= 5 && col <= 7) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
        if (col === 5) cell.font = font({ bold: true, color: { argb: C.ink } });
        if (col === 6) cell.font = font({ bold: true, color: { argb: C.greenText } });
        if (col === 7 && due > 0) cell.font = font({ bold: true, color: { argb: C.amberText } });
      } else if (col === 8) {
        statusStyle(cell, due <= 0 ? 'SETTLED' : 'PENDING');
      }
    });
  });

  // Total row for Sheet 2
  const vTotalRow = sheet2.addRow([
    'TOTAL',
    'TOTAL ACROSS ALL VENDORS',
    '',
    vSumQty,
    vSumBilled,
    vSumSettled,
    vSumDue,
    vSumDue <= 0 ? 'ALL SETTLED' : 'PENDING DUES',
  ]);
  vTotalRow.height = 26;
  sheet2.mergeCells(vTotalRow.number, 1, vTotalRow.number, 2);

  vTotalRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = solid(C.totalBg);
    cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
    cell.border = {
      top: line(C.ink, 'medium'),
      bottom: line(C.ink, 'double'),
      left: line(C.borderSoft),
      right: line(C.borderSoft),
    };
    if (col <= 3) {
      cell.alignment = ALIGN.left;
    } else if (col === 4) {
      cell.alignment = ALIGN.center;
      cell.numFmt = INT;
    } else if (col >= 5 && col <= 7) {
      cell.alignment = ALIGN.right;
      cell.numFmt = MONEY;
    } else {
      cell.alignment = ALIGN.center;
    }
  });

  if (vendorSummaries.length > 0) {
    sheet2.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 8 } };
  }
  setupPage(sheet2, 6, true);

  // ---------------------------------------------------------------------------
  // SHEET 3: SETTLEMENT PAYMENT HISTORY (If available)
  // ---------------------------------------------------------------------------
  if (settlementHistory && settlementHistory.length > 0) {
    const sheet3 = workbook.addWorksheet('Settlement_Payment_Register', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
      properties: { tabColor: { argb: C.greenText } },
    });

    setWidths(sheet3, [8, 14, 24, 16, 18, 16, 16, 20, 24]);

    addTitle(
      sheet3,
      9,
      'SCOTO SYSTEC PRIVATE LIMITED',
      `VENDOR PAYMENT & SETTLEMENT DISBURSEMENT REGISTER (${periodLabel.toUpperCase()})`
    );

    let sumSettledDisbursed = 0;
    settlementHistory.forEach((s) => {
      sumSettledDisbursed += Number(s.amount || 0);
    });

    addInfoStrip(sheet3, 3, [
      { from: 1, to: 3, label: 'TOTAL SETTLEMENTS', value: `${settlementHistory.length} Payments` },
      { from: 4, to: 6, label: 'PERIOD SCOPE', value: periodLabel },
      { from: 7, to: 9, label: 'TOTAL DISBURSED (₹)', value: sumSettledDisbursed, numFmt: MONEY, valueColor: C.navy, align: 'right' },
    ]);

    sheet3.getRow(5).height = 10;

    const sHeadRow = sheet3.getRow(6);
    sHeadRow.values = [
      'S.No',
      'Paid Date',
      'Vendor / Supplier',
      'Period Month',
      'Amount Paid (₹)',
      'Payment Method',
      'Petty Cash Ref',
      'Reference / Bill No',
      'Remarks',
    ];
    sHeadRow.height = 26;
    sHeadRow.eachCell((cell, col) => {
      cell.fill = solid(col <= 4 ? C.slate : col === 5 ? C.indigo : C.navy);
      cell.font = font({
  bold: true,
  color: { argb: C.ink },
});
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = allBorders(C.white);
    });

    settlementHistory.forEach((s, idx) => {
      const amt = Number(s.amount || 0);
      const row = sheet3.addRow([
        idx + 1,
        s.paymentDate,
        s.vendor,
        s.periodMonth,
        amt,
        s.paymentMethod || 'Cash',
        s.ledgerTransactionId ? `Tx #${s.ledgerTransactionId}` : '-',
        s.reference || '-',
        s.remarks || '-',
      ]);
      row.height = 22;

      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = font();
        cell.border = allBorders(C.borderSoft);
        if (idx % 2 === 1) cell.fill = solid(C.zebra);

        if (col === 1 || col === 2 || col === 4) {
          cell.alignment = ALIGN.center;
        } else if (col === 3) {
          cell.font = font({ bold: true, color: { argb: C.ink } });
          cell.alignment = ALIGN.left;
        } else if (col === 5) {
          cell.alignment = ALIGN.right;
          cell.numFmt = MONEY;
          cell.font = font({ bold: true, color: { argb: C.ink } });
        } else if (col === 6 || col === 7) {
          cell.alignment = ALIGN.center;
        } else {
          cell.alignment = ALIGN.left;
        }
      });
    });

    const sTotalRow = sheet3.addRow([
      'TOTAL',
      'TOTAL SETTLEMENT DISBURSEMENTS',
      '',
      '',
      sumSettledDisbursed,
      '',
      '',
      '',
      '',
    ]);
    sTotalRow.height = 26;
    sheet3.mergeCells(sTotalRow.number, 1, sTotalRow.number, 4);
    sTotalRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = solid(C.totalBg);
      cell.font = font({ size: 11, bold: true, color: { argb: C.ink } });
      cell.border = {
        top: line(C.ink, 'medium'),
        bottom: line(C.ink, 'double'),
        left: line(C.borderSoft),
        right: line(C.borderSoft),
      };
      if (col <= 4) {
        cell.alignment = ALIGN.left;
      } else if (col === 5) {
        cell.alignment = ALIGN.right;
        cell.numFmt = MONEY;
      } else {
        cell.alignment = ALIGN.center;
      }
    });

    sheet3.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 9 } };
    setupPage(sheet3, 6, true);
  }

  const cleanDateRange = `${filterFromDate || 'start'}_to_${filterToDate || 'end'}`.replace(/[^a-zA-Z0-9_]/g, '_');
  await saveWorkbook(workbook, `SCOTO_Daily_Office_Expenses_${cleanDateRange}`);
};
