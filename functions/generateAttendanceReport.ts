import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reportType, startDate, endDate } = body;

    if (!reportType || !startDate || !endDate) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch attendance records and staff data
    const attendanceRecords = await base44.entities.Attendance.list('-date');
    const staffData = await base44.entities.Staff.list();

    // Filter records by date range
    const filteredRecords = attendanceRecords.filter(record => {
      const recordDate = parseISO(record.date);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return recordDate >= start && recordDate <= end;
    });

    // Calculate stats per staff
    const staffStats = {};
    
    staffData.forEach(staff => {
      const staffRecords = filteredRecords.filter(r => r.user_email === staff.email);
      
      let totalMinutes = 0;
      let overtimeMinutes = 0;
      let lateCount = 0;
      let earlyLeaveCount = 0;
      let approvedCount = 0;
      
      staffRecords.forEach(record => {
        // Calculate total hours
        if (record.clock_in && record.clock_out) {
          const [inHour, inMin] = record.clock_in.split(':').map(Number);
          const [outHour, outMin] = record.clock_out.split(':').map(Number);
          const inTotalMin = inHour * 60 + inMin;
          const outTotalMin = outHour * 60 + outMin;
          const workMin = Math.max(0, outTotalMin - inTotalMin);
          
          totalMinutes += workMin;
          if (workMin > 480) { // 8 hours
            overtimeMinutes += workMin - 480;
          }
        }
        
        // Count late/early
        if (record.clock_in && record.clock_in > '09:00') {
          lateCount++;
        }
        if (record.clock_out && record.clock_out < '17:00') {
          earlyLeaveCount++;
        }
        
        // Count approved
        if (record.status === 'approved') {
          approvedCount++;
        }
      });
      
      staffStats[staff.email] = {
        name: staff.full_name,
        role: staff.role,
        totalWorkDays: staffRecords.length,
        totalHours: Math.floor(totalMinutes / 60),
        totalMinutes: totalMinutes % 60,
        overtimeHours: Math.floor(overtimeMinutes / 60),
        overtimeMinutes: overtimeMinutes % 60,
        lateCount,
        earlyLeaveCount,
        approvedCount
      };
    });

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Title
    doc.setFontSize(16);
    doc.text('勤怠レポート', pageWidth / 2, yPos, { align: 'center' });
    
    // Report details
    yPos += 12;
    doc.setFontSize(10);
    doc.text(`期間: ${format(parseISO(startDate), 'yyyy年M月d日')} ～ ${format(parseISO(endDate), 'yyyy年M月d日')}`, 20, yPos);
    doc.text(`レポートタイプ: ${reportType === 'monthly' ? '月次' : '週次'}`, 20, yPos + 7);
    yPos += 20;

    // Table headers
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(45, 74, 111);
    
    const headers = ['スタッフ名', 'カテゴリ', '勤務日数', '総時間', '時間外', '遅刻', '早退', '承認済'];
    const colWidths = [30, 20, 18, 18, 18, 12, 12, 18];
    let xPos = 15;

    headers.forEach((header, idx) => {
      doc.rect(xPos, yPos, colWidths[idx], 8, 'F');
      doc.text(header, xPos + 2, yPos + 6);
      xPos += colWidths[idx];
    });

    yPos += 10;
    doc.setTextColor(0, 0, 0);

    // Table rows
    const staffEmails = Object.keys(staffStats).sort();
    staffEmails.forEach((email, idx) => {
      const stats = staffStats[email];
      
      // Alternate row background
      if (idx % 2 === 1) {
        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPos - 2, pageWidth - 30, 8, 'F');
      }

      xPos = 15;
      const roleLabel = stats.role === 'admin' ? '管理者' : 
                       stats.role === 'full_time' ? '正社員' : 
                       stats.role === 'part_time' ? 'パート' : '単発';

      doc.text(stats.name, xPos + 2, yPos + 5);
      xPos += colWidths[0];
      
      doc.text(roleLabel, xPos + 2, yPos + 5);
      xPos += colWidths[1];
      
      doc.text(String(stats.totalWorkDays), xPos + 2, yPos + 5);
      xPos += colWidths[2];
      
      doc.text(`${stats.totalHours}h${stats.totalMinutes}m`, xPos + 2, yPos + 5);
      xPos += colWidths[3];
      
      doc.text(`${stats.overtimeHours}h${stats.overtimeMinutes}m`, xPos + 2, yPos + 5);
      xPos += colWidths[4];
      
      doc.text(String(stats.lateCount), xPos + 2, yPos + 5);
      xPos += colWidths[5];
      
      doc.text(String(stats.earlyLeaveCount), xPos + 2, yPos + 5);
      xPos += colWidths[6];
      
      doc.text(String(stats.approvedCount), xPos + 2, yPos + 5);

      yPos += 8;

      // Add new page if needed
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=attendance-report-${format(parseISO(startDate), 'yyyyMMdd')}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});