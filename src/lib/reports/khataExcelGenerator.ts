import ExcelJS from 'exceljs';
import {
  formatDateTimeIST,
  formatInr,
  KhataConsolidatedReportResult,
  KhataPersonDetailedReportResult,
  ReportTransactionRow,
} from '@/lib/services/khataReportService';

const INR_CURRENCY_FMT = '"₹"#,##0.00;"-₹"#,##0.00;"₹"0.00';
const DATE_TIME_FMT = 'dd-mmm-yyyy hh:mm AM/PM';

const NAVY_HEX = '071F38';
const NAVY_SUB_HEX = '1E3A5F';
const BORDER_HEX = 'CBD5E1';
const ZEBRA_HEX = 'F8FAFC';
const GREEN_BG = 'ECFDF5';
const GREEN_TEXT = '065F46';
const RED_BG = 'FEF2F2';
const RED_TEXT = '991B1B';
const TOTAL_BG = 'EFF6FF';
const AMBER_BG = 'FFFBEB';
const AMBER_TEXT = '92400E';

function toExcelIstDate(iso: string | Date): Date {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return new Date();
  // Shift UTC ms by +05:30 so Excel serial date renders authentic IST clock without TZ ambiguity
  return new Date(d.getTime() + 330 * 60 * 1000);
}

function applyThinBorder(cell: ExcelJS.Cell, bottomDouble = false, topMedium = false) {
  cell.border = {
    top: { style: topMedium ? 'medium' : 'thin', color: { argb: topMedium ? NAVY_HEX : BORDER_HEX } },
    left: { style: 'thin', color: { argb: BORDER_HEX } },
    bottom: { style: bottomDouble ? 'double' : 'thin', color: { argb: bottomDouble ? NAVY_HEX : BORDER_HEX } },
    right: { style: 'thin', color: { argb: BORDER_HEX } },
  };
}

function styleBanner(
  ws: ExcelJS.Worksheet,
  colCount: number,
  title: string,
  subtitle: string
) {
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEX } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: false, color: { argb: 'E2E8F0' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_SUB_HEX } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;
}

function styleTableHeaderRow(
  row: ExcelJS.Row,
  colCount: number,
  bgArgb = NAVY_HEX
) {
  row.height = 24;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: bgArgb } },
      bottom: { style: 'medium', color: { argb: bgArgb } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: 'thin', color: { argb: '334155' } },
    };
  }
}

