import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatDateTimeIST,
  formatInr,
  KhataConsolidatedReportResult,
  KhataPersonDetailedReportResult,
  ReportTransactionRow,
} from '@/lib/services/khataReportService';

type DocWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

// Cached base64 assets in module scope for serverless cold/warm speed
let cachedFontRegularBase64: string | null = null;
let cachedFontBoldBase64: string | null = null;
let cachedLogoBuffer: Buffer | null | undefined = undefined;

const COLOR_NAVY: [number, number, number] = [7, 31, 56];
const COLOR_NAVY_SOFT: [number, number, number] = [30, 58, 95];
const COLOR_SLATE_DARK: [number, number, number] = [15, 23, 42];
const COLOR_SLATE_MUTED: [number, number, number] = [100, 116, 139];
const COLOR_BORDER: [number, number, number] = [203, 213, 225];
const COLOR_ZEBRA: [number, number, number] = [248, 250, 252];
const COLOR_GREEN: [number, number, number] = [6, 95, 70];
const COLOR_GREEN_BG: [number, number, number] = [236, 253, 245];
const COLOR_RED: [number, number, number] = [153, 27, 27];
const COLOR_RED_BG: [number, number, number] = [254, 242, 242];
const COLOR_BLUE_BG: [number, number, number] = [239, 246, 255];

function loadNotoFonts(): { regular: string | null; bold: string | null } {
  try {
    if (!cachedFontRegularBase64) {
      const regPath = path.join(
        process.cwd(),
        'src',
        'lib',
        'reports',
        'fonts',
        'NotoSans-Regular.ttf'
      );
      if (fs.existsSync(regPath)) {
        cachedFontRegularBase64 = fs.readFileSync(regPath).toString('base64');
      }
    }
    if (!cachedFontBoldBase64) {
      const boldPath = path.join(
        process.cwd(),
        'src',
        'lib',
        'reports',
        'fonts',
        'NotoSans-Bold.ttf'
      );
      if (fs.existsSync(boldPath)) {
        cachedFontBoldBase64 = fs.readFileSync(boldPath).toString('base64');
      }
    }
  } catch {
    // Graceful fallback handled below
  }
  return { regular: cachedFontRegularBase64, bold: cachedFontBoldBase64 };
}

function loadLogoPng(): Buffer | null {
  if (cachedLogoBuffer !== undefined) return cachedLogoBuffer;
  try {
    const candidates = [
      path.join(process.cwd(), 'public', 'pakka-chittha-logo.png'),
      path.join(process.cwd(), 'public', 'logo.png'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        cachedLogoBuffer = fs.readFileSync(candidate);
        return cachedLogoBuffer;
      }
    }
  } catch {
    // Logo optional if missing
  }
  cachedLogoBuffer = null;
  return null;
}

function createConfiguredA4Doc(): { doc: DocWithTable; fontName: string; supportsInrSymbol: boolean } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  }) as DocWithTable;

  const fonts = loadNotoFonts();
  let fontName = 'helvetica';
  let supportsInrSymbol = false;

  if (fonts.regular && fonts.bold) {
    doc.addFileToVFS('NotoSans-Regular.ttf', fonts.regular);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.addFileToVFS('NotoSans-Bold.ttf', fonts.bold);
    doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
    fontName = 'NotoSans';
    supportsInrSymbol = true;
  }

  doc.setFont(fontName, 'normal');
  return { doc, fontName, supportsInrSymbol };
}

function money(amount: number, supportsInrSymbol: boolean, includeSign = false): string {
  const formatted = formatInr(amount, includeSign);
  return supportsInrSymbol ? formatted : formatted.replace(/₹/g, 'INR ');
}

function ensureSpace(doc: DocWithTable, currentY: number, neededMm: number): number {
  const pageBottomLimit = 277; // Leaves room for clean bottom footer (margin bottom = 18)
  if (currentY + neededMm > pageBottomLimit) {
    doc.addPage();
    return 24;
  }
  return currentY;
}

