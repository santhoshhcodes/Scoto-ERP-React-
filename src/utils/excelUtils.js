import * as XLSX from 'xlsx';

/**
 * Formats a duration in minutes into a clean "Xh Ym" or "Ym" format.
 * If minutes >= 60, format as "Xh Ym" (e.g., 70 -> "1h 10m", 120 -> "2h 0m", 60 -> "1h 0m").
 * If minutes < 60, format as "Ym" (e.g., 45 -> "45m", 15 -> "15m").
 * Handles 0, null, undefined gracefully with fallback (default '0m').
 *
 * @param {number|string} minutes
 * @param {string} fallback
 * @returns {string}
 */
export const formatMinutesToHM = (minutes, fallback = '0m') => {
  if (minutes === null || minutes === undefined || minutes === '' || isNaN(Number(minutes))) {
    return fallback;
  }
  const totalMins = Math.round(Number(minutes));
  if (totalMins <= 0) return fallback;

  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Exports JSON data to an styled/clean Excel file (.xlsx)
 * @param {Array<Object>} data - Array of row objects
 * @param {string} fileName - Destination filename (without .xlsx extension)
 * @param {string} sheetName - Worksheet name
 */
export const exportToExcel = (data, fileName = 'export', sheetName = 'Sheet1') => {
  if (!data || !data.length) {
    throw new Error('No data available to export.');
  }

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const keys = Object.keys(data[0] || {});
  const colWidths = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write and download
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Reads an uploaded Excel/CSV file and parses it into JSON rows
 * @param {File} file - Browser File object
 * @returns {Promise<Array<Object>>}
 */
export const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (err) {
        reject(new Error('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls or .csv file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from disk.'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Generates and downloads a sample Excel template
 * @param {Array<Object>} sampleRows - Array of example row objects
 * @param {string} fileName - File name
 * @param {string} sheetName - Sheet name
 */
export const downloadExcelTemplate = (sampleRows, fileName = 'template', sheetName = 'Template') => {
  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const keys = Object.keys(sampleRows[0] || {});
  worksheet['!cols'] = keys.map((key) => ({
    wch: Math.max(key.length + 6, 16),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_Template.xlsx`);
};

import ExcelJS from 'exceljs';

/**
 * Helper to download an ExcelJS workbook in the browser
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

/**
 * Format date nicely to e.g. "01-Sep-2026" or "Sep 01 2026"
 */
const formatReportDateStr = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const day = String(d.getDate()).padStart(2, '0');
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      return `${day}-${mon}-${yr}`;
    }
  } catch { }
  return dateStr;
};

/**
 * Resolves Date Range string like "Sep 01 2026 To Sep 30 2026"
 */
const resolveDateRange = (meta = {}, employee = null) => {
  if (meta.start_date && meta.end_date) {
    return `${meta.start_date} To ${meta.end_date}`;
  }
  if (meta.from_date && meta.to_date) {
    return `${meta.from_date} To ${meta.to_date}`;
  }
  if (meta.date_range_str) {
    return meta.date_range_str;
  }
  const days =
    (employee && employee.days) ||
    (meta.employees && meta.employees[0]?.days) ||
    [];
  if (days.length > 0) {
    const dStart = days[0].date || days[0].date_str;
    const dEnd = days[days.length - 1].date || days[days.length - 1].date_str;
    if (dStart && dEnd) {
      return `${formatReportDateStr(dStart)} To ${formatReportDateStr(dEnd)}`;
    }
  }
  return 'Monthly Attendance Report';
};

/**
 * Resolves Printed On timestamp e.g. "Oct 01 2026 11:23"
 */
const resolvePrintedOn = (meta = {}) => {
  if (meta.printed_on) return meta.printed_on;
  const now = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const m = months[now.getMonth()];
  const d = String(now.getDate()).padStart(2, '0');
  const y = now.getFullYear();
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${m} ${d} ${y} ${hrs}:${mins}`;
};

const darkBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};



/**
 * Helper to parse daily attendance details into structured columns:
 * Status, Leave/Over-Leave, Permission Hours, Late Coming, Fine Amount, Cleaned Remarks
 */
export const parseDayDetails = (day = {}, employeeMeta = {}) => {
  const remarks = String(day.remarks || '').trim();
  const status = String(day.status || 'Present').trim();
  const statusLower = status.toLowerCase();
  const remLower = remarks.toLowerCase();

  // 1. Detection of On Duty & On Site
  const isOnDuty =
    status === 'On Duty' ||
    status === 'ON_DUTY' ||
    status === 'OD' ||
    statusLower === 'on duty' ||
    statusLower === 'on-duty' ||
    statusLower.includes('on duty') ||
    remLower.includes('on duty') ||
    remLower.includes('on-duty');

  const isOnSite =
    Boolean(day.is_on_site || day.is_on_field) ||
    status === 'Onsite' ||
    status === 'On-Site' ||
    status === 'ON_SITE' ||
    status === 'Onfield' ||
    status === 'On-Field' ||
    status === 'ON_FIELD' ||
    statusLower === 'on site' ||
    statusLower === 'on-site' ||
    statusLower === 'onsite' ||
    statusLower.includes('on site') ||
    statusLower.includes('onsite') ||
    remLower.includes('on-site') ||
    remLower.includes('onsite');

  // 1b. Detection of Work From Home (WFH)
  const isWfh =
    status === 'WFH' ||
    status === 'WORK_FROM_HOME' ||
    statusLower === 'wfh' ||
    statusLower === 'work from home' ||
    statusLower.includes('work from home') ||
    statusLower.includes('wfh') ||
    remLower.includes('wfh') ||
    remLower.includes('work from home');

  // 1c. Detection of Holiday & Weekly Off
  const isHoliday =
    status === 'Holiday' ||
    statusLower === 'holiday' ||
    statusLower.includes('holiday') ||
    remLower.includes('holiday') ||
    Boolean(day.is_holiday);

  const isWeeklyOff =
    status === 'WeeklyOff' ||
    status === 'WO' ||
    statusLower === 'weeklyoff' ||
    statusLower === 'wo' ||
    statusLower.includes('weekly') ||
    Boolean(day.is_weekly_off) ||
    (() => {
      const dStr = day.date || day.date_str || day.iso_date || '';
      if (dStr) {
        try {
          const dt = new Date(dStr);
          return !isNaN(dt.getTime()) && dt.getDay() === 0;
        } catch {
          return false;
        }
      }
      return false;
    })();

  // 2. Waived penalty flag
  const isWaived =
    day.fine_status === 'WAIVED' ||
    day.is_waived === true ||
    remLower.includes('waived') ||
    remLower.includes('waive');

  const inTimeStr = String(day.in_time || '').trim();
  const outTimeStr = String(day.out_time || '').trim();
  const hasInPunch = Boolean(inTimeStr && inTimeStr !== '--:--' && inTimeStr !== '-');
  const hasOutPunch = Boolean(outTimeStr && outTimeStr !== '--:--' && outTimeStr !== '-');
  const isCheckoutOnly = !hasInPunch && hasOutPunch;
  const isMissingOutPunch = hasInPunch && !hasOutPunch;

  // 3. Late Minutes (Preserve and show minutes even when penalty is waived)
  // Crucial eSSL rule: if employee had checkout only (no in-punch), do NOT penalize as late!
  let lateMins = 0;
  if (!isCheckoutOnly) {
    if (day.late_minutes !== undefined && day.late_minutes !== null && day.late_minutes !== '') {
      lateMins = Number(day.late_minutes) || 0;
    } else if (day.late_mins !== undefined && day.late_mins !== null) {
      lateMins = Number(day.late_mins) || 0;
    }
    if (!lateMins && remLower.includes('late:')) {
      const m = remarks.match(/Late:\s*(\d+)\s*mins?/i);
      if (m) lateMins = parseInt(m[1], 10);
    }
  }

  // 4. Permission Minutes & Hours
  let permMins = 0;
  if (day.permission_minutes !== undefined && day.permission_minutes !== null && day.permission_minutes !== '') {
    permMins = Number(day.permission_minutes) || 0;
  } else if (day.permission_mins !== undefined && day.permission_mins !== null) {
    permMins = Number(day.permission_mins) || 0;
  }
  if (!permMins && remLower.includes('permission:')) {
    const m = remarks.match(/Permission:\s*(\+?\d+)\s*mins?/i);
    if (m) {
      permMins = parseInt(m[1], 10);
    } else {
      const mHr = remarks.match(/Permission:\s*(\d+(?:\.\d+)?)\s*hrs?/i);
      if (mHr) permMins = Math.round(parseFloat(mHr[1]) * 60);
    }
  }
  if (!permMins && remLower.includes('late perm:')) {
    const m = remarks.match(/Late Perm:\s*(\d+)m?/i);
    if (m) permMins = parseInt(m[1], 10);
  }

  // Fallback calculate late minutes if not explicitly provided:
  // - Morning Grace Period: up to 09:40 AM is on time. After 09:40 AM, late minutes calculated from 09:40 AM.
  // - Morning Permission: grace period does not apply. Calculated after 09:30 AM + permission_minutes.
  if (!lateMins && hasInPunch && !isCheckoutOnly && !isWfh && !isOnDuty && !isOnSite && !isHoliday && !isWeeklyOff) {
    const [inH, inM] = inTimeStr.split(':').map(Number);
    if (!isNaN(inH) && !isNaN(inM)) {
      const inTotalMins = inH * 60 + inM;
      if (permMins > 0) {
        const permittedInMins = (9 * 60 + 30) + permMins;
        if (inTotalMins > permittedInMins) {
          lateMins = inTotalMins - permittedInMins;
        }
      } else {
        const graceCutoffMins = 9 * 60 + 40; // 09:40 AM
        if (inTotalMins > graceCutoffMins) {
          lateMins = inTotalMins - graceCutoffMins;
        }
      }
    }
  }

  // 5. Fine Amount & Fine Confirmed Flag (Waived penalty is never counted as confirmed fine)
  let fineAmt = 0;
  if (day.fine_amount !== undefined && day.fine_amount !== null && day.fine_amount !== '') {
    fineAmt = Number(day.fine_amount) || 0;
  } else if (day.fine !== undefined && day.fine !== null) {
    fineAmt = Number(day.fine) || 0;
  }
  if (!fineAmt && !isWaived && (remLower.includes('fine') || remLower.includes('₹') || remLower.includes('inr'))) {
    const m = remarks.match(/Fine(?: Confirmed)?[:\s]*(?:₹|INR|Rs\.?)\s*(\d+)/i) || remarks.match(/(?:₹|INR|Rs\.?)\s*(\d+)/i);
    if (m) fineAmt = parseInt(m[1], 10);
  }
  const isFineConfirmed =
    !isWaived &&
    (fineAmt > 0 ||
      day.fine_status === 'CONFIRMED' ||
      remLower.includes('fine confirmed') ||
      (remLower.includes('fine') && !remLower.includes('waived') && !remLower.includes('no fine')));

  // 6. Leave & Over-Leave categorization
  const isLop =
    status === 'LOP' ||
    statusLower.includes('loss of pay') ||
    remLower.includes('loss of pay') ||
    remLower === 'lop';

  const isAbsent =
    status === 'Absent' ||
    statusLower === 'absent' ||
    statusLower.includes('absent');

  const isHalfDay =
    statusLower.includes('half') ||
    remLower.includes('half day');

  const isCasualLeave =
    status === 'Casual Leave' ||
    status === 'Leave' ||
    statusLower.includes('casual leave') ||
    (statusLower.includes('leave') && !isLop);

  const isCompOff =
    statusLower.includes('comp') ||
    remLower.includes('comp off');

  let isOverLeave = false;
  let leaveDisplay = '--';

  if (isHoliday) {
    leaveDisplay = day.holiday_name || 'Holiday';
  } else if (isLop) {
    leaveDisplay = 'LOP';
    isOverLeave = true;
  } else if (isAbsent) {
    leaveDisplay = 'Absent (Over)';
    isOverLeave = true;
  } else if (isCasualLeave) {
    leaveDisplay = 'CL';
  } else if (isCompOff) {
    leaveDisplay = 'Comp Off';
  } else if (isHalfDay) {
    leaveDisplay = 'Half Day';
  }

  // 7. Compact / Short Form Values
  let statusDisplay = status;
  if (isWfh) {
    statusDisplay = 'WFH';
  } else if (isOnDuty) {
    statusDisplay = 'On Duty';
  } else if (isOnSite) {
    statusDisplay = 'On Site';
  } else if (isHoliday) {
    statusDisplay = 'Holiday';
  } else if (status === 'Present (No OutPunch)') {
    statusDisplay = 'Present*';
  } else if (status === 'WeeklyOff' || status === 'WO') {
    statusDisplay = 'WO';
  } else if (isAbsent) {
    statusDisplay = 'Absent';
  } else if (isLop) {
    statusDisplay = 'LOP';
  }

  let permDisplay = '--';
  if (permMins > 0) {
    permDisplay = formatMinutesToHM(permMins);
  }

  let lateDisplay = '--';
  if (lateMins > 0) {
    const formattedLate = formatMinutesToHM(lateMins);
    lateDisplay = isWaived ? `${formattedLate} (Waived)` : formattedLate;
  }

  let fineDisplay = '--';
  if (isWaived) {
    fineDisplay = 'Waived';
  } else if (fineAmt > 0) {
    fineDisplay = `₹${fineAmt}`;
  } else if (isFineConfirmed) {
    fineDisplay = 'Fine';
  }

  // Cleaned remarks: strip duplicate inline tags so remarks stay concise
  let cleanedRemarks = remarks
    .replace(/Late:\s*\d+\s*mins?/gi, '')
    .replace(/Permission:\s*\+?\d+(?:\.\d+)?\s*(?:mins?|hrs?)/gi, '')
    .replace(/Late Perm:\s*\d+\s*mins?/gi, '')
    .replace(/Late Perm:\s*\d+m/gi, '')
    .replace(/Early Exit:\s*\d+m?/gi, '')
    .replace(/Early Perm:\s*\d+m?/gi, '')
    .replace(/Fine Confirmed(?:\s*\([₹INRRs.\d]+\))?/gi, '')
    .replace(/Fine Pending/gi, '')
    .replace(/Fine Waived/gi, '')
    .replace(/Fine:\s*[₹INRRs.\d]+/gi, '')
    .replace(/\|\s*\|/g, '|')
    .replace(/^[\s|,-]+|[\s|,-]+$/g, '')
    .trim();

  // Early exit & early permission evaluation:
  // Crucial rules:
  // 1. If out punch was NOT recorded (missing out punch), NEVER mark as early exit!
  // 2. Regular employee closing time is 19:30 (7:30 PM).
  // 3. Designated employee closing time is 18:45 (6:45 PM) or custom assigned time.
  // 4. If employee has permission (e.g. 30m, 45m, 60m, 120m), allowed departure time is shifted earlier:
  //    allowedDeparture = assignedClosing - earlyPermission.
  // 5. Exiting at or after allowedDeparture is ON TIME (0m early exit, ₹0 fine).
  let earlyExitMins = 0;
  let isEarlyExit = false;

  let earlyPermMins = 0;
  if (day.early_permission_minutes !== undefined && day.early_permission_minutes !== null && day.early_permission_minutes !== '') {
    earlyPermMins = Number(day.early_permission_minutes) || 0;
  }
  if (!earlyPermMins && remLower.includes('early perm:')) {
    const m = remarks.match(/Early Perm:\s*(\d+)m/i);
    if (m) earlyPermMins = parseInt(m[1], 10);
  }

  if (day.early_exit_minutes !== undefined && day.early_exit_minutes !== null && day.early_exit_minutes !== '') {
    earlyExitMins = Number(day.early_exit_minutes) || 0;
    isEarlyExit = earlyExitMins > 0;
  } else if (remLower.includes('early exit:')) {
    const m = remarks.match(/Early Exit:\s*(\d+)m/i);
    if (m) {
      earlyExitMins = parseInt(m[1], 10);
      isEarlyExit = earlyExitMins > 0;
    }
  } else if (hasOutPunch && !isWfh && !isOnDuty && !isOnSite && !isHoliday && !isWeeklyOff) {
    let schedTime = day.scheduled_checkout || employeeMeta.scheduled_checkout || employeeMeta.shift_end_time;
    if (!schedTime && employeeMeta.getEmployeeCheckoutTime) {
      schedTime = employeeMeta.getEmployeeCheckoutTime(day.employee_code || employeeMeta.employee_code);
    }
    if (!schedTime) {
      schedTime = '19:30';
    }
    const [schedH, schedM] = schedTime.split(':').map(Number);
    const schedTotalMins = (isNaN(schedH) ? 19 : schedH) * 60 + (isNaN(schedM) ? 30 : schedM);

    // Evening Early-Exit Permission: calculate permitted checkout from actual office closing time (18:30 / 6:30 PM = 1110 mins).
    // e.g. 30m permission -> allowed exit from 18:00 (6:00 PM). Exits before 18:00 receive early exit penalty.
    // Without evening permission: employees must follow assigned checkout time (19:30 or 18:45).
    const baseExitMins = earlyPermMins > 0 ? (18 * 60 + 30) : schedTotalMins;
    const allowedExitMins = Math.max(0, baseExitMins - earlyPermMins);

    const [outH, outM] = outTimeStr.split(':').map(Number);
    if (!isNaN(outH) && !isNaN(outM)) {
      const outTotalMins = outH * 60 + outM;
      if (outTotalMins < allowedExitMins) {
        earlyExitMins = allowedExitMins - outTotalMins;
        isEarlyExit = earlyExitMins > 0;
      }
    }
  }

  let earlyExitDisplay = '--';
  if (earlyExitMins > 0) {
    const formattedEarly = formatMinutesToHM(earlyExitMins);
    earlyExitDisplay = isWaived ? `${formattedEarly} (Waived)` : formattedEarly;
  }

  let earlyPermDisplay = '--';
  if (earlyPermMins > 0) {
    earlyPermDisplay = formatMinutesToHM(earlyPermMins);
  }

  return {
    lateMins,
    lateDisplay,
    isWaived,
    permMins,
    permDisplay,
    earlyExitMins,
    earlyExitDisplay,
    earlyPermMins,
    earlyPermDisplay,
    fineAmt,
    fineDisplay,
    isFineConfirmed,
    leaveDisplay,
    isOverLeave,
    isLop,
    isAbsent,
    isCasualLeave,
    isHalfDay,
    isOnDuty,
    isOnSite,
    isHoliday,
    isWeeklyOff,
    statusDisplay,
    hasInPunch,
    hasOutPunch,
    isCheckoutOnly,
    isMissingOutPunch,
    isEarlyExit,
    cleanedRemarks: cleanedRemarks || remarks,
  };
};

/**
 * Export a Single Employee's Monthly Day-by-Day Attendance Report in structured format
 * with separate columns for Present, Leave/Over-Leave, Permission Hours, Late Coming, and Fine Amount (Red Highlighted)
 */
export const exportETimeTrackLiteIndividualReport = async (employee, meta = {}) => {
  if (!employee || !employee.days) {
    throw new Error('Employee attendance data is missing.');
  }

  const company = meta.company_name || employee.company_name || 'SCOTO';
  const dateRangeStr = resolveDateRange(meta, employee);
  const printedOn = resolvePrintedOn(meta);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance_Summary', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Compact columns with short forms
  worksheet.columns = [
    { key: 'col1', width: 12 },  // Date
    { key: 'col2', width: 8 },   // In
    { key: 'col3', width: 8 },   // Out
    { key: 'col4', width: 8 },   // Shift
    { key: 'col5', width: 9 },   // Total
    { key: 'col6', width: 11 },  // Status (Present / On Duty / On Site / WO / Absent)
    { key: 'col7', width: 12 },  // Leave / LOP
    { key: 'col8', width: 12 },  // Late
    { key: 'col9', width: 10 },  // Late Perm
    { key: 'col10', width: 12 }, // Early Exit
    { key: 'col11', width: 10 }, // Early Perm
    { key: 'col12', width: 11 }, // Fine
    { key: 'col13', width: 22 }, // Remarks
  ];

  let currRow = 1;

  // Row 1: Title (Centered, Bold)
  worksheet.mergeCells(`A${currRow}:M${currRow}`);
  const titleCell = worksheet.getCell(`A${currRow}`);
  titleCell.value = 'Daily Attendance Report (Summary Report)';
  titleCell.font = { name: 'Arial', size: 12, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currRow++;

  // Row 2: Date Range (Centered)
  worksheet.mergeCells(`A${currRow}:M${currRow}`);
  const dateRangeCell = worksheet.getCell(`A${currRow}`);
  dateRangeCell.value = dateRangeStr;
  dateRangeCell.font = { name: 'Arial', size: 10, bold: false };
  dateRangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currRow++;

  // Row 3: Company & Printed On
  worksheet.getCell(`A${currRow}`).value = 'Company:';
  worksheet.getCell(`A${currRow}`).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getCell(`B${currRow}`).value = company;
  worksheet.getCell(`B${currRow}`).font = { name: 'Arial', size: 10, bold: false };

  worksheet.mergeCells(`H${currRow}:M${currRow}`);
  const printCell = worksheet.getCell(`H${currRow}`);
  printCell.value = `Printed On : ${printedOn}`;
  printCell.font = { name: 'Arial', size: 9, bold: false };
  printCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Bottom border line under Company header
  for (let c = 1; c <= 13; c++) {
    const cell = worksheet.getRow(currRow).getCell(c);
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
    };
  }
  currRow++;

  // Row 4: Blank spacing
  currRow++;

  // Row 5: Employee Code & Employee Name
  worksheet.getCell(`A${currRow}`).value = 'Employee Code:';
  worksheet.getCell(`A${currRow}`).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getCell(`B${currRow}`).value = String(employee.employee_code);
  worksheet.getCell(`B${currRow}`).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getCell(`D${currRow}`).value = 'Employee Name :';
  worksheet.getCell(`D${currRow}`).font = { name: 'Arial', size: 10, bold: true };

  worksheet.mergeCells(`E${currRow}:M${currRow}`);
  const empNameCell = worksheet.getCell(`E${currRow}`);
  empNameCell.value = employee.employee_name;
  empNameCell.font = { name: 'Arial', size: 10, bold: true };
  empNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
  currRow++;

  // Row 6: Table Column Headers (Short Forms, Dark borders around each cell)
  const headers = [
    'Date',
    'In',
    'Out',
    'Shift',
    'Total',
    'Status',
    'Leave / LOP',
    'Late',
    'Late Perm',
    'Early Exit',
    'Early Perm',
    'Fine',
    'Remarks',
  ];
  const headerRow = worksheet.getRow(currRow);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = {
      horizontal: idx < 12 ? 'center' : 'left',
      vertical: 'middle',
    };
    cell.border = darkBorder;
  });
  currRow++;

  let totalPermMins = 0;
  let totalEarlyPermMins = 0;
  let totalEarlyExitMins = 0;
  let totalLateMins = 0;
  let totalFineAmt = 0;
  let finesCount = 0;
  let lateDaysCount = 0;
  let earlyExitDaysCount = 0;
  let permDaysCount = 0;
  let earlyPermDaysCount = 0;
  let overLeaveDaysCount = 0;
  let halfDaysCount = 0;
  let onDutyDaysCount = 0;
  let onSiteDaysCount = 0;

  // Rows 7+: Day by day rows with separated columns & distinct highlights
  (employee.days || []).forEach((day) => {
    const row = worksheet.getRow(currRow);
    const dateVal = formatReportDateStr(day.date || day.date_str);
    const inTime = day.in_time || '';
    const outTime = day.out_time || '';
    const shift = day.shift || 'GS';
    const totalDuration = day.total_duration || day.duration_str || '00:00';
    const status = day.status || 'Present';

    const parsed = parseDayDetails(day, employee);

    if (parsed.isOnDuty) onDutyDaysCount++;
    if (parsed.isOnSite) onSiteDaysCount++;
    if (parsed.permMins > 0) {
      totalPermMins += parsed.permMins;
      permDaysCount++;
    }
    if (parsed.earlyPermMins > 0) {
      totalEarlyPermMins += parsed.earlyPermMins;
      earlyPermDaysCount++;
    }
    if (parsed.lateMins > 0) {
      lateDaysCount++;
      totalLateMins += parsed.lateMins;
    }
    if (parsed.earlyExitMins > 0) {
      earlyExitDaysCount++;
      totalEarlyExitMins += parsed.earlyExitMins;
    }
    if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
      totalFineAmt += parsed.fineAmt;
      finesCount++;
    }
    if (parsed.isOverLeave) {
      overLeaveDaysCount++;
    }
    if (parsed.isHalfDay) {
      halfDaysCount++;
    }

    const rowValues = [
      dateVal,
      inTime,
      outTime,
      shift,
      totalDuration,
      parsed.statusDisplay,
      parsed.leaveDisplay,
      parsed.lateDisplay,
      parsed.permDisplay,
      parsed.earlyExitDisplay,
      parsed.earlyPermDisplay,
      parsed.fineDisplay,
      parsed.cleanedRemarks || '--',
    ];

    rowValues.forEach((val, idx) => {
      const cell = row.getCell(idx + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        horizontal: idx < 12 ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = darkBorder;

      // Color rules for quick identification:

      // 1. Status Column: On Duty (Soft Teal), On Site (Soft Sky Blue), Holiday (Soft Purple), Present (Soft Green), WO (Muted Slate), Absent/LOP (Soft Red)
      if (idx === 5) {
        if (parsed.isOnDuty) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F766E' } };
        } else if (parsed.isOnSite) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } };
        } else if (status === 'Holiday' || parsed.isHoliday) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
        } else if (status === 'Present' || status === 'Present (No OutPunch)') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } };
        } else if (status === 'WeeklyOff' || status === 'WO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
        } else if (status === 'Absent' || status === 'LOP' || parsed.isAbsent || parsed.isLop) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        }
      }

      // 2. Leave / LOP Column: Highlight Over-Leave in RED, Holiday in Soft Purple!
      if (idx === 6 && parsed.leaveDisplay !== '--') {
        if (parsed.isHoliday) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
        } else if (parsed.isOverLeave) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
        }
      }

      // 3. Late Column: Show minutes even for Waived; highlight Red if fine, Amber if normal late, Slate if waived
      if (idx === 7 && parsed.lateMins > 0) {
        if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
        } else if (parsed.isWaived) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
        }
      }

      // 4. Late Perm Column
      if (idx === 8 && parsed.permMins > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF3730A3' } };
      }

      // 5. Early Exit Column (Bold Red for early exits, slate if waived)
      if (idx === 9 && parsed.earlyExitMins > 0) {
        if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        } else if (parsed.isWaived) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9F1239' } };
        }
      }

      // 6. Early Perm Column
      if (idx === 10 && parsed.earlyPermMins > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
      }

      // 7. Fine Column: RED SHOW HIGHLIGHT for Fines; Soft Green for Waived
      if (idx === 11) {
        if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
        } else if (parsed.isWaived) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
        }
      }
    });

    currRow++;
  });

  // Summary Row: Total Duration, PresentDays, On Duty, On Site, Leaves, Over-Leave, Holiday, AbsentDays, Weekly Off, Late, Early Exit, Permissions, Fines
  const totalDur = employee.total_duration_formatted || employee.total_duration_str || '0 Hrs 0 Min';
  const presentDays = employee.present_days ?? 0;
  const leaves = employee.leaves ?? employee.leave_days ?? 0;
  const holiday = employee.holiday ?? employee.holiday_days ?? 0;
  const absentDays = employee.absent_days ?? 0;
  const weeklyOff = employee.weekly_off ?? employee.weekly_off_days ?? 0;
  const totalPermDuration = totalPermMins > 0 ? formatMinutesToHM(totalPermMins) : '0m';
  const totalEarlyPermDuration = totalEarlyPermMins > 0 ? formatMinutesToHM(totalEarlyPermMins) : '0m';

  const hasAlert = overLeaveDaysCount > 0 || absentDays > 0 || totalFineAmt > 0;

  worksheet.mergeCells(`A${currRow}:M${currRow}`);
  const summaryCell = worksheet.getCell(`A${currRow}`);

  let summaryText = `Total Duration=${totalDur} , PresentDays=${presentDays}`;
  if (onDutyDaysCount > 0) summaryText += ` , On Duty=${onDutyDaysCount}`;
  if (onSiteDaysCount > 0) summaryText += ` , On Site=${onSiteDaysCount}`;
  summaryText += ` , Leaves=${leaves}`;
  if (overLeaveDaysCount > 0) summaryText += ` [Over-Leave=${overLeaveDaysCount}]`;
  summaryText += ` , Holiday=${holiday} , AbsentDays=${absentDays} , Weekly Off=${weeklyOff}`;
  if (lateDaysCount > 0) summaryText += ` , Late Days=${lateDaysCount} (${formatMinutesToHM(totalLateMins)})`;
  if (earlyExitDaysCount > 0) summaryText += ` , Early Exit Days=${earlyExitDaysCount} (${formatMinutesToHM(totalEarlyExitMins)})`;
  if (permDaysCount > 0) summaryText += ` , Late Perms=${permDaysCount} (${totalPermDuration})`;
  if (earlyPermDaysCount > 0) summaryText += ` , Early Perms=${earlyPermDaysCount} (${totalEarlyPermDuration})`;
  if (finesCount > 0) summaryText += ` , Confirmed Fines=${finesCount} (₹${totalFineAmt})`;

  summaryCell.value = summaryText;
  summaryCell.font = {
    name: 'Arial',
    size: 9.5,
    bold: true,
    color: { argb: hasAlert ? 'FF991B1B' : 'FF0F172A' },
  };
  summaryCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: hasAlert ? 'FFFEE2E2' : 'FFF8FAFC' },
  };
  summaryCell.alignment = { horizontal: 'left', vertical: 'middle' };

  for (let c = 1; c <= 13; c++) {
    worksheet.getRow(currRow).getCell(c).border = darkBorder;
  }
  currRow++;

  const cleanName = (employee.employee_name || 'Employee').replace(/[^a-zA-Z0-9_-]/g, '_');
  await saveWorkbook(workbook, `Monthly_Attendance_${employee.employee_code}_${cleanName}`);
};

