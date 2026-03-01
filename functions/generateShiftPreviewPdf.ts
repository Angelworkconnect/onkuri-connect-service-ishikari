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

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Title
    doc.setFontSize(20);
    doc.text(`${year}年${month}月 シフト予定`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Staff Name
    doc.setFontSize(14);
    doc.text(`${staffName}様`, 15, yPos);
    yPos += 10;

    // Notes
    if (notes && notes.trim()) {
      doc.setFontSize(10);
      doc.text('特記事項', 15, yPos);
      yPos += 6;

      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(notes, pageWidth - 30);
      doc.text(splitNotes, 15, yPos);
      yPos += splitNotes.length * 5 + 5;
    }

    // Filter entries
    const staffEntries = entries
      .filter(e => e.staff_email === staffEmail)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (staffEntries.length === 0) {
      doc.setFontSize(10);
      doc.text('シフトはありません', 15, yPos);
    } else {
      // Create calendar
      const firstDate = new Date(year, month - 1, 1);
      const lastDate = new Date(year, month, 0);
      const firstDow = firstDate.getDay();
      const daysInMonth = lastDate.getDate();

      doc.setFontSize(10);
      doc.text('シフトカレンダー', 15, yPos);
      yPos += 8;

      // Days of week headers
      const dowLabels = ['日', '月', '火', '水', '木', '金', '土'];
      const cellSize = 28;
      const headerHeight = 6;

      doc.setFillColor(45, 74, 111);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);

      let xPos = 15;
      dowLabels.forEach((dow, i) => {
        doc.rect(xPos, yPos, cellSize, headerHeight, 'F');
        doc.text(dow, xPos + cellSize / 2, yPos + 4, { align: 'center' });
        xPos += cellSize;
      });

      yPos += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      // Calendar cells
      let dayNum = 1;

      for (let week = 0; week < 6; week++) {
        if (dayNum > daysInMonth) break;

        for (let dow = 0; dow < 7; dow++) {
          xPos = 15 + dow * cellSize;
          const cellHeight = 20;

          // Draw cell border
          doc.rect(xPos, yPos, cellSize, cellHeight);

          if (week === 0 && dow < firstDow) {
            // Empty cell before month starts
          } else if (dayNum <= daysInMonth) {
            // Draw day number
            doc.setFont(undefined, 'bold');
            doc.text(String(dayNum), xPos + 2, yPos + 4);
            doc.setFont(undefined, 'normal');

            // Draw shifts for this day
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayShifts = staffEntries.filter(e => e.date === dateStr);

            let shiftY = yPos + 7;
            dayShifts.forEach((shift, idx) => {
              if (idx < 2) {
                const shiftText = `${shift.start_time}〜${shift.end_time}`;
                doc.setFontSize(7);
                doc.text(shiftText, xPos + 2, shiftY, { maxWidth: cellSize - 4 });
                shiftY += 4;
              }
            });

            dayNum++;
          }
        }

        yPos += cellHeight;
      }
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
    console.error('[PDF Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});