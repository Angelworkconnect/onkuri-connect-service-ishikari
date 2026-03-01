import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import html2canvas from 'npm:html2canvas@1.4.1';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, month, staffEmail, staffName, entries, notes } = await req.json();

    // Filter entries
    const staffEntries = entries
      .filter(e => e.staff_email === staffEmail)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create calendar HTML
    const firstDate = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0);
    const firstDow = firstDate.getDay();
    const daysInMonth = lastDate.getDate();

    const dowLabels = ['日', '月', '火', '水', '木', '金', '土'];
    
    // Build calendar grid
    let calendarHtml = '<table style="width:100%; border-collapse: collapse;">';
    
    // Header row
    calendarHtml += '<tr>';
    dowLabels.forEach(dow => {
      calendarHtml += `<th style="border: 1px solid #333; padding: 4px; text-align: center; background: #2D4A6F; color: white; font-weight: bold;">${dow}</th>`;
    });
    calendarHtml += '</tr>';

    // Calendar rows
    let dayNum = 1;
    for (let week = 0; week < 6; week++) {
      if (dayNum > daysInMonth) break;
      calendarHtml += '<tr>';
      
      for (let dow = 0; dow < 7; dow++) {
        if (week === 0 && dow < firstDow) {
          calendarHtml += '<td style="border: 1px solid #ddd; padding: 8px; height: 60px; background: #f5f5f5;"></td>';
        } else if (dayNum <= daysInMonth) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayShifts = staffEntries.filter(e => e.date === dateStr);
          
          let cellContent = `<div style="font-weight: bold; margin-bottom: 4px;">${dayNum}</div>`;
          dayShifts.slice(0, 2).forEach(shift => {
            cellContent += `<div style="font-size: 10px; margin: 2px 0;">${shift.start_time}〜${shift.end_time}</div>`;
          });
          
          calendarHtml += `<td style="border: 1px solid #ddd; padding: 8px; height: 60px; vertical-align: top; font-size: 12px;">${cellContent}</td>`;
          dayNum++;
        } else {
          calendarHtml += '<td style="border: 1px solid #ddd; padding: 8px; height: 60px;"></td>';
        }
      }
      
      calendarHtml += '</tr>';
    }
    calendarHtml += '</table>';

    // Build HTML document
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; margin: 20px; }
          h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
          h2 { font-size: 16px; margin-top: 15px; margin-bottom: 10px; }
          .notes { background: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 3px solid #2D4A6F; }
          table { margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>${year}年${month}月 シフト予定</h1>
        <h2>${staffName}様</h2>
        ${notes ? `<div class="notes"><strong>特記事項:</strong><div>${notes.replace(/\n/g, '<br>')}</div></div>` : ''}
        <h2>シフトカレンダー</h2>
        ${staffEntries.length === 0 ? '<p>シフトはありません</p>' : calendarHtml}
      </body>
      </html>
    `;

    // Convert HTML to canvas
    const canvas = await html2canvas(new JSDOM(html).window.document.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Create PDF from canvas
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 10;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let yPos = 5;
    let remainingHeight = imgHeight;

    doc.addImage(imgData, 'PNG', 5, yPos, imgWidth, imgHeight);

    // Add additional pages if needed
    while (remainingHeight > pageHeight - 5) {
      doc.addPage();
      remainingHeight -= pageHeight;
      doc.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
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