/**
 * Export All Employees Monthly Attendance Report matching structured multi-block format
 * with separate columns for Present, Leave/Over-Leave, Permission Hours, Late Coming, and Fine Amount (Red Highlighted)
 */
export const exportETimeTrackLiteOverallReport = async (reportData, fileName = 'Daily_Attendance_Report_Summary') => {
  if (!reportData || !reportData.employees || !reportData.employees.length) {
    throw new Error('No employee report data available to export.');
  }

  const company = reportData.company_name || 'SCOTO';
  const dateRangeStr = resolveDateRange(reportData);
  const printedOn = resolvePrintedOn(reportData);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance_Summary', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Compact columns with short forms
  worksheet.columns = [
    { key: 'col1', width: 12 },  // Date
    { key: 'col2', width: 8 },   // In
    { key: 'col3', width: 8 },   // Out
    { key: 'col4', width: 8 },   // Shift
    { key: 'col5', width: 9 },   // Total
    { key: 'col6', width: 11 },  // Status (Present / On Duty / On Site / WO / Absent)
    { key: 'col7', width: 12 },  // Leave / LOP
    { key: 'col8', width: 12 },  // Late
    { key: 'col9', width: 10 },  // Late Perm
    { key: 'col10', width: 12 }, // Early Exit
    { key: 'col11', width: 10 }, // Early Perm
    { key: 'col12', width: 11 }, // Fine
    { key: 'col13', width: 22 }, // Remarks
  ];

  let currRow = 1;

  // Row 1: Title (Centered, Bold)
  worksheet.mergeCells(`A${currRow}:M${currRow}`);
  const titleCell = worksheet.getCell(`A${currRow}`);
  titleCell.value = 'Daily Attendance Report (Summary Report)';
  titleCell.font = { name: 'Arial', size: 12, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currRow++;

  // Row 2: Date Range (Centered)
  worksheet.mergeCells(`A${currRow}:M${currRow}`);
  const dateRangeCell = worksheet.getCell(`A${currRow}`);
  dateRangeCell.value = dateRangeStr;
  dateRangeCell.font = { name: 'Arial', size: 10, bold: false };
  dateRangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currRow++;

  // Row 3: Company & Printed On
  worksheet.getCell(`A${currRow}`).value = 'Company:';
  worksheet.getCell(`A${currRow}`).font = { name: 'Arial', size: 10, bold: true };

  worksheet.getCell(`B${currRow}`).value = company;
  worksheet.getCell(`B${currRow}`).font = { name: 'Arial', size: 10, bold: false };

  worksheet.mergeCells(`H${currRow}:M${currRow}`);
  const printCell = worksheet.getCell(`H${currRow}`);
  printCell.value = `Printed On : ${printedOn}`;
  printCell.font = { name: 'Arial', size: 9, bold: false };
  printCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Bottom border line under Company header
  for (let c = 1; c <= 13; c++) {
    const cell = worksheet.getRow(currRow).getCell(c);
    cell.border = {
      ...cell.border,
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
    };
  }
  currRow++;

  const headers = [
    'Date',
    'In',
    'Out',
    'Shift',
    'Total',
    'Status',
    'Leave / LOP',
    'Late',
    'Late Perm',
    'Early Exit',
    'Early Perm',
    'Fine',
    'Remarks',
  ];

  // For each employee, generate their block
  reportData.employees.forEach((emp) => {
    // Blank row separator before each employee
    currRow++;

    // Employee Code & Employee Name
    worksheet.getCell(`A${currRow}`).value = 'Employee Code:';
    worksheet.getCell(`A${currRow}`).font = { name: 'Arial', size: 10, bold: true };

    worksheet.getCell(`B${currRow}`).value = String(emp.employee_code);
    worksheet.getCell(`B${currRow}`).font = { name: 'Arial', size: 10, bold: true };

    worksheet.getCell(`D${currRow}`).value = 'Employee Name :';
    worksheet.getCell(`D${currRow}`).font = { name: 'Arial', size: 10, bold: true };

    worksheet.mergeCells(`E${currRow}:M${currRow}`);
    const empNameCell = worksheet.getCell(`E${currRow}`);
    empNameCell.value = emp.employee_name;
    empNameCell.font = { name: 'Arial', size: 10, bold: true };
    empNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currRow++;

    // Table Column Headers (Dark borders around each cell)
    const headerRow = worksheet.getRow(currRow);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = {
        horizontal: idx < 12 ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = darkBorder;
    });
    currRow++;

    let totalPermMins = 0;
    let totalEarlyPermMins = 0;
    let totalEarlyExitMins = 0;
    let totalLateMins = 0;
    let totalFineAmt = 0;
    let finesCount = 0;
    let lateDaysCount = 0;
    let earlyExitDaysCount = 0;
    let permDaysCount = 0;
    let earlyPermDaysCount = 0;
    let overLeaveDaysCount = 0;
    let halfDaysCount = 0;
    let onDutyDaysCount = 0;
    let onSiteDaysCount = 0;

    // Day by day rows with separated columns & color highlights
    (emp.days || []).forEach((day) => {
      const row = worksheet.getRow(currRow);
      const dateVal = formatReportDateStr(day.date || day.date_str);
      const inTime = day.in_time || '';
      const outTime = day.out_time || '';
      const shift = day.shift || 'GS';
      const totalDuration = day.total_duration || day.duration_str || '00:00';
      const status = day.status || 'Present';

      const parsed = parseDayDetails(day, emp);

      if (parsed.isOnDuty) onDutyDaysCount++;
      if (parsed.isOnSite) onSiteDaysCount++;
      if (parsed.permMins > 0) {
        totalPermMins += parsed.permMins;
        permDaysCount++;
      }
      if (parsed.earlyPermMins > 0) {
        totalEarlyPermMins += parsed.earlyPermMins;
        earlyPermDaysCount++;
      }
      if (parsed.lateMins > 0) {
        lateDaysCount++;
        totalLateMins += parsed.lateMins;
      }
      if (parsed.earlyExitMins > 0) {
        earlyExitDaysCount++;
        totalEarlyExitMins += parsed.earlyExitMins;
      }
      if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
        totalFineAmt += parsed.fineAmt;
        finesCount++;
      }
      if (parsed.isOverLeave) {
        overLeaveDaysCount++;
      }
      if (parsed.isHalfDay) {
        halfDaysCount++;
      }

      const rowValues = [
        dateVal,
        inTime,
        outTime,
        shift,
        totalDuration,
        parsed.statusDisplay,
        parsed.leaveDisplay,
        parsed.lateDisplay,
        parsed.permDisplay,
        parsed.earlyExitDisplay,
        parsed.earlyPermDisplay,
        parsed.fineDisplay,
        parsed.cleanedRemarks || '--',
      ];

      rowValues.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = {
          horizontal: idx < 12 ? 'center' : 'left',
          vertical: 'middle',
        };
        cell.border = darkBorder;

        // 1. Status Column: On Duty (Soft Teal), On Site (Soft Sky Blue), Holiday (Soft Purple), Present (Soft Green), WO (Muted Slate), Absent/LOP (Soft Red)
        if (idx === 5) {
          if (parsed.isOnDuty) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFBF1' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F766E' } };
          } else if (parsed.isOnSite) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } };
          } else if (status === 'Holiday' || parsed.isHoliday) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
          } else if (status === 'Present' || status === 'Present (No OutPunch)') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } };
          } else if (status === 'WeeklyOff' || status === 'WO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
          } else if (status === 'Absent' || status === 'LOP' || parsed.isAbsent || parsed.isLop) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
          }
        }

        // 2. Leave / LOP Column: Highlight Over-Leave in RED, Holiday in Soft Purple!
        if (idx === 6 && parsed.leaveDisplay !== '--') {
          if (parsed.isHoliday) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
          } else if (parsed.isOverLeave) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
          }
        }

        // 3. Late Column
        if (idx === 7 && parsed.lateMins > 0) {
          if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
          } else if (parsed.isWaived) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
          }
        }

        // 4. Late Perm Column
        if (idx === 8 && parsed.permMins > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF3730A3' } };
        }

        // 5. Early Exit Column (Bold Red for early exits, slate if waived)
        if (idx === 9 && parsed.earlyExitMins > 0) {
          if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
          } else if (parsed.isWaived) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9F1239' } };
          }
        }

        // 6. Early Perm Column
        if (idx === 10 && parsed.earlyPermMins > 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
        }

        // 7. Fine Column
        if (idx === 11) {
          if (parsed.fineAmt > 0 || parsed.isFineConfirmed) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
          } else if (parsed.isWaived) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
          }
        }
      });

      currRow++;
    });

    // Summary Row: Total Duration, PresentDays, On Duty, On Site, Leaves, Over-Leave, Holiday, AbsentDays, Weekly Off, Late, Early Exit, Permissions, Fines
    const totalDur = emp.total_duration_formatted || emp.total_duration_str || '0 Hrs 0 Min';
    const presentDays = emp.present_days ?? 0;
    const leaves = emp.leaves ?? emp.leave_days ?? 0;
    const holiday = emp.holiday ?? emp.holiday_days ?? 0;
    const absentDays = emp.absent_days ?? 0;
    const weeklyOff = emp.weekly_off ?? emp.weekly_off_days ?? 0;
    const totalPermDuration = totalPermMins > 0 ? formatMinutesToHM(totalPermMins) : '0m';
    const totalEarlyPermDuration = totalEarlyPermMins > 0 ? formatMinutesToHM(totalEarlyPermMins) : '0m';

    const hasAlert = overLeaveDaysCount > 0 || absentDays > 0 || totalFineAmt > 0;

    worksheet.mergeCells(`A${currRow}:M${currRow}`);
    const summaryCell = worksheet.getCell(`A${currRow}`);

    let summaryText = `Total Duration=${totalDur} , PresentDays=${presentDays}`;
    if (onDutyDaysCount > 0) summaryText += ` , On Duty=${onDutyDaysCount}`;
    if (onSiteDaysCount > 0) summaryText += ` , On Site=${onSiteDaysCount}`;
    summaryText += ` , Leaves=${leaves}`;
    if (overLeaveDaysCount > 0) summaryText += ` [Over-Leave=${overLeaveDaysCount}]`;
    summaryText += ` , Holiday=${holiday} , AbsentDays=${absentDays} , Weekly Off=${weeklyOff}`;
    if (lateDaysCount > 0) summaryText += ` , Late Days=${lateDaysCount} (${formatMinutesToHM(totalLateMins)})`;
    if (earlyExitDaysCount > 0) summaryText += ` , Early Exit Days=${earlyExitDaysCount} (${formatMinutesToHM(totalEarlyExitMins)})`;
    if (permDaysCount > 0) summaryText += ` , Late Perms=${permDaysCount} (${totalPermDuration})`;
    if (earlyPermDaysCount > 0) summaryText += ` , Early Perms=${earlyPermDaysCount} (${totalEarlyPermDuration})`;
    if (finesCount > 0) summaryText += ` , Confirmed Fines=${finesCount} (₹${totalFineAmt})`;

    summaryCell.value = summaryText;
    summaryCell.font = {
      name: 'Arial',
      size: 9.5,
      bold: true,
      color: { argb: hasAlert ? 'FF991B1B' : 'FF0F172A' },
    };
    summaryCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hasAlert ? 'FFFEE2E2' : 'FFF8FAFC' },
    };
    summaryCell.alignment = { horizontal: 'left', vertical: 'middle' };

    for (let c = 1; c <= 13; c++) {
      worksheet.getRow(currRow).getCell(c).border = darkBorder;
    }
    currRow++;
  });

  await saveWorkbook(workbook, fileName);
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const thinCellBorder = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const formatTimeDisplay = (isoString) => {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      if (typeof isoString === 'string' && isoString.includes(':')) {
        return isoString.slice(0, 5);
      }
      return isoString;
    }
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
};

