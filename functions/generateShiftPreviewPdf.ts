import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import html2canvas from 'npm:html2canvas@1.4.1';
import jsPDF from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, month, staffEmail, staffName, entries, notes } = await req.json();

    const doc = new jsPDF.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Header
    doc.setFontSize(16);
    doc.text(`${year}年${month}月 シフト予定`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Staff Name
    doc.setFontSize(12);
    doc.text(`${staffName}様`, 15, yPos);
    yPos += 8;

    // Notes if exists
    if (notes && notes.trim()) {
      doc.setFontSize(9);
      doc.text('特記事項', 15, yPos);
      yPos += 5;

      doc.setFontSize(8);
      const splitNotes = doc.splitTextToSize(notes, pageWidth - 30);
      doc.text(splitNotes, 15, yPos);
      yPos += splitNotes.length * 3.5 + 3;
    }

    // Shift Entries title
    doc.setFontSize(9);
    doc.text('シフト予定一覧', 15, yPos);
    yPos += 7;

    // Filter entries for this staff
    const staffEntries = entries
      .filter(e => e.staff_email === staffEmail)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (staffEntries.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('シフトはありません', 15, yPos);
    } else {
      // Table configuration
      const colWidths = [20, 12, 18, 18, 18, 50];
      const rowHeight = 6;
      
      doc.setFontSize(8);
      doc.setFillColor(45, 74, 111);
      doc.setTextColor(255, 255, 255);

      // Table headers
      const headers = ['日付', '曜日', '開始', '終了', '種別', '備考'];
      let xPos = 15;
      headers.forEach((header, i) => {
        doc.rect(xPos, yPos - 4, colWidths[i], rowHeight, 'F');
        doc.text(header, xPos + 1, yPos - 1);
        xPos += colWidths[i];
      });

      yPos += rowHeight;
      doc.setTextColor(0, 0, 0);

      // Table rows
      staffEntries.forEach((entry, idx) => {
        if (yPos + rowHeight > pageHeight - 10) {
          doc.addPage();
          yPos = 15;

          // Redraw headers
          doc.setFontSize(8);
          doc.setFillColor(45, 74, 111);
          doc.setTextColor(255, 255, 255);

          xPos = 15;
          headers.forEach((header, i) => {
            doc.rect(xPos, yPos - 4, colWidths[i], rowHeight, 'F');
            doc.text(header, xPos + 1, yPos - 1);
            xPos += colWidths[i];
          });

          yPos += rowHeight;
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
        }

        const date = new Date(entry.date + 'T00:00:00');
        const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const dayStr = dayLabels[date.getDay()];

        // Alternate row colors
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          xPos = 15;
          colWidths.forEach(width => {
            doc.rect(xPos, yPos - 4, width, rowHeight, 'F');
            xPos += width;
          });
        }

        // Row borders
        xPos = 15;
        colWidths.forEach(width => {
          doc.rect(xPos, yPos - 4, width, rowHeight);
          xPos += width;
        });

        // Row data
        xPos = 15;
        const rowData = [
          dateStr,
          dayStr,
          entry.start_time || '',
          entry.end_time || '',
          entry.shift_type || '',
          entry.notes || ''
        ];

        rowData.forEach((text, i) => {
          doc.text(String(text).substring(0, 10), xPos + 1, yPos - 1);
          xPos += colWidths[i];
        });

        yPos += rowHeight;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=shift-${year}-${month}.pdf`
      }
    });
  } catch (error) {
    console.error('[PDF Generation Error]', error);
    return Response.json({ 
      error: error.message || 'PDF generation failed',
      details: error.toString()
    }, { status: 500 });
  }
});