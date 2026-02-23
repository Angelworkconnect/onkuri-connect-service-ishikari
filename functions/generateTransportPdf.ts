import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { dateFrom, dateTo, vehicleId, driverEmail, tripType, exportType } = await req.json();

    // データ取得
    let rides = await base44.entities.Ride.filter({ status: 'APPROVED' });
    rides = rides.filter(r => r.date >= dateFrom && r.date <= dateTo);
    if (vehicleId) rides = rides.filter(r => r.vehicleId === vehicleId);
    if (driverEmail) rides = rides.filter(r => r.driverEmail === driverEmail);
    if (tripType) rides = rides.filter(r => r.tripType === tripType);
    rides.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));

    // 乗客・車両点検取得
    const allPassengers = await base44.entities.RidePassenger.filter({});
    const allPreChecks = await base44.entities.VehiclePreCheck.filter({});
    const allDriverChecks = await base44.entities.DriverDailyCheck.filter({});

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297;
    const ML = 15, MR = 15, MT = 20;
    let y = MT;
    let pageNum = 1;
    const totalPages = '?'; // 後で更新

    const now = new Date();
    const nowJST = new Date(now.getTime() + 9 * 3600 * 1000);
    const exportTime = nowJST.toISOString().replace('T', ' ').substring(0, 16);

    const addPageHeader = () => {
      doc.setFillColor(45, 74, 111);
      doc.rect(0, 0, PW, 14, 'F');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('運行管理記録（送迎）', ML, 9);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('おんくりの輪', PW / 2, 9, { align: 'center' });
      doc.text(`Page ${pageNum}`, PW - MR, 9, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y = 20;
    };

    const addPageFooter = () => {
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`出力日時: ${exportTime} / 出力者: ${user.full_name || user.email}`, ML, PH - 8);
      doc.text(`期間: ${dateFrom} ～ ${dateTo}`, PW - MR, PH - 8, { align: 'right' });
    };

    const newPage = () => {
      addPageFooter();
      doc.addPage();
      pageNum++;
      addPageHeader();
    };

    const checkY = (need = 10) => {
      if (y + need > PH - 15) newPage();
    };

    addPageHeader();

    // タイトルブロック
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 74, 111);
    doc.text(exportType === 'PDF_MONTHLY' ? '月次運行記録' : '日次運行記録', ML, y + 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`対象期間: ${dateFrom} ～ ${dateTo}`, PW / 2, y + 6, { align: 'center' });
    y += 16;

    // サマリー
    const totalDist = rides.reduce((s, r) => s + (r.distanceKm || 0), 0);
    const accidents = rides.filter(r => r.abnormality === 'ACCIDENT').length;
    const minors = rides.filter(r => r.abnormality === 'MINOR').length;

    doc.setFillColor(240, 244, 255);
    doc.rect(ML, y, PW - ML - MR, 18, 'F');
    doc.setFontSize(9);
    doc.text(`総運行数: ${rides.length}件`, ML + 4, y + 7);
    doc.text(`総走行距離: ${totalDist.toFixed(1)} km`, ML + 50, y + 7);
    doc.text(`事故: ${accidents}件`, ML + 110, y + 7);
    doc.text(`軽微異常: ${minors}件`, ML + 145, y + 7);
    y += 24;

    if (rides.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text('該当する承認済み運行記録がありません', PW / 2, y + 20, { align: 'center' });
      addPageFooter();
      const pdfBytes = doc.output('arraybuffer');
      return new Response(pdfBytes, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=transport-${dateFrom}.pdf` }
      });
    }

    // 日別にグループ化
    const byDate = {};
    rides.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });

    for (const [date, dayRides] of Object.entries(byDate).sort()) {
      checkY(20);

      // 日付ヘッダー
      doc.setFillColor(45, 74, 111);
      doc.rect(ML, y, PW - ML - MR, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(date, ML + 2, y + 5.5);
      const dayDist = dayRides.reduce((s, r) => s + (r.distanceKm || 0), 0);
      doc.text(`${dayRides.length}便 / ${dayDist.toFixed(1)}km`, PW - MR - 2, y + 5.5, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 10;

      for (const ride of dayRides) {
        const passengers = allPassengers.filter(p => p.rideId === ride.id);
        const preCheck = allPreChecks.find(c => c.date === ride.date && c.vehicleId === ride.vehicleId);
        const driverCheck = allDriverChecks.find(c => c.date === ride.date && c.driverEmail === ride.driverEmail);
        const needHeight = 50 + passengers.length * 6;

        checkY(needHeight);

        // 運行カード背景
        doc.setFillColor(248, 250, 252);
        doc.rect(ML, y, PW - ML - MR, needHeight, 'F');
        doc.setDrawColor(200, 210, 230);
        doc.rect(ML, y, PW - ML - MR, needHeight);

        // 便種別バッジ
        const tripLabel = ride.tripType === 'PICKUP' ? '朝便（迎え）' : ride.tripType === 'DROPOFF' ? '帰便（送り）' : 'その他';
        const tripColor = ride.tripType === 'PICKUP' ? [255, 180, 50] : ride.tripType === 'DROPOFF' ? [100, 160, 230] : [180, 180, 180];
        doc.setFillColor(...tripColor);
        doc.rect(ML + 1, y + 1, 28, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(tripLabel, ML + 15, y + 5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        // 異常バッジ
        if (ride.abnormality !== 'NONE') {
          const abnColor = ride.abnormality === 'ACCIDENT' ? [220, 50, 50] : [220, 150, 50];
          doc.setFillColor(...abnColor);
          doc.rect(PW - MR - 25, y + 1, 24, 6, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(ride.abnormality === 'ACCIDENT' ? '事故' : '軽微異常', PW - MR - 13, y + 5, { align: 'center' });
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        }

        y += 9;
        doc.setFontSize(8);

        // 行1: 車両・運転者
        doc.text(`車両: ${ride.vehicleName || '-'}  ナンバー: ${ride.vehiclePlate || '-'}`, ML + 2, y);
        doc.text(`運転者: ${ride.driverName || '-'}${ride.attendantName ? '  同乗: ' + ride.attendantName : ''}`, ML + 85, y);
        y += 5.5;

        // 行2: 時刻・メーター
        doc.text(`出発: ${ride.startTime || '-'}  到着: ${ride.endTime || '-'}`, ML + 2, y);
        doc.text(`開始: ${ride.startOdometerKm || '-'} km  終了: ${ride.endOdometerKm || '-'} km  走行: ${(ride.distanceKm || 0).toFixed(1)} km`, ML + 70, y);
        y += 5.5;

        // 行3: 点検情報
        const fuelLabels = { FULL: '満', '3_4': '3/4', HALF: '1/2', '1_4': '1/4', LOW: '少' };
        if (preCheck) {
          const items = [
            `燃料:${fuelLabels[preCheck.fuelLevel] || '-'}`,
            preCheck.tireOK ? 'タイヤ:OK' : 'タイヤ:NG',
            preCheck.lightsOK ? 'ライト:OK' : 'ライト:NG',
            preCheck.brakeOK ? 'ブレーキ:OK' : 'ブレーキ:NG',
            preCheck.exteriorDamageNone ? '外観:OK' : '外観:NG',
          ].join('  ');
          doc.text(`[点検] ${items}`, ML + 2, y);
        } else {
          doc.setTextColor(200, 100, 100);
          doc.text('[点検] 未実施', ML + 2, y);
          doc.setTextColor(0, 0, 0);
        }
        if (driverCheck) {
          doc.text(`[運転者] ${driverCheck.fitForDuty === 'OK' ? '問題なし' : '要配慮'}${driverCheck.alcoholCheck ? '  AC:実施' : ''}`, ML + 95, y);
        }
        y += 5.5;

        // 行4: 異常内容
        if (ride.abnormality !== 'NONE' && ride.abnormalityNote) {
          doc.setTextColor(200, 80, 80);
          doc.text(`[異常内容] ${ride.abnormalityNote}`, ML + 2, y);
          doc.setTextColor(0, 0, 0);
          y += 5.5;
        }

        // 乗客リスト
        if (passengers.length > 0) {
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text(`乗車利用者（${passengers.length}名）:`, ML + 2, y);
          doc.setFont('helvetica', 'normal');
          y += 5;
          passengers.forEach((p, pi) => {
            const seatBelt = p.seatBeltChecked ? 'SB:✓' : 'SB:×';
            const times = (p.boardTime ? `乗:${p.boardTime}` : '') + (p.alightTime ? ` 降:${p.alightTime}` : '');
            doc.text(`  ${pi+1}. ${p.clientName}  ${times}  ${seatBelt}`, ML + 2, y);
            y += 5;
          });
        } else {
          y += 5;
        }

        // 承認情報
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        const approvedText = ride.approvedByName
          ? `承認: ${ride.approvedByName}  ${ride.approvedAtUtcMs ? new Date(ride.approvedAtUtcMs + 9*3600000).toISOString().substring(0,16).replace('T', ' ') : ''}`
          : '未承認';
        doc.text(approvedText, PW - MR - 2, y - 1, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);

        y += 6;
      }
      y += 4;
    }

    addPageFooter();

    // 出力ログ保存
    await base44.asServiceRole.entities.TransportExportLog.create({
      exportType: exportType || 'PDF_DAILY',
      dateFrom,
      dateTo,
      createdByEmail: user.email,
      createdByName: user.full_name || user.email,
      createdAtUtcMs: Date.now(),
    });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=transport-${dateFrom}-${dateTo}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});