/**
 * Export Daily Attendance Register to Excel with styled headers & Employee Name column
 */
export const exportDailyAttendanceExcel = async (records = [], targetDate, meta = {}) => {
  if (!records.length) {
    throw new Error('No attendance records available to export for this date.');
  }

  const company = meta.company_name || 'SCOTO';
  const printedOn = resolvePrintedOn(meta);
  const formattedDate = formatReportDateStr(targetDate);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily_Attendance', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Columns specification with prominent Employee Name
  worksheet.columns = [
    { key: 'sno', width: 8 },
    { key: 'emp_code', width: 16 },
    { key: 'emp_name', width: 28 },
    { key: 'source', width: 20 },
    { key: 'date', width: 16 },
    { key: 'in_time', width: 16 },
    { key: 'out_time', width: 16 },
    { key: 'sched_out', width: 16 },
    { key: 'early_mins', width: 18 },
    { key: 'late_mins', width: 14 },
    { key: 'perm_mins', width: 16 },
    { key: 'fine_status', width: 16 },
    { key: 'fine_amount', width: 18 },
    { key: 'work_mins', width: 20 },
    { key: 'status', width: 22 },
    { key: 'review_status', width: 22 },
    { key: 'remarks', width: 30 },
  ];

  let currRow = 1;

  // Row 1: Title (Merged A1:Q1, Navy Blue)
  worksheet.mergeCells(`A${currRow}:Q${currRow}`);
  const titleCell = worksheet.getCell(`A${currRow}`);
  titleCell.value = `${company} - Daily Attendance Register`;
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 28;
  currRow++;

  // Row 2: Subtitle / Metadata (Merged A2:Q2)
  worksheet.mergeCells(`A${currRow}:Q${currRow}`);
  const subCell = worksheet.getCell(`A${currRow}`);
  subCell.value = `Attendance Date: ${formattedDate}  |  Total Workforce: ${records.length}  |  Generated On: ${printedOn}`;
  subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 22;
  currRow++;

  // Row 3: Blank separator
  currRow++;

  // Row 4: Column Headers
  const headers = [
    'S.No',
    'Employee Code',
    'Employee Name',
    'Source / Device',
    'Attendance Date',
    'First Check IN',
    'Last Check OUT',
    'Scheduled OUT',
    'Early Checkout',
    'Late Delay',
    'Permission Duration',
    'Fine Status',
    'Fine Amount (INR)',
    'Total Working Duration',
    'Attendance Status',
    'Confirmation Status',
    'Remarks',
  ];

  const headerRow = worksheet.getRow(currRow);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = {
      horizontal: idx === 0 || idx === 1 || idx === 3 || idx === 4 || idx === 5 || idx === 6 || idx === 7 || idx === 11 || idx === 14 || idx === 15 ? 'center' : idx >= 8 && idx <= 13 ? 'right' : 'left',
      vertical: 'middle',
    };
    cell.border = darkBorder;
  });
  currRow++;

  // Data rows
  let totalPresent = 0;
  let totalFines = 0;

  records.forEach((rec, idx) => {
    const row = worksheet.getRow(currRow);
    row.height = 20;
    const isEven = idx % 2 === 0;

    const schedOut = meta.getEmployeeCheckoutTime ? meta.getEmployeeCheckoutTime(rec.employee_code) : '19:30';
    const firstInStr = rec.first_in ? formatTimeDisplay(rec.first_in) : 'Missing Punch';
    const lastOutStr = rec.last_out && rec.last_out !== rec.first_in ? formatTimeDisplay(rec.last_out) : 'Not Checked Out';
    const earlyMins = rec.early_exit_minutes || rec.early_checkout_mins || 0;
    const fineAmt = rec.fine_amount ? Number(rec.fine_amount) : 0;
    if (fineAmt > 0 && rec.fine_status === 'CONFIRMED') totalFines += fineAmt;
    if (rec.first_in || rec.is_on_site || rec.is_on_field || rec.status === 'PRESENT_CONFIRMED' || rec.status === 'ON_DUTY' || rec.status === 'WFH' || rec.review_status === 'WFH') totalPresent++;

    const rowValues = [
      idx + 1,
      String(rec.employee_code || ''),
      String(rec.employee_name || ''),
      rec.essl_linked ? 'eSSL Face Terminal' : 'Manual / Non-eSSL',
      formattedDate,
      firstInStr,
      lastOutStr,
      schedOut === '19:30' ? '07:30 PM (Std)' : '06:45 PM (Special)',
      earlyMins > 0 ? formatMinutesToHM(earlyMins) : '0m',
      rec.late_minutes ? formatMinutesToHM(rec.late_minutes) : '0m',
      rec.permission_minutes ? formatMinutesToHM(rec.permission_minutes) : '0m',
      rec.fine_status || 'NONE',
      fineAmt,
      rec.total_minutes ? formatMinutesToHM(rec.total_minutes) : '0m',
      rec.review_status === 'WFH' ? 'WFH' : rec.status || 'UNPROCESSED',
      rec.review_status || 'UNCONFIRMED',
      rec.review_reason || (earlyMins > 0 ? `Early exit: ${formatMinutesToHM(earlyMins)}` : ''),
    ];

    rowValues.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9 };
      if (!isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      // Highlight Early Exit column in prominent soft-red fill & bold red font
      if (cIdx === 8 && earlyMins > 0) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      }

      // Highlight Confirmed Fines in soft red
      if (cIdx === 12 && fineAmt > 0) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      }

      // Highlight WFH in cyan fill & bold text
      if ((cIdx === 14 || cIdx === 15) && (val === 'WFH' || val === 'WORK_FROM_HOME')) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0E7490' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFEFF' } };
      }
      cell.alignment = {
        horizontal: cIdx === 0 || cIdx === 1 || cIdx === 3 || cIdx === 4 || cIdx === 5 || cIdx === 6 || cIdx === 7 || cIdx === 11 || cIdx === 14 || cIdx === 15 ? 'center' : cIdx >= 8 && cIdx <= 13 ? 'right' : 'left',
        vertical: 'middle',
      };
      cell.border = thinCellBorder;
    });

    currRow++;
  });

  // Summary Row
  worksheet.mergeCells(`A${currRow}:Q${currRow}`);
  const summaryCell = worksheet.getCell(`A${currRow}`);
  summaryCell.value = `Total Workforce = ${records.length}  |  Present / Active = ${totalPresent}  |  Total Confirmed Fines = INR ${totalFines.toLocaleString()}`;
  summaryCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  summaryCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currRow).height = 22;

  for (let c = 1; c <= 17; c++) {
    worksheet.getRow(currRow).getCell(c).border = darkBorder;
  }

  await saveWorkbook(workbook, `SCOTO_Daily_Attendance_${targetDate}`);
};