function drawStatementHeader(
  doc: DocWithTable,
  fontName: string,
  options: {
    businessName: string;
    businessPhone: string | null;
    businessEmail: string | null;
    reportTitle: string;
    reportSubtitle: string;
    periodLabel: string;
    generatedAtDisplay: string;
    referenceNumber: string;
    filterSummary: string;
  }
): number {
  // Top corporate navy band
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, 210, 31, 'F');

  // Subtle gold/emerald accent hairline below banner
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 31, 210, 1.1, 'F');

  const logo = loadLogoPng();
  let titleLeftX = 12;
  if (logo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 6.5, 17, 17, 2.5, 2.5, 'F');
      doc.addImage(logo, 'PNG', 13.5, 8, 14, 14);
      titleLeftX = 33;
    } catch {
      titleLeftX = 12;
    }
  }

  // Left: Brand + Statement Title
  doc.setTextColor(148, 226, 200);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.text('PAKKA CHITTHA / LENDEN FINANCIAL STATEMENT', titleLeftX, 9.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(options.reportTitle, titleLeftX, 16.5);

  doc.setTextColor(226, 232, 240);
  doc.setFont(fontName, 'normal');
  doc.setFontSize(9);
  doc.text(options.businessName, titleLeftX, 22);

  const contactBits = [options.businessPhone, options.businessEmail].filter(Boolean).join('  |  ');
  if (contactBits) {
    doc.setFontSize(8);
    doc.setTextColor(186, 202, 220);
    doc.text(contactBits, titleLeftX, 26.8);
  }

  // Right: Reference, Generated Date & Currency Pill
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.text(`Ref: ${options.referenceNumber}`, 198, 10, { align: 'right' });

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated: ${options.generatedAtDisplay}`, 198, 15.5, { align: 'right' });
  doc.text(`Period: ${options.periodLabel}`, 198, 20.8, { align: 'right' });
  doc.text('Currency: INR (Indian Rupee)', 198, 26, { align: 'right' });

  // Active Filter Metadata Strip
  doc.setFillColor(...COLOR_ZEBRA);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(12, 35, 186, 10, 1.5, 1.5, 'FD');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.text('SCOPE & FILTERS:', 15, 41);

  doc.setFont(fontName, 'normal');
  doc.setTextColor(...COLOR_SLATE_DARK);
  const clippedFilter =
    options.filterSummary.length > 98
      ? `${options.filterSummary.slice(0, 95)}...`
      : options.filterSummary;
  doc.text(clippedFilter, 47, 41);

  return 49;
}

function drawSectionHeading(
  doc: DocWithTable,
  fontName: string,
  y: number,
  title: string,
  subtitle: string,
  accentColor: [number, number, number]
): number {
  const safeY = ensureSpace(doc, y, 22);

  doc.setFillColor(...accentColor);
  doc.rect(12, safeY, 2.5, 9.5, 'F');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_NAVY);
  doc.text(title, 17, safeY + 4.2);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SLATE_MUTED);
  doc.text(subtitle, 17, safeY + 8.5);

  return safeY + 12;
}

function decorateAllPagesHeaderAndFooter(
  doc: DocWithTable,
  fontName: string,
  options: {
    businessName: string;
    reportTitle: string;
    periodLabel: string;
    referenceNumber: string;
  }
) {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Continuation header on Page 2+
    if (page > 1) {
      doc.setFillColor(...COLOR_NAVY);
      doc.rect(12, 8, 186, 9, 'F');
      doc.setFont(fontName, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`${options.businessName} — ${options.reportTitle}`, 15, 13.7);

      doc.setFont(fontName, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      doc.text(`${options.periodLabel} | Ref: ${options.referenceNumber}`, 195, 13.7, {
        align: 'right',
      });
    }

    // Bottom Divider & Footer on Every Page
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.line(12, 283, 198, 283);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text(
      `Pakka Chittha / LenDen Statement • Ref: ${options.referenceNumber} • Never auto-offset balances`,
      12,
      288.5
    );

    doc.setFont(fontName, 'bold');
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`Page ${page} of ${totalPages}`, 198, 288.5, { align: 'right' });
  }
}

function renderTransactionAutoTable(
  doc: DocWithTable,
  fontName: string,
  supportsInrSymbol: boolean,
  startY: number,
  transactions: ReportTransactionRow[]
): number {
  if (transactions.length === 0) {
    const safeY = ensureSpace(doc, startY, 14);
    doc.setFillColor(...COLOR_ZEBRA);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(12, safeY, 186, 10, 1.5, 1.5, 'FD');
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text('No transactions recorded for the selected filters.', 105, safeY + 6.3, {
      align: 'center',
    });
    return safeY + 14;
  }

  autoTable(doc, {
    startY,
    margin: { top: 22, right: 12, bottom: 18, left: 12 },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      font: fontName,
      fontSize: 7.4,
      cellPadding: 2,
      textColor: COLOR_SLATE_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      font: fontName,
      fontStyle: 'bold',
      fontSize: 7.6,
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: COLOR_ZEBRA,
    },
    head: [
      [
        'Date & Time (IST)',
        'Party',
        'Type',
        'Mode',
        'Amount',
        'Notes',
        'Prev Bal.',
        'Updated Bal.',
      ],
    ],
    body: transactions.map((tx) => {
      const notesBits = [tx.notes, tx.paymentRef ? `Ref: ${tx.paymentRef}` : null]
        .filter(Boolean)
        .join(' | ');
      return [
        formatDateTimeIST(tx.date),
        tx.personName,
        tx.activityLabel,
        tx.paymentModeLabel,
        money(tx.amount, supportsInrSymbol),
        notesBits || '—',
        money(tx.previousBalance, supportsInrSymbol),
        money(tx.updatedBalance, supportsInrSymbol),
      ];
    }),
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 24 },
      2: { cellWidth: 23, fontStyle: 'bold' },
      3: { cellWidth: 16 },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 30 },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell(hook) {
      if (hook.section === 'body') {
        const tx = transactions[hook.row.index];
        if (!tx) return;
        if (hook.column.index === 2 || hook.column.index === 4) {
          hook.cell.styles.textColor =
            tx.balanceBucket === 'TO_RECEIVE' ? COLOR_GREEN : COLOR_RED;
        }
        if (hook.column.index === 7) {
          hook.cell.styles.textColor = COLOR_NAVY;
        }
      }
    },
  });

  return (doc.lastAutoTable?.finalY ?? startY) + 8;
}

/**
 * Generates an official A4 multi-page financial statement PDF for Consolidated Khata Reports.
 */
export async function generateKhataConsolidatedPdf(
  report: KhataConsolidatedReportResult
): Promise<Buffer> {
  const { doc, fontName, supportsInrSymbol } = createConfiguredA4Doc();

  const filterSummaryParts = [
    `Period: ${report.filters.periodLabel}`,
    `Direction: ${report.filters.direction}`,
    `Mode: ${report.filters.paymentMode}`,
    `Status: ${report.filters.accountStatus}`,
  ];
  if (report.filters.search) filterSummaryParts.push(`Search: "${report.filters.search}"`);
  if (report.filters.mobile) filterSummaryParts.push(`Mobile: "${report.filters.mobile}"`);

  let y = drawStatementHeader(doc, fontName, {
    businessName: report.metadata.businessName,
    businessPhone: report.metadata.businessPhone,
    businessEmail: report.metadata.businessEmail,
    reportTitle: 'Personal Khata Consolidated Statement',
    reportSubtitle: report.metadata.reportSubtitle,
    periodLabel: report.filters.periodLabel,
    generatedAtDisplay: report.metadata.generatedAtDisplay,
    referenceNumber: report.metadata.referenceNumber,
    filterSummary: filterSummaryParts.join('  |  '),
  });

  // Executive 4 KPI Cards Row (A4 width 186mm -> 4 x 44.25mm cards with 3mm gap)
  const cardW = 44.25;
  const gap = 3;
  const kpiCards: Array<{
    label: string;
    sub: string;
    value: string;
    bg: [number, number, number];
    fg: [number, number, number];
    border: [number, number, number];
  }> = [
      {
        label: 'TOTAL TO RECEIVE',
        sub: `${report.summary.receivableAccountCount} Accounts (Lena Hai)`,
        value: money(report.summary.totalAmountToReceive, supportsInrSymbol),
        bg: COLOR_GREEN_BG,
        fg: COLOR_GREEN,
        border: [167, 243, 208],
      },
      {
        label: 'TOTAL TO PAY',
        sub: `${report.summary.payableAccountCount} Accounts (Dena Hai)`,
        value: money(report.summary.totalAmountToPay, supportsInrSymbol),
        bg: COLOR_RED_BG,
        fg: COLOR_RED,
        border: [254, 202, 202],
      },
      {
        label: 'NET POSITION',
        sub: report.summary.netPosition >= 0 ? 'Net Receivable (Vartaman Sthiti)' : 'Net Payable (Vartaman Sthiti)',
        value: money(report.summary.netPosition, supportsInrSymbol, true),
        bg: COLOR_BLUE_BG,
        fg: report.summary.netPosition >= 0 ? COLOR_GREEN : COLOR_RED,
        border: [191, 219, 254],
      },
      {
        label: 'ACTIVE ACCOUNTS',
        sub: `${report.summary.dualBalanceAccountCount} Dual | ${report.summary.settledAccountCount} Settled`,
        value: String(report.summary.totalActiveAccounts),
        bg: COLOR_ZEBRA,
        fg: COLOR_NAVY,
        border: COLOR_BORDER,
      },
    ];

  kpiCards.forEach((card, idx) => {
    const cx = 12 + idx * (cardW + gap);
    doc.setFillColor(...card.bg);
    doc.setDrawColor(...card.border);
    doc.roundedRect(cx, y, cardW, 21, 2, 2, 'FD');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text(card.label, cx + 3, y + 5.5);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...card.fg);
    doc.text(card.value, cx + 3, y + 12.8);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    const clippedSub = card.sub.length > 30 ? `${card.sub.slice(0, 27)}...` : card.sub;
    doc.text(clippedSub, cx + 3, y + 18);
  });

  y += 26;

  // Compact Live vs Period vs Historical Totals Strip
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(12, y, 186, 17, 1.5, 1.5, 'FD');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('PERIOD ACTIVITY vs LIFETIME TOTALS (Live Outstanding above reflects full ledger history)', 15, y + 5.2);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...COLOR_SLATE_DARK);
  doc.text(
    `Selected Period -> Given: ${money(report.periodSummary.totalGivenInPeriod, supportsInrSymbol)}  |  Received Back: ${money(report.periodSummary.totalReceivedBackInPeriod, supportsInrSymbol)}  |  Taken: ${money(report.periodSummary.totalTakenInPeriod, supportsInrSymbol)}  |  Returned: ${money(report.periodSummary.totalReturnedInPeriod, supportsInrSymbol)}`,
    15,
    y + 10.2
  );
  doc.setTextColor(...COLOR_SLATE_MUTED);
  doc.text(
    `Lifetime Historical -> Given: ${money(report.historicalSummary.totalGivenLifetime, supportsInrSymbol)}  |  Received Back: ${money(report.historicalSummary.totalReceivedBackLifetime, supportsInrSymbol)}  |  Taken: ${money(report.historicalSummary.totalTakenLifetime, supportsInrSymbol)}  |  Returned: ${money(report.historicalSummary.totalReturnedLifetime, supportsInrSymbol)}`,
    15,
    y + 14.5
  );

  y += 22;

  // =========================================================================
  // SECTION A: Amount to Receive (Lena Hai)
  // =========================================================================
  y = drawSectionHeading(
    doc,
    fontName,
    y,
    'SECTION A: AMOUNT TO RECEIVE (Kisse Kitni Rakam Leni Hai)',
    `Outstanding receivables only (${report.amountToReceiveRows.length} accounts). Never auto-offset against payables.`,
    COLOR_GREEN
  );

  if (report.amountToReceiveRows.length === 0) {
    doc.setFillColor(...COLOR_ZEBRA);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(12, y, 186, 10, 1.5, 1.5, 'FD');
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text('No outstanding receivable balances for current filters.', 105, y + 6.3, {
      align: 'center',
    });
    y += 15;
  } else {
    const totGiven = report.amountToReceiveRows.reduce((s, r) => s + r.totalAmountGiven, 0);
    const totRecBack = report.amountToReceiveRows.reduce((s, r) => s + r.amountReceivedBack, 0);
    const totBalRec = report.amountToReceiveRows.reduce((s, r) => s + r.balanceToReceive, 0);

    autoTable(doc, {
      startY: y,
      margin: { top: 22, right: 12, bottom: 18, left: 12 },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      theme: 'grid',
      styles: {
        font: fontName,
        fontSize: 8.2,
        cellPadding: 2.3,
        textColor: COLOR_SLATE_DARK,
        lineColor: COLOR_BORDER,
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fontSize: 8.2,
        fillColor: COLOR_GREEN,
        textColor: [255, 255, 255],
      },
      alternateRowStyles: { fillColor: COLOR_ZEBRA },
      head: [
        [
          'S.No.',
          'Person Name',
          'Mobile Number',
          'Total Given',
          'Received Back',
          'Balance to Receive',
        ],
      ],
      body: [
        ...report.amountToReceiveRows.map((row) => [
          String(row.sNo),
          row.hasPayableAlso ? `${row.personName} (*)` : row.personName,
          row.mobileNumber,
          money(row.totalAmountGiven, supportsInrSymbol),
          money(row.amountReceivedBack, supportsInrSymbol),
          money(row.balanceToReceive, supportsInrSymbol),
        ]),
        [
          '',
          `TOTAL RECEIVABLE (${report.amountToReceiveRows.length})`,
          '',
          money(totGiven, supportsInrSymbol),
          money(totRecBack, supportsInrSymbol),
          money(totBalRec, supportsInrSymbol),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 13, halign: 'center' },
        1: { cellWidth: 49 },
        2: { cellWidth: 32 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_GREEN },
      },
      didParseCell(hook) {
        if (hook.section === 'body' && hook.row.index === report.amountToReceiveRows.length) {
          hook.cell.styles.fillColor = COLOR_GREEN_BG;
          hook.cell.styles.fontStyle = 'bold';
          hook.cell.styles.textColor = hook.column.index === 5 ? COLOR_GREEN : COLOR_NAVY;
        }
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // =========================================================================
  // SECTION B: Amount to Pay (Dena Hai)
  // =========================================================================
  y = drawSectionHeading(
    doc,
    fontName,
    y,
    'SECTION B: AMOUNT TO PAY (Kisko Kitni Rakam Deni Hai)',
    `Outstanding payables only (${report.amountToPayRows.length} accounts). Reported independently.`,
    COLOR_RED
  );

  if (report.amountToPayRows.length === 0) {
    doc.setFillColor(...COLOR_ZEBRA);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(12, y, 186, 10, 1.5, 1.5, 'FD');
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text('No outstanding payable balances for current filters.', 105, y + 6.3, {
      align: 'center',
    });
    y += 15;
  } else {
    const totTaken = report.amountToPayRows.reduce((s, r) => s + r.totalAmountTaken, 0);
    const totReturned = report.amountToPayRows.reduce((s, r) => s + r.amountReturned, 0);
    const totBalPay = report.amountToPayRows.reduce((s, r) => s + r.balanceToPay, 0);

    autoTable(doc, {
      startY: y,
      margin: { top: 22, right: 12, bottom: 18, left: 12 },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      theme: 'grid',
      styles: {
        font: fontName,
        fontSize: 8.2,
        cellPadding: 2.3,
        textColor: COLOR_SLATE_DARK,
        lineColor: COLOR_BORDER,
        lineWidth: 0.2,
        valign: 'middle',
      },
      headStyles: {
        font: fontName,
        fontStyle: 'bold',
        fontSize: 8.2,
        fillColor: COLOR_RED,
        textColor: [255, 255, 255],
      },
      alternateRowStyles: { fillColor: COLOR_ZEBRA },
      head: [
        [
          'S.No.',
          'Person Name',
          'Mobile Number',
          'Total Taken',
          'Amount Returned',
          'Balance to Pay',
        ],
      ],
      body: [
        ...report.amountToPayRows.map((row) => [
          String(row.sNo),
          row.hasReceivableAlso ? `${row.personName} (*)` : row.personName,
          row.mobileNumber,
          money(row.totalAmountTaken, supportsInrSymbol),
          money(row.amountReturned, supportsInrSymbol),
          money(row.balanceToPay, supportsInrSymbol),
        ]),
        [
          '',
          `TOTAL PAYABLE (${report.amountToPayRows.length})`,
          '',
          money(totTaken, supportsInrSymbol),
          money(totReturned, supportsInrSymbol),
          money(totBalPay, supportsInrSymbol),
        ],
      ],
      columnStyles: {
        0: { cellWidth: 13, halign: 'center' },
        1: { cellWidth: 49 },
        2: { cellWidth: 32 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_RED },
      },
      didParseCell(hook) {
        if (hook.section === 'body' && hook.row.index === report.amountToPayRows.length) {
          hook.cell.styles.fillColor = COLOR_RED_BG;
          hook.cell.styles.fontStyle = 'bold';
          hook.cell.styles.textColor = hook.column.index === 5 ? COLOR_RED : COLOR_NAVY;
        }
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  // Note if dual-balance contacts exist
  if (report.summary.dualBalanceAccountCount > 0) {
    y = ensureSpace(doc, y, 10);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text(
      `(*) ${report.summary.dualBalanceAccountCount} party account(s) have both receivable and payable balances, intentionally separated without auto-offsetting.`,
      12,
      y + 3
    );
    y += 8;
  }

  // =========================================================================
  // SECTION C: Complete Transaction Details (with Previous & Updated Balance)
  // =========================================================================
  y = drawSectionHeading(
    doc,
    fontName,
    y,
    'SECTION C: TRANSACTION DETAILS (Period Activity & Running Balances)',
    `${report.transactions.length} matching entries. Previous & Updated Balance show exact chronological balance of that bucket.`,
    COLOR_NAVY_SOFT
  );

  y = renderTransactionAutoTable(doc, fontName, supportsInrSymbol, y, report.transactions);

  // =========================================================================
  // Final Financial Reconciliation Box
  // =========================================================================
  y = ensureSpace(doc, y, 24);
  doc.setFillColor(...COLOR_BLUE_BG);
  doc.setDrawColor(...COLOR_NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, y, 186, 20, 2, 2, 'FD');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('STATEMENT RECONCILIATION SUMMARY', 16, y + 6.2);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...COLOR_SLATE_DARK);
  doc.text(
    `Total Receivable: ${money(report.summary.totalAmountToReceive, supportsInrSymbol)}   |   Total Payable: ${money(report.summary.totalAmountToPay, supportsInrSymbol)}   |   Active Accounts: ${report.summary.totalActiveAccounts}`,
    16,
    y + 11.8
  );

  doc.setFont(fontName, 'bold');
  doc.setTextColor(...(report.summary.netPosition >= 0 ? COLOR_GREEN : COLOR_RED));
  doc.text(
    `Final Net Position (Receive - Pay): ${money(report.summary.netPosition, supportsInrSymbol, true)}  (${report.summary.netPosition >= 0 ? 'Net Receivable' : 'Net Payable'})`,
    16,
    y + 17
  );

  decorateAllPagesHeaderAndFooter(doc, fontName, {
    businessName: report.metadata.businessName,
    reportTitle: report.metadata.reportTitle,
    periodLabel: report.filters.periodLabel,
    referenceNumber: report.metadata.referenceNumber,
  });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generates an official A4 Person-wise Detailed Financial Statement PDF.
 */
export async function generateKhataPersonPdf(
  report: KhataPersonDetailedReportResult
): Promise<Buffer> {
  const { doc, fontName, supportsInrSymbol } = createConfiguredA4Doc();

  const filterSummary = [
    `Party: ${report.contact.name}`,
    report.contact.phone ? `Mobile: ${report.contact.phone}` : 'Mobile: N/A',
    `Period: ${report.filters.periodLabel}`,
    `Mode: ${report.filters.paymentMode}`,
  ].join('  |  ');

  let y = drawStatementHeader(doc, fontName, {
    businessName: report.metadata.businessName,
    businessPhone: report.metadata.businessPhone,
    businessEmail: report.metadata.businessEmail,
    reportTitle: `Party Ledger Statement — ${report.contact.name}`,
    reportSubtitle: report.metadata.reportSubtitle,
    periodLabel: report.filters.periodLabel,
    generatedAtDisplay: report.metadata.generatedAtDisplay,
    referenceNumber: report.metadata.referenceNumber,
    filterSummary,
  });

  // 3 Live Position Cards (Receivable, Payable, Net Position)
  const cardW = 60;
  const gap = 3;
  const cards: Array<{
    label: string;
    value: string;
    bg: [number, number, number];
    fg: [number, number, number];
    border: [number, number, number];
  }> = [
      {
        label: 'CURRENT TO RECEIVE (Lena Hai)',
        value: money(report.summary.amountToReceive, supportsInrSymbol),
        bg: COLOR_GREEN_BG,
        fg: COLOR_GREEN,
        border: [167, 243, 208],
      },
      {
        label: 'CURRENT TO PAY (Dena Hai)',
        value: money(report.summary.amountToPay, supportsInrSymbol),
        bg: COLOR_RED_BG,
        fg: COLOR_RED,
        border: [254, 202, 202],
      },
      {
        label: 'NET POSITION (Receive - Pay)',
        value: money(report.summary.netPosition, supportsInrSymbol, true),
        bg: COLOR_BLUE_BG,
        fg: report.summary.netPosition >= 0 ? COLOR_GREEN : COLOR_RED,
        border: [191, 219, 254],
      },
    ];

  cards.forEach((c, idx) => {
    const cx = 12 + idx * (cardW + gap);
    doc.setFillColor(...c.bg);
    doc.setDrawColor(...c.border);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'FD');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(...COLOR_SLATE_MUTED);
    doc.text(c.label, cx + 3.5, y + 6);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...c.fg);
    doc.text(c.value, cx + 3.5, y + 13.8);
  });

  y += 22;

  // Lifetime Totals Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(12, y, 186, 15, 1.5, 1.5, 'FD');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('LIFETIME PARTY TOTALS (Complete History)', 15, y + 5.2);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SLATE_DARK);
  doc.text(
    `Total Given: ${money(report.summary.totalGiven, supportsInrSymbol)}   |   Received Back: ${money(report.summary.totalReceivedBack, supportsInrSymbol)}   |   Total Taken: ${money(report.summary.totalTaken, supportsInrSymbol)}   |   Returned: ${money(report.summary.totalReturned, supportsInrSymbol)}`,
    15,
    y + 11
  );

  y += 20;

  y = drawSectionHeading(
    doc,
    fontName,
    y,
    'COMPLETE TRANSACTION HISTORY (With Chronological Running Balances)',
    `Showing ${report.transactions.length} matching transactions. Every row displays previous and updated balance.`,
    COLOR_NAVY
  );

  renderTransactionAutoTable(doc, fontName, supportsInrSymbol, y, report.transactions);

  decorateAllPagesHeaderAndFooter(doc, fontName, {
    businessName: report.metadata.businessName,
    reportTitle: report.metadata.reportTitle,
    periodLabel: report.filters.periodLabel,
    referenceNumber: report.metadata.referenceNumber,
  });

  return Buffer.from(doc.output('arraybuffer'));
}

