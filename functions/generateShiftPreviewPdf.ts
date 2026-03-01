import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, month, staffEmail, staffName, entries, notes } = await req.json();

    // Create PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`${year}年${month}月 シフト予定`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Staff Name
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${staffName}様`, 15, yPosition);
    yPosition += 10;

    // Notes if exists
    if (notes && notes.trim()) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('特記事項', 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      const splitNotes = doc.splitTextToSize(notes, pageWidth - 30);
      doc.text(splitNotes, 15, yPosition);
      yPosition += splitNotes.length * 5 + 4;
    }

    // Shift Entries
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('シフト予定一覧', 15, yPosition);
    yPosition += 8;

    // Filter entries for this staff
    const staffEntries = entries
      .filter(e => e.staff_email === staffEmail)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (staffEntries.length === 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('シフトはありません', 15, yPosition);
    } else {
      // Table headers
      const headers = ['日付', '曜日', '開始時刻', '終了時刻', 'シフト種別', '備考'];
      const colWidths = [25, 15, 20, 20, 25, 40];
      const headerHeight = 8;

      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(45, 74, 111);
      doc.setTextColor(255, 255, 255);

      let xPos = 15;
      headers.forEach((header, i) => {
        doc.rect(xPos, yPosition - headerHeight + 1, colWidths[i], headerHeight, 'F');
        doc.text(header, xPos + 2, yPosition - 2, { maxWidth: colWidths[i] - 4 });
        xPos += colWidths[i];
      });

      yPosition += 2;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');

      // Table rows
      staffEntries.forEach((entry, idx) => {
        const date = new Date(entry.date + 'T00:00:00');
        const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const dayStr = dayLabels[date.getDay()];

        const rowHeight = 8;
        yPosition += rowHeight;

        // Check if we need a new page
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 15;

          // Redraw headers on new page
          doc.setFontSize(9);
          doc.setFont(undefined, 'bold');
          doc.setFillColor(45, 74, 111);
          doc.setTextColor(255, 255, 255);

          xPos = 15;
          headers.forEach((header, i) => {
            doc.rect(xPos, yPosition - headerHeight + 1, colWidths[i], headerHeight, 'F');
            doc.text(header, xPos + 2, yPosition - 2, { maxWidth: colWidths[i] - 4 });
            xPos += colWidths[i];
          });

          yPosition += 2;
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
        }

        // Draw row background
        if (idx % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(15, yPosition - rowHeight + 1, pageWidth - 30, rowHeight, 'F');
        }

        // Draw cell borders
        xPos = 15;
        colWidths.forEach(width => {
          doc.rect(xPos, yPosition - rowHeight + 1, width, rowHeight);
          xPos += width;
        });

        // Draw content
        xPos = 15;
        const rowData = [dateStr, dayStr, entry.start_time, entry.end_time, entry.shift_type, entry.notes || ''];
        rowData.forEach((text, i) => {
          doc.text(String(text), xPos + 2, yPosition - 2, { maxWidth: colWidths[i] - 4 });
          xPos += colWidths[i];
        });
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated: ${new Date().toLocaleString('ja-JP')}`, 15, pageHeight - 5);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=shift-preview-${year}-${String(month).padStart(2, '0')}-${staffName}.pdf`
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});