/**
 * Export Full Month Attendance Register in Calendar Matrix (Cross-tab Grid) format:
 * Row 4: Employee Name | Sep 01 | Sep 02 | Sep 03 ... | Present | On-Site | CL | Comp Off | Half Day | LOP | WO | Absent
 * Row 5:               | Mon    | Tue    | Wed    ... |         |         |    |          |          |     |    |
 * Row 6+: santhosh     | LOP    | Present| Casual Leave | Present ...
 *         muthu        | Onsite | Onsite | LOP          | ...
 */
export const exportMonthlyAttendanceExcel = async (monthlyData, month, year, meta = {}) => {
  if (!monthlyData || !monthlyData.employees || !monthlyData.employees.length) {
    throw new Error('No monthly attendance data available to export.');
  }

  const company = monthlyData.company_name || meta.company_name || 'SCOTO';
  const monthName = MONTH_NAMES[month] || `Month_${month}`;
  const monShort = SHORT_MONTH_NAMES[month] || `M${month}`;
  const printedOn = resolvePrintedOn(monthlyData);
  const employees = monthlyData.employees;

  // Determine total days in month
  const numDays = new Date(year, month, 0).getDate();

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly_Attendance_Matrix', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', xSplit: 3, ySplit: 5 }],
  });

  // Calculate day headers info
  const dayHeaders = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let d = 1; d <= numDays; d++) {
    const curDate = new Date(year, month - 1, d);
    const dayOfWeek = dayNames[curDate.getDay()];
    dayHeaders.push({
      dayNum: d,
      dateLabel: `${monShort} ${String(d).padStart(2, '0')}`,
      dayName: dayOfWeek,
      isSunday: curDate.getDay() === 0,
    });
  }

  // Define summary columns
  const summaryHeaders = [
    { key: 'present', label: 'Present', width: 12 },
    { key: 'onsite', label: 'On-Site', width: 12 },
    { key: 'holiday', label: 'Holiday', width: 12 },
    { key: 'cl', label: 'Casual Leave', width: 14 },
    { key: 'compoff', label: 'Comp Off', width: 12 },
    { key: 'halfday', label: 'Half Day', width: 12 },
    { key: 'lop', label: 'LOP', width: 10 },
    { key: 'wo', label: 'Weekly Off', width: 12 },
    { key: 'absent', label: 'Absent', width: 10 },
  ];

  // Set worksheet columns: A (S.No), B (Emp Code), C (Emp Name), then days 1..numDays, then summary cols
  const columns = [
    { key: 'sno', width: 7 },
    { key: 'emp_code', width: 15 },
    { key: 'emp_name', width: 26 },
  ];
  dayHeaders.forEach((dh) => {
    columns.push({ key: `day_${dh.dayNum}`, width: 14 });
  });
  summaryHeaders.forEach((sh) => {
    columns.push({ key: sh.key, width: sh.width });
  });
  worksheet.columns = columns;

  const totalCols = columns.length;

  let currRow = 1;

  // Row 1: Title Banner
  worksheet.mergeCells(currRow, 1, currRow, totalCols);
  const titleCell = worksheet.getCell(currRow, 1);
  titleCell.value = `${company} - Monthly Attendance Register`;
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 28;
  currRow++;

  // Row 2: Subtitle Banner
  worksheet.mergeCells(currRow, 1, currRow, totalCols);
  const subCell = worksheet.getCell(currRow, 1);
  subCell.value = `Month: ${monthName} ${year}  |  Monitored Workforce: ${employees.length}  |  Generated On: ${printedOn}`;
  subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 22;
  currRow++;

  // Row 3: Blank separator
  worksheet.getRow(currRow).height = 10;
  currRow++;

  // Row 4: Header 1 (Dates) & Row 5: Header 2 (Days of Week)
  const headerRow1Index = currRow;
  const headerRow2Index = currRow + 1;
  worksheet.getRow(headerRow1Index).height = 24;
  worksheet.getRow(headerRow2Index).height = 20;

  // Merge S.No, Emp Code, Emp Name across Row 4 & Row 5
  worksheet.mergeCells(headerRow1Index, 1, headerRow2Index, 1);
  const h1 = worksheet.getCell(headerRow1Index, 1);
  h1.value = 'S.No';

  worksheet.mergeCells(headerRow1Index, 2, headerRow2Index, 2);
  const h2 = worksheet.getCell(headerRow1Index, 2);
  h2.value = 'Employee Code';

  worksheet.mergeCells(headerRow1Index, 3, headerRow2Index, 3);
  const h3 = worksheet.getCell(headerRow1Index, 3);
  h3.value = 'Employee Name';

  [h1, h2, h3].forEach((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = darkBorder;
  });

  // Day columns (Row 4 has Date e.g. "Sep 01", Row 5 has Day Name e.g. "Mon")
  dayHeaders.forEach((dh, idx) => {
    const colIdx = 4 + idx;
    const topCell = worksheet.getCell(headerRow1Index, colIdx);
    topCell.value = dh.dateLabel;
    topCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    topCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: dh.isSunday ? 'FFBE123C' : 'FF334155' },
    };
    topCell.alignment = { horizontal: 'center', vertical: 'middle' };
    topCell.border = darkBorder;

    const botCell = worksheet.getCell(headerRow2Index, colIdx);
    botCell.value = dh.dayName;
    botCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    botCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: dh.isSunday ? 'FFE11D48' : 'FF475569' },
    };
    botCell.alignment = { horizontal: 'center', vertical: 'middle' };
    botCell.border = darkBorder;
  });

  // Summary columns (Merged vertically across Row 4 & Row 5)
  summaryHeaders.forEach((sh, idx) => {
    const colIdx = 4 + dayHeaders.length + idx;
    worksheet.mergeCells(headerRow1Index, colIdx, headerRow2Index, colIdx);
    const sumCell = worksheet.getCell(headerRow1Index, colIdx);
    sumCell.value = sh.label;
    sumCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    sumCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sumCell.border = darkBorder;
  });

  currRow = headerRow2Index + 1;

  // Status Style Helper
  const getStatusStyle = (status) => {
    const s = String(status || '').trim();
    if (s === 'Present' || s === 'Present (No OutPunch)') {
      return { fg: 'FFDCFCE7', text: 'FF166534', bold: false }; // Soft Green
    }
    if (s === 'Onsite' || s === 'On-Site' || s === 'ON_SITE' || s === 'Onfield' || s === 'On-Field' || s === 'ON_FIELD') {
      return { fg: 'FFE0F2FE', text: 'FF0369A1', bold: false }; // Soft Sky Blue
    }
    if (s === 'Casual Leave' || s === 'Leave') {
      return { fg: 'FFF3E8FF', text: 'FF7E22CE', bold: false }; // Soft Purple
    }
    if (s === 'Comp Off') {
      return { fg: 'FFFEF3C7', text: 'FF92400E', bold: false }; // Soft Amber
    }
    if (s === 'Half Day') {
      return { fg: 'FFFFEDD5', text: 'FF9A3412', bold: false }; // Soft Orange
    }
    if (s === 'LOP') {
      return { fg: 'FFFFE4E6', text: 'FF9F1239', bold: true };  // Soft Rose / Bold Red
    }
    if (s === 'On Duty') {
      return { fg: 'FFCCFBF1', text: 'FF0F766E', bold: false }; // Soft Teal
    }
    if (s === 'WFH' || s === 'Work From Home' || s === 'WORK_FROM_HOME') {
      return { fg: 'FFE0F7FA', text: 'FF006064', bold: false }; // Soft Cyan
    }
    if (s === 'Holiday' || s === 'HOLIDAY') {
      return { fg: 'FFF3E8FF', text: 'FF6B21A8', bold: true }; // Soft Purple
    }
    if (s === 'WO' || s === 'WeeklyOff') {
      return { fg: 'FFF1F5F9', text: 'FF64748B', bold: false }; // Muted Slate
    }
    if (s === 'Absent') {
      return { fg: 'FFFEE2E2', text: 'FF991B1B', bold: false }; // Soft Red
    }
    return { fg: 'FFFFFFFF', text: 'FF94A3B8', bold: false };   // Future / Dash
  };

  const summaryTotals = {
    present: 0,
    onsite: 0,
    onfield: 0,
    holiday: 0,
    cl: 0,
    compoff: 0,
    halfday: 0,
    lop: 0,
    wo: 0,
    absent: 0,
  };

  // Populate Employee Rows
  employees.forEach((emp, empIdx) => {
    const row = worksheet.getRow(currRow);
    row.height = 20;

    // Day Map
    const dayMap = new Map();
    (emp.days || []).forEach((d) => {
      let dayNum = 0;
      if (d.iso_date) {
        dayNum = parseInt(d.iso_date.slice(8, 10), 10);
      } else if (d.date) {
        const parts = d.date.split('-');
        dayNum = parseInt(parts[0], 10);
      }
      if (dayNum > 0) {
        dayMap.set(dayNum, d);
      }
    });

    const empCounts = {
      present: 0,
      onsite: 0,
      onfield: 0,
      holiday: 0,
      cl: 0,
      compoff: 0,
      halfday: 0,
      lop: 0,
      wo: 0,
      absent: 0,
    };

    // Col 1: S.No
    const c1 = row.getCell(1);
    c1.value = empIdx + 1;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.border = thinCellBorder;
    c1.font = { name: 'Arial', size: 9 };

    // Col 2: Employee Code
    const c2 = row.getCell(2);
    c2.value = String(emp.employee_code || '');
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    c2.border = thinCellBorder;
    c2.font = { name: 'Arial', size: 9, bold: true };

    // Col 3: Employee Name
    const c3 = row.getCell(3);
    c3.value = String(emp.employee_name || '');
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    c3.border = thinCellBorder;
    c3.font = { name: 'Arial', size: 9, bold: true };

    // Day Columns
    dayHeaders.forEach((dh, dIdx) => {
      const colIdx = 4 + dIdx;
      const cell = row.getCell(colIdx);
      const dayData = dayMap.get(dh.dayNum);
      const rawStatus = dayData ? dayData.status : '-';
      const style = getStatusStyle(rawStatus);

      // Tally counters
      if (rawStatus === 'Present' || rawStatus === 'Present (No OutPunch)' || rawStatus === 'On Duty' || rawStatus === 'WFH') {
        empCounts.present++;
      } else if (rawStatus === 'Onsite' || rawStatus === 'On-Site' || rawStatus === 'ON_SITE' || rawStatus === 'Onfield' || rawStatus === 'On-Field' || rawStatus === 'ON_FIELD') {
        empCounts.onsite++;
        empCounts.onfield++;
      } else if (rawStatus === 'Holiday' || rawStatus === 'HOLIDAY' || (dayData && dayData.is_holiday)) {
        empCounts.holiday++;
      } else if (rawStatus === 'Casual Leave' || rawStatus === 'Leave') {
        empCounts.cl++;
      } else if (rawStatus === 'Comp Off') {
        empCounts.compoff++;
      } else if (rawStatus === 'Half Day') {
        empCounts.halfday++;
      } else if (rawStatus === 'LOP') {
        empCounts.lop++;
      } else if (rawStatus === 'WO' || rawStatus === 'WeeklyOff') {
        empCounts.wo++;
      } else if (rawStatus === 'Absent') {
        empCounts.absent++;
      }

      cell.value = rawStatus;
      cell.font = { name: 'Arial', size: 8, bold: style.bold, color: { argb: style.text } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinCellBorder;
    });

    // Summary Columns
    summaryHeaders.forEach((sh, sIdx) => {
      const colIdx = 4 + dayHeaders.length + sIdx;
      const cell = row.getCell(colIdx);
      const count = empCounts[sh.key] || 0;
      cell.value = count;
      cell.font = { name: 'Arial', size: 9, bold: count > 0 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinCellBorder;
      summaryTotals[sh.key] += count;
    });

    currRow++;
  });

  // Bottom Summary Row
  worksheet.mergeCells(currRow, 1, currRow, 3);
  const bottomLabel = worksheet.getCell(currRow, 1);
  bottomLabel.value = `Total Monitored Workforce = ${employees.length}`;
  bottomLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  bottomLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  bottomLabel.alignment = { horizontal: 'left', vertical: 'middle' };

  for (let c = 1; c <= 3; c++) {
    worksheet.getCell(currRow, c).border = darkBorder;
  }

  // Blank day cells on bottom row
  dayHeaders.forEach((_, idx) => {
    const colIdx = 4 + idx;
    const cell = worksheet.getCell(currRow, colIdx);
    cell.value = '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = darkBorder;
  });

  // Summary Totals
  summaryHeaders.forEach((sh, idx) => {
    const colIdx = 4 + dayHeaders.length + idx;
    const cell = worksheet.getCell(currRow, colIdx);
    cell.value = summaryTotals[sh.key];
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = darkBorder;
  });
  worksheet.getRow(currRow).height = 22;

  await saveWorkbook(workbook, `SCOTO_Monthly_Attendance_${monthName}_${year}`);
};

/**
 * Export Daily Late Check-In & Penalty Assessment to Excel
 */
export const exportDailyLateFinesExcel = async (records = [], targetDate, meta = {}) => {
  if (!records.length) {
    throw new Error('No fine records available to export for this date.');
  }

  const company = meta.company_name || 'SCOTO';
  const printedOn = resolvePrintedOn(meta);
  const formattedDate = formatReportDateStr(targetDate);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily_Late_Early_Fines', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  worksheet.columns = [
    { key: 'sno', width: 6 },
    { key: 'emp_code', width: 14 },
    { key: 'emp_name', width: 24 },
    { key: 'date', width: 13 },
    { key: 'in_time', width: 12 },
    { key: 'shift_start', width: 11 },
    { key: 'late_mins', width: 13 },
    { key: 'late_perm', width: 11 },
    { key: 'out_time', width: 12 },
    { key: 'shift_end', width: 11 },
    { key: 'early_exit_mins', width: 13 },
    { key: 'early_perm', width: 11 },
    { key: 'fine_status', width: 14 },
    { key: 'fine_amount', width: 14 },
    { key: 'review_status', width: 16 },
    { key: 'remarks', width: 26 },
  ];

  let currRow = 1;

  // Title
  worksheet.mergeCells(`A${currRow}:P${currRow}`);
  const titleCell = worksheet.getCell(`A${currRow}`);
  titleCell.value = `${company} - Daily Late Arrival & Early Exit Penalty Register`;
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Dark Crimson
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 28;
  currRow++;

  const lateCount = records.filter((r) => r.first_in && r.late_minutes > 0).length;
  const earlyCount = records.filter((r) => r.last_out && r.early_exit_minutes > 0).length;
  const totalFineAmt = records.reduce((acc, r) => acc + (r.fine_status === 'CONFIRMED' && r.fine_amount ? Number(r.fine_amount) : 0), 0);

  // Subtitle
  worksheet.mergeCells(`A${currRow}:P${currRow}`);
  const subCell = worksheet.getCell(`A${currRow}`);
  subCell.value = `Attendance Date: ${formattedDate}  |  Monitored Workforce: ${records.length}  |  Late Arrivals: ${lateCount}  |  Early Exits: ${earlyCount}  |  Confirmed Penalties: INR ${totalFineAmt.toLocaleString()}  |  Generated On: ${printedOn}`;
  subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF7F1D1D' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 22;
  currRow++;
  currRow++; // Blank separator

  const headers = [
    'S.No',
    'Employee Code',
    'Employee Name',
    'Attendance Date',
    'First Check IN',
    'Shift Start',
    'Late Duration',
    'Late Perm',
    'Last Check OUT',
    'Shift End',
    'Early Exit',
    'Early Perm',
    'Fine Status',
    'Fine Amount (INR)',
    'Review Status',
    'Reason / Remarks',
  ];

  const headerRow = worksheet.getRow(currRow);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = {
      horizontal: idx === 0 || idx === 1 || idx === 3 || idx === 4 || idx === 5 || idx === 7 || idx === 8 || idx === 9 || idx === 11 || idx === 12 || idx === 14 ? 'center' : idx === 6 || idx === 10 || idx === 13 ? 'right' : 'left',
      vertical: 'middle',
    };
    cell.border = darkBorder;
  });
  currRow++;

  records.forEach((rec, idx) => {
    const row = worksheet.getRow(currRow);
    row.height = 20;
    const isEven = idx % 2 === 0;

    const inTimeStr = rec.first_in ? formatTimeDisplay(rec.first_in) : 'Not Punched';
    const outTimeStr = rec.last_out ? formatTimeDisplay(rec.last_out) : 'Not Punched';
    const shiftStartStr = rec.shift_start_time ? String(rec.shift_start_time).slice(0, 5) : '09:30';
    const shiftEndStr = rec.scheduled_checkout ? String(rec.scheduled_checkout).slice(0, 5) : (meta.getEmployeeCheckoutTime ? meta.getEmployeeCheckoutTime(rec.employee_code) : '19:30');
    const fineAmt = rec.fine_amount ? Number(rec.fine_amount) : 0;
    const isWaived = rec.fine_status === 'WAIVED';

    const rowValues = [
      idx + 1,
      String(rec.employee_code || ''),
      String(rec.employee_name || ''),
      formattedDate,
      inTimeStr,
      shiftStartStr,
      rec.first_in && rec.late_minutes ? formatMinutesToHM(rec.late_minutes) : '0m',
      rec.permission_minutes ? formatMinutesToHM(rec.permission_minutes) : '0m',
      outTimeStr,
      shiftEndStr,
      rec.last_out && rec.early_exit_minutes ? formatMinutesToHM(rec.early_exit_minutes) : '0m',
      rec.early_permission_minutes ? formatMinutesToHM(rec.early_permission_minutes) : '0m',
      rec.fine_status || (!rec.first_in && !rec.last_out ? 'NONE' : (rec.late_minutes > 0 || rec.early_exit_minutes > 0) ? 'PENDING' : 'NONE'),
      fineAmt,
      rec.review_status || '',
      rec.review_reason || rec.fine_reason || '',
    ];

    rowValues.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = { name: 'Arial', size: 9 };
      if (!isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.alignment = {
        horizontal: cIdx === 0 || cIdx === 1 || cIdx === 3 || cIdx === 4 || cIdx === 5 || cIdx === 7 || cIdx === 8 || cIdx === 9 || cIdx === 11 || cIdx === 12 || cIdx === 14 ? 'center' : cIdx === 6 || cIdx === 10 || cIdx === 13 ? 'right' : 'left',
        vertical: 'middle',
      };
      cell.border = thinCellBorder;

      // Late duration highlight
      if (cIdx === 6 && rec.late_minutes > 0) {
        if (fineAmt > 0 || rec.fine_status === 'CONFIRMED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
        } else if (isWaived) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
        }
      }

      // Early exit highlight
      if (cIdx === 10 && rec.early_exit_minutes > 0) {
        if (fineAmt > 0 || rec.fine_status === 'CONFIRMED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        } else if (isWaived) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9F1239' } };
        }
      }

      // Fine amount highlight
      if (cIdx === 13) {
        if (fineAmt > 0 || rec.fine_status === 'CONFIRMED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
        } else if (isWaived) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
        }
      }
    });

    currRow++;
  });

  // Summary Row
  worksheet.mergeCells(`A${currRow}:P${currRow}`);
  const summaryCell = worksheet.getCell(`A${currRow}`);
  summaryCell.value = `Total Workforce = ${records.length}  |  Late Staff = ${lateCount}  |  Early Exit Staff = ${earlyCount}  |  Total Confirmed Penalties = INR ${totalFineAmt.toLocaleString()}`;
  summaryCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  summaryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  summaryCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currRow).height = 22;

  for (let c = 1; c <= 16; c++) {
    worksheet.getRow(currRow).getCell(c).border = darkBorder;
  }

  await saveWorkbook(workbook, `SCOTO_Daily_Late_Early_Fines_${targetDate}`);
};

