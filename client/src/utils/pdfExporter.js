import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Capture live dashboard DOM content (Summary Cards, Recharts Graphs, Transaction Table & Active Filters)
 * and generate a clean, professional multi-page PDF document without overlapping text or elements.
 */
export async function downloadDashboardPdf({
  elementId = 'dashboard-report-content',
  fileName = 'bank_statement_report.pdf',
  userEmail = '',
  selectedPeriod = 'All Time'
}) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for PDF export.`);
  }

  // Ensure fonts are fully loaded before capturing canvas
  if (document.fonts) {
    await document.fonts.ready;
  }

  // 1. Render DOM to high-res Canvas via html2canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x DPI scale for ultra-sharp typography and crisp SVG chart rendering
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#F8FAFC',
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      // Ensure all glass cards in cloned DOM have solid white backgrounds without backdrop-blur for clean rendering
      const cards = clonedDoc.querySelectorAll('#' + elementId + ' .glass-card');
      cards.forEach((card) => {
        card.style.backdropFilter = 'none';
        card.style.webkitBackdropFilter = 'none';
        card.style.backgroundColor = '#FFFFFF';
      });
    }
  });

  // 2. Initialize A4 jsPDF Document (210mm x 297mm)
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const marginX = 8; // 8mm left/right margin
  const marginTop = 8; // 8mm top margin
  const marginBottom = 18; // 18mm bottom margin for footer
  const printWidth = pageWidth - marginX * 2; // 194mm printable width
  const printHeight = pageHeight - marginTop - marginBottom; // 271mm printable height per page

  // Calculate canvas height per A4 printable page in pixels
  const canvasPageHeightPx = (printHeight * canvas.width) / printWidth;
  const totalPages = Math.ceil(canvas.height / canvasPageHeightPx) || 1;

  let sY = 0; // source Y position on canvas in pixels

  for (let i = 1; i <= totalPages; i++) {
    if (i > 1) {
      pdf.addPage();
    }

    const currentSlicePx = Math.min(canvasPageHeightPx, canvas.height - sY);

    if (currentSlicePx > 0) {
      // Create a page-sized temporary canvas slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = currentSlicePx;

      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, sY, canvas.width, currentSlicePx,
        0, 0, canvas.width, currentSlicePx
      );

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
      const sliceHeightMm = (currentSlicePx * printWidth) / canvas.width;

      // Add page content image slice
      pdf.addImage(pageImgData, 'JPEG', marginX, marginTop, printWidth, sliceHeightMm, undefined, 'FAST');
    }

    // Add clean, solid footer background bar & page number at bottom of page
    const footerY = pageHeight - 12; // 285mm
    pdf.setFillColor(248, 250, 252); // #F8FAFC
    pdf.rect(0, footerY, pageWidth, 12, 'F');

    pdf.setDrawColor(226, 232, 240); // #E2E8F0 divider line
    pdf.setLineWidth(0.3);
    pdf.line(marginX, footerY, pageWidth - marginX, footerY);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139); // #64748B
    pdf.text(
      `Page ${i} of ${totalPages}  |  Bank Statement & Expense Report (${selectedPeriod})`,
      pageWidth / 2,
      footerY + 7,
      { align: 'center' }
    );

    sY += canvasPageHeightPx;
  }

  // 3. Save generated PDF file
  pdf.save(fileName);
}