function autoFitColumns(
  ws: ExcelJS.Worksheet,
  minWidths: number[],
  maxWidths: number[]
) {
  ws.columns.forEach((col, index) => {
    let maxLen = minWidths[index] ?? 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      // Skip wide merged banner rows (rows 1 & 2) from blowing up Column A width
      if (Number(cell.row) <= 2) return;
      const val = cell.value;
      if (val == null) return;
      let text = '';
      if (val instanceof Date) {
        text = '28-Nov-2026 12:30 PM';
      } else if (typeof val === 'number') {
        text = `₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      } else if (typeof val === 'object' && 'richText' in val) {
        text = val.richText.map((r) => r.text).join('');
      } else {
        text = String(val);
      }
      const lineMax = text
        .split('\n')
        .reduce((longest, line) => Math.max(longest, line.length), 0);
      if (lineMax + 4 > maxLen) {
        maxLen = lineMax + 4;
      }
    });
    const cap = maxWidths[index] ?? 42;
    col.width = Math.min(cap, Math.max(minWidths[index] ?? 10, maxLen));
  });
}

function populateTransactionSheet(
  ws: ExcelJS.Worksheet,
  bannerTitle: string,
  bannerSubtitle: string,
  transactions: ReportTransactionRow[]
) {
  const colCount = 11;
  styleBanner(ws, colCount, bannerTitle, bannerSubtitle);

  const infoRow = ws.getRow(3);
  ws.mergeCells(3, 1, 3, colCount);
  infoRow.getCell(1).value =
    'Note: Previous Balance & Updated Balance reflect true chronological running balance of the respective bucket (Receivable or Payable), never offset automatically.';
  infoRow.getCell(1).font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: '475569' } };
  infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_BG } };
  infoRow.height = 20;

  const headerRowNum = 4;
  const headerRow = ws.getRow(headerRowNum);
  const headers = [
    'S.No.',
    'Date & Time (IST)',
    'Person Name',
    'Mobile Number',
    'Transaction Type',
    'Amount (₹)',
    'Payment Mode',
    'Payment Ref',
    'Notes / Description',
    'Previous Balance (₹)',
    'Updated Balance (₹)',
  ];
  headerRow.values = headers;
  styleTableHeaderRow(headerRow, colCount);

  let currentRow = headerRowNum + 1;
  let totalInflow = 0;
  let totalOutflow = 0;

  if (transactions.length === 0) {
    ws.mergeCells(currentRow, 1, currentRow, colCount);
    const emptyCell = ws.getCell(currentRow, 1);
    emptyCell.value = 'No transactions found for the selected filters.';
    emptyCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: '64748B' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(currentRow).height = 26;
    currentRow++;
  } else {
    transactions.forEach((tx, idx) => {
      if (tx.moneyDirection === 'IN') totalInflow += tx.amount;
      else totalOutflow += tx.amount;

      const row = ws.getRow(currentRow);
      const refText = [tx.paymentRef, tx.paymentDetails].filter(Boolean).join(' — ') || '—';
      row.values = [
        idx + 1,
        toExcelIstDate(tx.date),
        tx.personName,
        tx.mobileNumber || '—',
        tx.activityLabel,
        tx.amount,
        tx.paymentModeLabel,
        refText,
        tx.notes || '—',
        tx.previousBalance,
        tx.updatedBalance,
      ];
      row.height = tx.notes && tx.notes.length > 40 ? 30 : 21;

      const isEven = idx % 2 === 1;
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 10.5, color: { argb: '0F172A' } };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_HEX } };
        }
        applyThinBorder(cell);
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: c === 8 || c === 9 };
      }

      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).numFmt = DATE_TIME_FMT;
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

      const typeCell = row.getCell(5);
      const isReceivableBucket = tx.balanceBucket === 'TO_RECEIVE';
      typeCell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: true,
        color: { argb: isReceivableBucket ? GREEN_TEXT : RED_TEXT },
      };

      const amtCell = row.getCell(6);
      amtCell.numFmt = INR_CURRENCY_FMT;
      amtCell.alignment = { vertical: 'middle', horizontal: 'right' };
      amtCell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: true,
        color: { argb: tx.moneyDirection === 'IN' ? GREEN_TEXT : RED_TEXT },
      };

      const prevCell = row.getCell(10);
      prevCell.numFmt = INR_CURRENCY_FMT;
      prevCell.alignment = { vertical: 'middle', horizontal: 'right' };

      const updCell = row.getCell(11);
      updCell.numFmt = INR_CURRENCY_FMT;
      updCell.alignment = { vertical: 'middle', horizontal: 'right' };
      updCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: NAVY_HEX } };

      currentRow++;
    });

    const lastDataRow = currentRow - 1;
    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: lastDataRow, column: colCount },
    };

    // Grand Total Summary Row
    const totalRow = ws.getRow(currentRow);
    totalRow.values = [
      '',
      'GRAND TOTAL',
      `${transactions.length} Transactions`,
      '',
      `Inflow: ${formatInr(totalInflow)} | Outflow: ${formatInr(totalOutflow)}`,
      totalInflow + totalOutflow,
      '',
      '',
      'All amounts shown in INR (₹)',
      '',
      '',
    ];
    totalRow.height = 24;
    for (let c = 1; c <= colCount; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: NAVY_HEX } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
      applyThinBorder(cell, true, true);
      cell.alignment = { vertical: 'middle', horizontal: c === 6 ? 'right' : 'left' };
    }
    totalRow.getCell(6).numFmt = INR_CURRENCY_FMT;
  }

  ws.views = [{ state: 'frozen', ySplit: headerRowNum }];
  autoFitColumns(
    ws,
    [7, 23, 20, 15, 22, 16, 15, 18, 26, 19, 19],
    [9, 25, 32, 18, 26, 20, 18, 28, 44, 22, 22]
  );
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

/**
 * Generates a multi-sheet corporate .xlsx workbook for the Consolidated Personal Khata Report.
 * Worksheets:
 * 1. Summary
 * 2. Amount to Receive
 * 3. Amount to Pay
 * 4. Transaction Details
 */
export async function generateKhataConsolidatedExcel(
  report: KhataConsolidatedReportResult
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pakka Chittha / LenDen';
  wb.created = new Date(report.metadata.generatedAt);
  wb.modified = new Date(report.metadata.generatedAt);
  wb.company = report.metadata.businessName;

  // =========================================================================
  // SHEET 1: Summary
  // =========================================================================
  const s1 = wb.addWorksheet('Summary');
  styleBanner(
    s1,
    4,
    `${report.metadata.businessName} — Personal Khata Consolidated Report`,
    `Generated: ${report.metadata.generatedAtDisplay} | Ref: ${report.metadata.referenceNumber}`
  );

  // Report Metadata Box
  const metaRows: Array<[string, string, string, string]> = [
    ['Business / Khata Name', report.metadata.businessName, 'Report Reference', report.metadata.referenceNumber],
    ['Selected Report Period', report.filters.periodLabel, 'Direction Filter', report.filters.direction],
    ['Payment Mode Filter', report.filters.paymentMode, 'Account Status Filter', report.filters.accountStatus],
    ['Search / Party Filter', report.filters.search || report.filters.mobile || 'All Parties', 'Currency', 'INR (₹)'],
  ];

  let rIdx = 4;
  s1.getRow(rIdx).values = ['Report Metadata & Active Filters', '', '', ''];
  s1.mergeCells(rIdx, 1, rIdx, 4);
  s1.getRow(rIdx).height = 22;
  const metaHead = s1.getCell(rIdx, 1);
  metaHead.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  metaHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEX } };
  metaHead.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  rIdx++;

  for (const [k1, v1, k2, v2] of metaRows) {
    const row = s1.getRow(rIdx);
    row.values = [k1, v1, k2, v2];
    row.height = 20;
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      const isLabel = c === 1 || c === 3;
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: isLabel,
        color: { argb: isLabel ? '334155' : '0F172A' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isLabel ? ZEBRA_HEX : 'FFFFFF' },
      };
      applyThinBorder(cell);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
    rIdx++;
  }

  rIdx += 1;
  // Executive KPI Summary Section
  s1.mergeCells(rIdx, 1, rIdx, 4);
  const kpiSec = s1.getCell(rIdx, 1);
  kpiSec.value = 'Current Outstanding Position (Live Balances Across Full Ledger — Not Date-Truncated)';
  kpiSec.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  kpiSec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEX } };
  s1.getRow(rIdx).height = 22;
  rIdx++;

  const kpiHeaders = s1.getRow(rIdx);
  kpiHeaders.values = ['Metric (English)', 'Hindi Meaning', 'Value / Count', 'Account Details'];
  styleTableHeaderRow(kpiHeaders, 4, NAVY_SUB_HEX);
  rIdx++;

  const kpiRows: Array<{
    label: string;
    hindi: string;
    value: number;
    isCurrency: boolean;
    detail: string;
    bg: string;
    fg: string;
  }> = [
    {
      label: 'Total Amount to Receive',
      hindi: 'कुल मिलने वाली रकम',
      value: report.summary.totalAmountToReceive,
      isCurrency: true,
      detail: `${report.summary.receivableAccountCount} Receivable Accounts`,
      bg: GREEN_BG,
      fg: GREEN_TEXT,
    },
    {
      label: 'Total Amount to Pay',
      hindi: 'कुल देने वाली रकम',
      value: report.summary.totalAmountToPay,
      isCurrency: true,
      detail: `${report.summary.payableAccountCount} Payable Accounts`,
      bg: RED_BG,
      fg: RED_TEXT,
    },
    {
      label: 'Net Position',
      hindi: 'मेरी वर्तमान स्थिति (Receive - Pay)',
      value: report.summary.netPosition,
      isCurrency: true,
      detail: report.summary.netPositionLabel,
      bg: TOTAL_BG,
      fg: report.summary.netPosition >= 0 ? GREEN_TEXT : RED_TEXT,
    },
    {
      label: 'Total Active Accounts',
      hindi: 'कुल सक्रिय हिसाब',
      value: report.summary.totalActiveAccounts,
      isCurrency: false,
      detail: `${report.summary.dualBalanceAccountCount} Dual-Balance | ${report.summary.settledAccountCount} Settled`,
      bg: 'FFFFFF',
      fg: NAVY_HEX,
    },
  ];

  for (const item of kpiRows) {
    const row = s1.getRow(rIdx);
    row.values = [item.label, item.hindi, item.value, item.detail];
    row.height = 23;
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.bg } };
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: c === 1 || c === 3,
        color: { argb: c === 3 ? item.fg : '0F172A' },
      };
      applyThinBorder(cell);
      cell.alignment = { vertical: 'middle', horizontal: c === 3 ? 'right' : 'left' };
    }
    if (item.isCurrency) {
      row.getCell(3).numFmt = INR_CURRENCY_FMT;
    } else {
      row.getCell(3).numFmt = '#,##0';
    }
    rIdx++;
  }

  rIdx += 1;
  // Distinction: Period Activity vs Historical Lifetime Totals
  s1.mergeCells(rIdx, 1, rIdx, 4);
  const compSec = s1.getCell(rIdx, 1);
  compSec.value = 'Selected Period Activity vs Lifetime Historical Totals (Matched Accounts)';
  compSec.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  compSec.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_HEX } };
  s1.getRow(rIdx).height = 22;
  rIdx++;

  const compHeader = s1.getRow(rIdx);
  compHeader.values = ['Category', 'Selected Period Activity (₹)', 'Lifetime Historical Total (₹)', 'Explanation'];
  styleTableHeaderRow(compHeader, 4, NAVY_SUB_HEX);
  rIdx++;

  const distinctionRows: Array<[string, number, number, string]> = [
    ['Amount Given (Lent Out)', report.periodSummary.totalGivenInPeriod, report.historicalSummary.totalGivenLifetime, 'New credit given to parties'],
    ['Amount Received Back (Repaid to You)', report.periodSummary.totalReceivedBackInPeriod, report.historicalSummary.totalReceivedBackLifetime, 'Repayments collected from borrowers'],
    ['Amount Taken (Borrowed)', report.periodSummary.totalTakenInPeriod, report.historicalSummary.totalTakenLifetime, 'New credit taken from parties'],
    ['Amount Returned (Paid Back)', report.periodSummary.totalReturnedInPeriod, report.historicalSummary.totalReturnedLifetime, 'Repayments paid to lenders'],
  ];

  distinctionRows.forEach(([cat, perVal, lifeVal, exp], idx) => {
    const row = s1.getRow(rIdx);
    row.values = [cat, perVal, lifeVal, exp];
    row.height = 21;
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10.5, bold: c === 1, color: { argb: '0F172A' } };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_HEX } };
      }
      applyThinBorder(cell);
      cell.alignment = { vertical: 'middle', horizontal: c === 2 || c === 3 ? 'right' : 'left' };
    }
    row.getCell(2).numFmt = INR_CURRENCY_FMT;
    row.getCell(3).numFmt = INR_CURRENCY_FMT;
    rIdx++;
  });

  s1.views = [{ state: 'frozen', ySplit: 2 }];
  autoFitColumns(s1, [30, 30, 26, 36], [42, 42, 32, 48]);
  s1.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 };

  // =========================================================================
  // SHEET 2: Amount to Receive (किससे रकम लेनी है)
  // =========================================================================
  const s2 = wb.addWorksheet('Amount to Receive');
  styleBanner(
    s2,
    7,
    `Amount to Receive (किससे रकम लेनी है) — ${report.metadata.businessName}`,
    `Period: ${report.filters.periodLabel} | Generated: ${report.metadata.generatedAtDisplay}`
  );

  const rHeaderNum = 4;
  const rHeader = s2.getRow(rHeaderNum);
  rHeader.values = [
    'S.No.',
    'Person Name',
    'Mobile Number',
    'Total Amount Given (₹)',
    'Amount Received Back (₹)',
    'Balance to Receive (₹)',
    'Remarks (Separate Payable / Activity)',
  ];
  styleTableHeaderRow(rHeader, 7, GREEN_TEXT);

  let rRow = rHeaderNum + 1;
  let sumGiven = 0;
  let sumRecBack = 0;
  let sumBalRec = 0;

  if (report.amountToReceiveRows.length === 0) {
    s2.mergeCells(rRow, 1, rRow, 7);
    const cell = s2.getCell(rRow, 1);
    cell.value = 'No outstanding receivable balances matching selected filters.';
    cell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: '64748B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    s2.getRow(rRow).height = 26;
  } else {
    report.amountToReceiveRows.forEach((item, idx) => {
      sumGiven += item.totalAmountGiven;
      sumRecBack += item.amountReceivedBack;
      sumBalRec += item.balanceToReceive;

      const remarkParts: string[] = [];
      if (item.hasPayableAlso) {
        remarkParts.push(`Also Payable separately: ${formatInr(item.currentPayableBalance)}`);
      }
      if (item.lastTransactionDate) {
        remarkParts.push(`Last: ${formatDateTimeIST(item.lastTransactionDate)}`);
      }

      const row = s2.getRow(rRow);
      row.values = [
        item.sNo,
        item.personName,
        item.mobileNumber,
        item.totalAmountGiven,
        item.amountReceivedBack,
        item.balanceToReceive,
        remarkParts.join(' | ') || 'Active Receivable',
      ];
      row.height = 22;

      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 10.5, bold: c === 6, color: { argb: c === 6 ? GREEN_TEXT : '0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: c === 6 ? GREEN_BG : idx % 2 === 1 ? ZEBRA_HEX : 'FFFFFF' },
        };
        applyThinBorder(cell);
        cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : c >= 4 && c <= 6 ? 'right' : 'left' };
      }
      row.getCell(4).numFmt = INR_CURRENCY_FMT;
      row.getCell(5).numFmt = INR_CURRENCY_FMT;
      row.getCell(6).numFmt = INR_CURRENCY_FMT;
      rRow++;
    });

    s2.autoFilter = {
      from: { row: rHeaderNum, column: 1 },
      to: { row: rRow - 1, column: 7 },
    };

    const totRow = s2.getRow(rRow);
    totRow.values = [
      '',
      'GRAND TOTAL (TO RECEIVE)',
      `${report.amountToReceiveRows.length} Parties`,
      sumGiven,
      sumRecBack,
      sumBalRec,
      '',
    ];
    totRow.height = 24;
    for (let c = 1; c <= 7; c++) {
      const cell = totRow.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: c === 6 ? GREEN_TEXT : NAVY_HEX } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
      applyThinBorder(cell, true, true);
      cell.alignment = { vertical: 'middle', horizontal: c >= 4 && c <= 6 ? 'right' : 'left' };
    }
    totRow.getCell(4).numFmt = INR_CURRENCY_FMT;
    totRow.getCell(5).numFmt = INR_CURRENCY_FMT;
    totRow.getCell(6).numFmt = INR_CURRENCY_FMT;
  }

  s2.views = [{ state: 'frozen', ySplit: rHeaderNum }];
  autoFitColumns(s2, [8, 22, 16, 22, 24, 22, 28], [10, 34, 20, 26, 26, 26, 44]);
  s2.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // =========================================================================
  // SHEET 3: Amount to Pay (किसको रकम देनी है)
  // =========================================================================
  const s3 = wb.addWorksheet('Amount to Pay');
  styleBanner(
    s3,
    7,
    `Amount to Pay (किसको रकम देनी है) — ${report.metadata.businessName}`,
    `Period: ${report.filters.periodLabel} | Generated: ${report.metadata.generatedAtDisplay}`
  );

  const pHeaderNum = 4;
  const pHeader = s3.getRow(pHeaderNum);
  pHeader.values = [
    'S.No.',
    'Person Name',
    'Mobile Number',
    'Total Amount Taken (₹)',
    'Amount Returned (₹)',
    'Balance to Pay (₹)',
    'Remarks (Separate Receivable / Activity)',
  ];
  styleTableHeaderRow(pHeader, 7, RED_TEXT);

  let pRow = pHeaderNum + 1;
  let sumTaken = 0;
  let sumReturned = 0;
  let sumBalPay = 0;

  if (report.amountToPayRows.length === 0) {
    s3.mergeCells(pRow, 1, pRow, 7);
    const cell = s3.getCell(pRow, 1);
    cell.value = 'No outstanding payable balances matching selected filters.';
    cell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: '64748B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    s3.getRow(pRow).height = 26;
  } else {
    report.amountToPayRows.forEach((item, idx) => {
      sumTaken += item.totalAmountTaken;
      sumReturned += item.amountReturned;
      sumBalPay += item.balanceToPay;

      const remarkParts: string[] = [];
      if (item.hasReceivableAlso) {
        remarkParts.push(`Also Receivable separately: ${formatInr(item.currentReceivableBalance)}`);
      }
      if (item.lastTransactionDate) {
        remarkParts.push(`Last: ${formatDateTimeIST(item.lastTransactionDate)}`);
      }

      const row = s3.getRow(pRow);
      row.values = [
        item.sNo,
        item.personName,
        item.mobileNumber,
        item.totalAmountTaken,
        item.amountReturned,
        item.balanceToPay,
        remarkParts.join(' | ') || 'Active Payable',
      ];
      row.height = 22;

      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 10.5, bold: c === 6, color: { argb: c === 6 ? RED_TEXT : '0F172A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: c === 6 ? RED_BG : idx % 2 === 1 ? ZEBRA_HEX : 'FFFFFF' },
        };
        applyThinBorder(cell);
        cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'center' : c >= 4 && c <= 6 ? 'right' : 'left' };
      }
      row.getCell(4).numFmt = INR_CURRENCY_FMT;
      row.getCell(5).numFmt = INR_CURRENCY_FMT;
      row.getCell(6).numFmt = INR_CURRENCY_FMT;
      pRow++;
    });

    s3.autoFilter = {
      from: { row: pHeaderNum, column: 1 },
      to: { row: pRow - 1, column: 7 },
    };

    const totRow = s3.getRow(pRow);
    totRow.values = [
      '',
      'GRAND TOTAL (TO PAY)',
      `${report.amountToPayRows.length} Parties`,
      sumTaken,
      sumReturned,
      sumBalPay,
      '',
    ];
    totRow.height = 24;
    for (let c = 1; c <= 7; c++) {
      const cell = totRow.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: c === 6 ? RED_TEXT : NAVY_HEX } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
      applyThinBorder(cell, true, true);
      cell.alignment = { vertical: 'middle', horizontal: c >= 4 && c <= 6 ? 'right' : 'left' };
    }
    totRow.getCell(4).numFmt = INR_CURRENCY_FMT;
    totRow.getCell(5).numFmt = INR_CURRENCY_FMT;
    totRow.getCell(6).numFmt = INR_CURRENCY_FMT;
  }

  s3.views = [{ state: 'frozen', ySplit: pHeaderNum }];
  autoFitColumns(s3, [8, 22, 16, 22, 22, 22, 28], [10, 34, 20, 26, 26, 26, 44]);
  s3.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // =========================================================================
  // SHEET 4: Transaction Details
  // =========================================================================
  const s4 = wb.addWorksheet('Transaction Details');
  populateTransactionSheet(
    s4,
    `Transaction Details — ${report.metadata.businessName}`,
    `Period: ${report.filters.periodLabel} | Generated: ${report.metadata.generatedAtDisplay}`,
    report.transactions
  );

  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}

/**
 * Generates a dedicated person-wise .xlsx statement workbook.
 */
export async function generateKhataPersonExcel(
  report: KhataPersonDetailedReportResult
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pakka Chittha / LenDen';
  wb.created = new Date(report.metadata.generatedAt);
  wb.company = report.metadata.businessName;

  const s1 = wb.addWorksheet('Party Summary');
  styleBanner(
    s1,
    4,
    `Party Statement — ${report.contact.name} (${report.metadata.businessName})`,
    `Generated: ${report.metadata.generatedAtDisplay} | Ref: ${report.metadata.referenceNumber}`
  );

  const summaryPairs: Array<[string, string | number, boolean]> = [
    ['Party Name', report.contact.name, false],
    ['Mobile Number', report.contact.phone || '—', false],
    ['Report Period', report.filters.periodLabel, false],
    ['Total Amount Given (Lifetime)', report.summary.totalGiven, true],
    ['Total Amount Received Back (Lifetime)', report.summary.totalReceivedBack, true],
    ['Total Amount Taken (Lifetime)', report.summary.totalTaken, true],
    ['Total Amount Returned (Lifetime)', report.summary.totalReturned, true],
    ['Current Amount to Receive (मुझे लेने हैं)', report.summary.amountToReceive, true],
    ['Current Amount to Pay (मुझे देने हैं)', report.summary.amountToPay, true],
    ['Net Position (मेरी वर्तमान स्थिति)', report.summary.netPosition, true],
  ];

  const hdr = s1.getRow(4);
  hdr.values = ['Particulars', 'Value', 'Status / Context', 'Notes'];
  styleTableHeaderRow(hdr, 4, NAVY_HEX);

  summaryPairs.forEach(([label, value, isCur], idx) => {
    const row = s1.getRow(5 + idx);
    row.values = [
      label,
      value,
      idx === 9 ? report.summary.statusLabel : idx >= 7 ? 'Live Unoffset Balance' : 'Lifetime Cumulative',
      idx === 0 && report.contact.notes ? report.contact.notes : '',
    ];
    row.height = 22;
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: c === 1 || (idx >= 7 && c === 2),
        color: {
          argb:
            idx === 7 && c === 2
              ? GREEN_TEXT
              : idx === 8 && c === 2
                ? RED_TEXT
                : '0F172A',
        },
      };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_HEX } };
      }
      applyThinBorder(cell);
      cell.alignment = { vertical: 'middle', horizontal: isCur && c === 2 ? 'right' : 'left' };
    }
    if (isCur) {
      row.getCell(2).numFmt = INR_CURRENCY_FMT;
    }
  });

  s1.views = [{ state: 'frozen', ySplit: 4 }];
  autoFitColumns(s1, [34, 22, 26, 26], [44, 30, 34, 40]);

  const s2 = wb.addWorksheet('Transaction History');
  populateTransactionSheet(
    s2,
    `${report.contact.name} — Complete Transaction History`,
    `Period: ${report.filters.periodLabel} | Generated: ${report.metadata.generatedAtDisplay}`,
    report.transactions
  );

  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}

