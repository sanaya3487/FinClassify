const PDFDocument = require('pdfkit');

/**
 * Generate a comprehensive, professional PDF report for user transactions & category analytics
 */
function generatePdfReport(res, { userEmail, summaryData, transactions, dateRange, monthlyTrends }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Stream PDF directly to HTTP response
  doc.pipe(res);

  // Colors Palette
  const PRIMARY = '#4F46E5'; // Indigo
  const DARK_TEXT = '#0F172A';
  const MUTED_TEXT = '#64748B';
  const LIGHT_BG = '#F8FAFC';
  const BORDER_COLOR = '#E2E8F0';

  // --- HEADER BANNER ---
  doc
    .fillColor('#1E1B4B')
    .rect(0, 0, 595.28, 85)
    .fill();

  doc
    .fillColor('#FFFFFF')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('FINCLASSY FINANCIAL REPORT', 40, 24);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#C7D2FE')
    .text(`ACCOUNT: ${userEmail} | PERIOD: ${dateRange || 'All Time'}`, 40, 54);

  let currentY = 105;

  // --- EXECUTIVE SUMMARY KPIS ---
  doc
    .fillColor(DARK_TEXT)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Executive Summary', 40, currentY);

  currentY += 22;

  const totalSpend = summaryData.totalSpend || 0;
  const totalIncome = summaryData.totalIncome || 0;
  const netBalance = totalIncome - totalSpend;
  const topCategory = summaryData.topCategory || 'N/A';
  const totalTxns = summaryData.totalTxns || 0;

  // KPI Box 1: Total Expense
  doc
    .roundedRect(40, currentY, 120, 55, 6)
    .fillAndStroke('#FEF2F2', '#FECACA');
  doc
    .fillColor('#DC2626')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('TOTAL EXPENSE', 48, currentY + 10);
  doc
    .fillColor(DARK_TEXT)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`INR ${totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 48, currentY + 28);

  // KPI Box 2: Total Income
  doc
    .roundedRect(170, currentY, 120, 55, 6)
    .fillAndStroke('#ECFDF5', '#A7F3D0');
  doc
    .fillColor('#059669')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('TOTAL INCOME', 178, currentY + 10);
  doc
    .fillColor(DARK_TEXT)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`INR ${totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 178, currentY + 28);

  // KPI Box 3: Net Balance
  doc
    .roundedRect(300, currentY, 120, 55, 6)
    .fillAndStroke(netBalance >= 0 ? '#EFF6FF' : '#FFF1F2', netBalance >= 0 ? '#BFDBFE' : '#FECDD3');
  doc
    .fillColor(netBalance >= 0 ? '#2563EB' : '#E11D48')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('NET BALANCE', 308, currentY + 10);
  doc
    .fillColor(DARK_TEXT)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`INR ${netBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 308, currentY + 28);

  // KPI Box 4: Top Category
  doc
    .roundedRect(430, currentY, 125, 55, 6)
    .fillAndStroke('#F5F3FF', '#DDD6FE');
  doc
    .fillColor('#7C3AED')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('TOP SPEND CATEGORY', 438, currentY + 10);
  doc
    .fillColor(DARK_TEXT)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(topCategory, 438, currentY + 28, { width: 110, height: 20 });

  currentY += 70;

  // --- MONTHLY CASHFLOW TRENDS SUMMARY (If All Time / Multiple Months) ---
  if (Array.isArray(monthlyTrends) && monthlyTrends.length > 1) {
    doc
      .fillColor(DARK_TEXT)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Monthly Cashflow Summary', 40, currentY);

    currentY += 18;

    // Table Header
    doc
      .fillColor(PRIMARY)
      .rect(40, currentY, 515, 18)
      .fill();

    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('MONTH', 50, currentY + 4)
      .text('TOTAL EXPENSE (DEBITS)', 180, currentY + 4)
      .text('TOTAL INCOME (CREDITS)', 360, currentY + 4);

    currentY += 18;

    monthlyTrends.forEach((m, idx) => {
      if (currentY > 730) {
        doc.addPage();
        currentY = 40;
      }

      const rowBg = idx % 2 === 0 ? LIGHT_BG : '#FFFFFF';
      doc
        .fillColor(rowBg)
        .rect(40, currentY, 515, 18)
        .fill();

      const spendVal = parseFloat(m.spend || 0);
      const incomeVal = parseFloat(m.income || 0);

      doc
        .fillColor(DARK_TEXT)
        .fontSize(8.5)
        .font('Helvetica')
        .text(m.month, 50, currentY + 4)
        .text(`INR ${spendVal.toLocaleString('en-IN')}`, 180, currentY + 4)
        .text(`INR ${incomeVal.toLocaleString('en-IN')}`, 360, currentY + 4);

      currentY += 18;
    });

    currentY += 15;
  }

  // --- CATEGORY SPEND BREAKDOWN TABLE ---
  if (currentY > 650) {
    doc.addPage();
    currentY = 40;
  }

  doc
    .fillColor(DARK_TEXT)
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('Category Spending Breakdown', 40, currentY);

  currentY += 18;

  // Table Header
  doc
    .fillColor(PRIMARY)
    .rect(40, currentY, 515, 18)
    .fill();

  doc
    .fillColor('#FFFFFF')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('CATEGORY', 50, currentY + 4)
    .text('TRANSACTION COUNT', 220, currentY + 4)
    .text('TOTAL SPEND (INR)', 350, currentY + 4)
    .text('SHARE (%)', 470, currentY + 4);

  currentY += 18;

  const categories = summaryData.categoryBreakdown || [];
  categories.forEach((cat, idx) => {
    if (currentY > 730) {
      doc.addPage();
      currentY = 40;
    }

    const rowBg = idx % 2 === 0 ? LIGHT_BG : '#FFFFFF';
    doc
      .fillColor(rowBg)
      .rect(40, currentY, 515, 18)
      .fill();

    const amountVal = parseFloat(cat.total_amount || 0);
    const percentage = totalSpend > 0 ? ((amountVal / totalSpend) * 100).toFixed(1) : '0';

    doc
      .fillColor(DARK_TEXT)
      .fontSize(8.5)
      .font('Helvetica')
      .text(cat.category_name, 50, currentY + 4)
      .text(String(cat.txn_count), 220, currentY + 4)
      .text(`INR ${amountVal.toLocaleString('en-IN')}`, 350, currentY + 4)
      .text(`${percentage}%`, 470, currentY + 4);

    currentY += 18;
  });

  // Dynamic multi-page footer page numbers across all pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(MUTED_TEXT)
      .text(
        `Page ${i + 1} of ${range.count}  |  FinClassify — Executive Financial Intelligence Report (${dateRange || 'All Time'})`,
        40,
        812,
        { align: 'center', width: 515 }
      );
  }

  doc.end();
}

module.exports = { generatePdfReport };