/**
 * Export Monthly Late Check-In & Penalty Assessment Register in Calendar Matrix format:
 * Row 4: Employee Name | Sep 01 | Sep 02 | Sep 03 ... | Total Permission | Total Fine Amount
 * Row 5:               | Mon    | Tue    | Wed    ... |                  |
 * Row 6+: santhosh     | 100    | 0      | per(30min) | 100 ... 30min    | 100
 *         muthu        | 0      | 1hrs(per)| 100      | 0   ... 1h 00m   | 100
 */
export const exportMonthlyLateFinesExcel = async (records = [], month, year, meta = {}) => {
  const company = meta.company_name || 'SCOTO';
  const monthName = MONTH_NAMES[month] || `Month_${month}`;
  const monShort = SHORT_MONTH_NAMES[month] || `M${month}`;
  const printedOn = resolvePrintedOn(meta);
  const today = new Date();

  // Determine total days in month
  const numDays = new Date(year, month, 0).getDate();

  // Build employee list (distinct from meta.allEmployees and records)
  const empMap = new Map();
  if (Array.isArray(meta.allEmployees)) {
    meta.allEmployees.forEach((e) => {
      const code = String(e.employee_code || '').trim();
      if (code) {
        empMap.set(code, {
          employee_code: code,
          employee_name: e.employee_name || code,
        });
      }
    });
  }
  (records || []).forEach((r) => {
    const code = String(r.employee_code || '').trim();
    if (code && !empMap.has(code)) {
      empMap.set(code, {
        employee_code: code,
        employee_name: r.employee_name || code,
      });
    }
  });

  const employeesList = Array.from(empMap.values());
  if (!employeesList.length) {
    throw new Error('No employees available to export for this month.');
  }

  // Sort employees alphabetically by name
  employeesList.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

  // Build quick record lookup by key: `${code}_${YYYY-MM-DD}`
  const recordsByKey = new Map();
  (records || []).forEach((r) => {
    const code = String(r.employee_code || '').trim();
    let dateStr = '';
    if (r.attendance_date) {
      if (typeof r.attendance_date === 'string') {
        dateStr = r.attendance_date.slice(0, 10);
      } else {
        const d = new Date(r.attendance_date);
        dateStr = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
      }
    }
    if (code && dateStr) {
      recordsByKey.set(`${code}_${dateStr}`, r);
    }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Monthly_Late_Fine_Matrix', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', xSplit: 3, ySplit: 5 }],
  });

  // Calculate day headers info
  const dayHeaders = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let d = 1; d <= numDays; d++) {
    const curDate = new Date(year, month - 1, d);
    const dayOfWeek = dayNames[curDate.getDay()];
    const isoDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayHeaders.push({
      dayNum: d,
      isoDateStr,
      dateLabel: `${monShort} ${String(d).padStart(2, '0')}`,
      dayName: dayOfWeek,
      isSunday: curDate.getDay() === 0,
      isFuture: curDate > today,
    });
  }

  // Columns definition: A (S.No), B (Emp Code), C (Emp Name), Day 1..N, Total Permission, Total Fine Amount
  const columns = [
    { key: 'sno', width: 7 },
    { key: 'emp_code', width: 15 },
    { key: 'emp_name', width: 26 },
  ];
  dayHeaders.forEach((dh) => {
    columns.push({ key: `day_${dh.dayNum}`, width: 14 });
  });
  columns.push({ key: 'total_perm', width: 18 });
  columns.push({ key: 'total_fine', width: 20 });
  worksheet.columns = columns;

  const totalCols = columns.length;
  let currRow = 1;

  // Row 1: Title Banner
  worksheet.mergeCells(currRow, 1, currRow, totalCols);
  const titleCell = worksheet.getCell(currRow, 1);
  titleCell.value = `${company} - Monthly Late Check-In & Penalty Assessment Register`;
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Dark Crimson
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 28;
  currRow++;

  // Row 2: Subtitle Banner
  worksheet.mergeCells(currRow, 1, currRow, totalCols);
  const subCell = worksheet.getCell(currRow, 1);
  subCell.value = `Month: ${monthName} ${year}  |  Monitored Workforce: ${employeesList.length}  |  Generated On: ${printedOn}`;
  subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF7F1D1D' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currRow).height = 22;
  currRow++;

  // Row 3: Blank separator
  worksheet.getRow(currRow).height = 10;
  currRow++;

  // Row 4: Header 1 (Dates) & Row 5: Header 2 (Days of Week)
  const headerRow1Index = currRow;
  const headerRow2Index = currRow + 1;
  worksheet.getRow(headerRow1Index).height = 24;
  worksheet.getRow(headerRow2Index).height = 20;

  // Merge S.No, Emp Code, Emp Name across Row 4 & Row 5
  worksheet.mergeCells(headerRow1Index, 1, headerRow2Index, 1);
  const h1 = worksheet.getCell(headerRow1Index, 1);
  h1.value = 'S.No';

  worksheet.mergeCells(headerRow1Index, 2, headerRow2Index, 2);
  const h2 = worksheet.getCell(headerRow1Index, 2);
  h2.value = 'Employee Code';

  worksheet.mergeCells(headerRow1Index, 3, headerRow2Index, 3);
  const h3 = worksheet.getCell(headerRow1Index, 3);
  h3.value = 'Employee Name';

  [h1, h2, h3].forEach((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = darkBorder;
  });

  // Day columns (Row 4 has Date e.g. "Sep 01", Row 5 has Day Name e.g. "Mon")
  dayHeaders.forEach((dh, idx) => {
    const colIdx = 4 + idx;
    const topCell = worksheet.getCell(headerRow1Index, colIdx);
    topCell.value = dh.dateLabel;
    topCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    topCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: dh.isSunday ? 'FFBE123C' : 'FF334155' },
    };
    topCell.alignment = { horizontal: 'center', vertical: 'middle' };
    topCell.border = darkBorder;

    const botCell = worksheet.getCell(headerRow2Index, colIdx);
    botCell.value = dh.dayName;
    botCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
    botCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: dh.isSunday ? 'FFE11D48' : 'FF475569' },
    };
    botCell.alignment = { horizontal: 'center', vertical: 'middle' };
    botCell.border = darkBorder;
  });

  // Summary headers (Merged across row 4 & 5)
  const permColIdx = 4 + dayHeaders.length;
  worksheet.mergeCells(headerRow1Index, permColIdx, headerRow2Index, permColIdx);
  const permHeaderCell = worksheet.getCell(headerRow1Index, permColIdx);
  permHeaderCell.value = 'Total Permission';
  permHeaderCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  permHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  permHeaderCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  permHeaderCell.border = darkBorder;

  const fineColIdx = permColIdx + 1;
  worksheet.mergeCells(headerRow1Index, fineColIdx, headerRow2Index, fineColIdx);
  const fineHeaderCell = worksheet.getCell(headerRow1Index, fineColIdx);
  fineHeaderCell.value = 'Total Fine Amount (INR)';
  fineHeaderCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  fineHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  fineHeaderCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  fineHeaderCell.border = darkBorder;

  currRow = headerRow2Index + 1;

  let grandTotalFine = 0;
  let grandTotalPermMins = 0;

  // Format permission minutes: per(30m), per(1h 0m), per(1h 10m)
  const formatPermissionStr = (mins) => {
    if (!mins || mins <= 0) return '';
    return `per(${formatMinutesToHM(mins)})`;
  };

  // Format total permission summary
  const formatTotalPermSummary = (mins) => {
    if (!mins || mins <= 0) return '0m';
    return formatMinutesToHM(mins);
  };

  // Populate Employee Rows
  employeesList.forEach((emp, empIdx) => {
    const row = worksheet.getRow(currRow);
    row.height = 20;

    let empTotalPermMins = 0;
    let empTotalFineAmt = 0;

    // Col 1: S.No
    const c1 = row.getCell(1);
    c1.value = empIdx + 1;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    c1.border = thinCellBorder;
    c1.font = { name: 'Arial', size: 9 };

    // Col 2: Employee Code
    const c2 = row.getCell(2);
    c2.value = String(emp.employee_code || '');
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    c2.border = thinCellBorder;
    c2.font = { name: 'Arial', size: 9, bold: true };

    // Col 3: Employee Name
    const c3 = row.getCell(3);
    c3.value = String(emp.employee_name || '');
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    c3.border = thinCellBorder;
    c3.font = { name: 'Arial', size: 9, bold: true };

    // Day Columns
    dayHeaders.forEach((dh, dIdx) => {
      const colIdx = 4 + dIdx;
      const cell = row.getCell(colIdx);
      const key = `${emp.employee_code}_${dh.isoDateStr}`;
      const rec = recordsByKey.get(key);

      let cellVal = 0;
      let cellFont = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
      let cellFill = null;

      if (dh.isFuture) {
        cellVal = '-';
        cellFont = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };
      } else if (rec) {
        const fineAmt = rec.fine_amount ? Number(rec.fine_amount) : 0;
        const permMins = (Number(rec.permission_minutes_applied) || 0) + (Number(rec.early_permission_minutes) || 0);
        const isConfirmed = rec.fine_status === 'CONFIRMED';
        const isWaived = rec.fine_status === 'WAIVED';

        if (permMins > 0) {
          empTotalPermMins += permMins;
        }

        if (isConfirmed && fineAmt > 0) {
          empTotalFineAmt += fineAmt;
          if (permMins > 0) {
            cellVal = `${fineAmt} (per ${formatMinutesToHM(permMins)})`;
          } else {
            cellVal = fineAmt; // e.g. 100
          }
          cellFont = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
          cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Soft red/rose
        } else if (permMins > 0) {
          cellVal = formatPermissionStr(permMins); // e.g. 'per(30min)', '1hrs ( per)'
          cellFont = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } };
          cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }; // Soft sky blue
        } else if (isWaived) {
          cellVal = 0;
          cellFont = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
        } else if (fineAmt > 0) {
          // Pending fine without confirmation
          cellVal = `${fineAmt} (Pending)`;
          cellFont = { name: 'Arial', size: 8, color: { argb: 'FFD97706' } };
        } else {
          cellVal = 0;
        }
      } else {
        // No incident on this day
        cellVal = 0;
      }

      cell.value = cellVal;
      cell.font = cellFont;
      if (cellFill) {
        cell.fill = cellFill;
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinCellBorder;
    });

    // Summary Columns
    const permCell = row.getCell(permColIdx);
    permCell.value = formatTotalPermSummary(empTotalPermMins);
    permCell.font = { name: 'Arial', size: 9, bold: empTotalPermMins > 0, color: { argb: empTotalPermMins > 0 ? 'FF0369A1' : 'FF64748B' } };
    permCell.alignment = { horizontal: 'center', vertical: 'middle' };
    permCell.border = thinCellBorder;

    const fineCell = row.getCell(fineColIdx);
    fineCell.value = empTotalFineAmt;
    fineCell.font = { name: 'Arial', size: 9, bold: empTotalFineAmt > 0, color: { argb: empTotalFineAmt > 0 ? 'FF991B1B' : 'FF64748B' } };
    fineCell.alignment = { horizontal: 'right', vertical: 'middle' };
    fineCell.border = thinCellBorder;

    grandTotalPermMins += empTotalPermMins;
    grandTotalFine += empTotalFineAmt;

    currRow++;
  });

  // Bottom Summary Row
  worksheet.mergeCells(currRow, 1, currRow, 3);
  const bottomLabel = worksheet.getCell(currRow, 1);
  bottomLabel.value = `Total Monitored Workforce = ${employeesList.length}`;
  bottomLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  bottomLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  bottomLabel.alignment = { horizontal: 'left', vertical: 'middle' };

  for (let c = 1; c <= 3; c++) {
    worksheet.getCell(currRow, c).border = darkBorder;
  }

  // Blank day cells on bottom row
  dayHeaders.forEach((_, idx) => {
    const colIdx = 4 + idx;
    const cell = worksheet.getCell(currRow, colIdx);
    cell.value = '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = darkBorder;
  });

  // Total Permission
  const bottomPermCell = worksheet.getCell(currRow, permColIdx);
  bottomPermCell.value = formatTotalPermSummary(grandTotalPermMins);
  bottomPermCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0369A1' } };
  bottomPermCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  bottomPermCell.alignment = { horizontal: 'center', vertical: 'middle' };
  bottomPermCell.border = darkBorder;

  // Total Fine Amount
  const bottomFineCell = worksheet.getCell(currRow, fineColIdx);
  bottomFineCell.value = grandTotalFine;
  bottomFineCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF991B1B' } };
  bottomFineCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  bottomFineCell.alignment = { horizontal: 'right', vertical: 'middle' };
  bottomFineCell.border = darkBorder;

  worksheet.getRow(currRow).height = 22;

  await saveWorkbook(workbook, `SCOTO_Monthly_Late_Fines_${monthName}_${year}`);
};


