import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Clock, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const today = format(new Date(), 'yyyy-MM-dd');
const tripTypeLabel = { PICKUP: '朝便（迎え）', DROPOFF: '帰便（送り）', OTHER: 'その他' };
const abnormalityLabel = { NONE: '異常なし', MINOR: '軽微な異常', ACCIDENT: '事故' };
const fuelLabels = { FULL: 'FULL', '3_4': '3/4', HALF: '1/2', '1_4': '1/4', LOW: '要給油' };

export default function TransportExport() {
  const [user, setUser] = useState(null);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [filterVehicleId, setFilterVehicleId] = useState('all');
  const [filterTripType, setFilterTripType] = useState('all');
  const [exportMode, setExportMode] = useState('daily');
  const queryClient = useQueryClient();
  const printAreaRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (!u) return;
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) u.full_name = staffList[0].full_name;
      setUser(u);
    }).catch(() => {});
  }, []);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: exportLogs = [] } = useQuery({
    queryKey: ['exportLogs'],
    queryFn: () => base44.entities.TransportExportLog.list('-createdAtUtcMs', 20),
  });

  const [ridesData, setRidesData] = useState(null);
  const [passengersMap, setPassengersMap] = useState({});
  const [preChecksData, setPreChecksData] = useState([]);
  const [driverChecksData, setDriverChecksData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const logExportMutation = useMutation({
    mutationFn: () => base44.entities.TransportExportLog.create({
      exportType: exportMode === 'daily' ? 'PDF_DAILY' : 'PDF_MONTHLY',
      dateFrom,
      dateTo,
      createdByEmail: user?.email || '',
      createdByName: user?.full_name || user?.email || '',
      createdAtUtcMs: Date.now(),
      filterInfo: JSON.stringify({ vehicleId: filterVehicleId, tripType: filterTripType }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportLogs'] }),
  });

  const loadAndPrint = async () => {
    setIsLoading(true);
    try {
      // 全運行を取得（承認済み）
      const rides = await base44.entities.Ride.filter({ status: 'APPROVED' }, 'date');
      const filtered = rides.filter(r => {
        if (r.date < dateFrom || r.date > dateTo) return false;
        if (filterVehicleId !== 'all' && r.vehicleId !== filterVehicleId) return false;
        if (filterTripType !== 'all' && r.tripType !== filterTripType) return false;
        return true;
      });

      // 乗客データ取得
      const pMap = {};
      await Promise.all(filtered.map(async (ride) => {
        const passengers = await base44.entities.RidePassenger.filter({ rideId: ride.id }, 'order');
        pMap[ride.id] = passengers;
      }));

      // 車両点検データ
      const preChecks = await base44.entities.VehiclePreCheck.filter({});
      const filteredPreChecks = preChecks.filter(c => c.date >= dateFrom && c.date <= dateTo);

      // 運転者点検データ
      const driverChecks = await base44.entities.DriverDailyCheck.filter({});
      const filteredDriverChecks = driverChecks.filter(c => c.date >= dateFrom && c.date <= dateTo);

      setRidesData(filtered);
      setPassengersMap(pMap);
      setPreChecksData(filteredPreChecks);
      setDriverChecksData(filteredDriverChecks);

      await logExportMutation.mutateAsync();

      setTimeout(() => {
        window.print();
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedByDate = ridesData ? ridesData.reduce((acc, ride) => {
    if (!acc[ride.date]) acc[ride.date] = [];
    acc[ride.date].push(ride);
    return acc;
  }, {}) : {};

  const totalDistance = ridesData ? ridesData.reduce((s, r) => s + (r.distanceKm || 0), 0) : 0;
  const accidentCount = ridesData ? ridesData.filter(r => r.abnormality === 'ACCIDENT').length : 0;
  const abnormalCount = ridesData ? ridesData.filter(r => r.abnormality !== 'NONE').length : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4; }
        }
        .print-area { display: none; }
      `}</style>

      <div className="no-print">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            PDF出力センター
          </h1>
          <Link to={createPageUrl('TransportDashboard')}>
            <Button variant="outline" size="sm">← ダッシュボードへ</Button>
          </Link>
        </div>

        {/* フィルタ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm">出力設定</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">開始日</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">終了日</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">出力種類</label>
                <Select value={exportMode} onValueChange={setExportMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">日別詳細PDF</SelectItem>
                    <SelectItem value="monthly">月別サマリーPDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">車両フィルタ</label>
                <Select value={filterVehicleId} onValueChange={setFilterVehicleId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全車両</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">便種別</label>
                <Select value={filterTripType} onValueChange={setFilterTripType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全便</SelectItem>
                    <SelectItem value="PICKUP">朝便（迎え）</SelectItem>
                    <SelectItem value="DROPOFF">帰便（送り）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading} onClick={loadAndPrint}>
              <Printer className="w-4 h-4 mr-2" />
              {isLoading ? 'データ読込中...' : 'PDF出力（印刷）'}
            </Button>
          </CardContent>
        </Card>

        {/* 出力ログ */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />出力ログ（直近20件）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {exportLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">出力履歴はありません</p>
            ) : exportLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                <div>
                  <Badge className="bg-blue-100 text-blue-700 mr-2">{log.exportType}</Badge>
                  <span className="text-slate-600">{log.dateFrom}〜{log.dateTo}</span>
                </div>
                <span className="text-slate-400">{log.createdByName} / {log.createdAtUtcMs ? format(new Date(log.createdAtUtcMs), 'MM/dd HH:mm') : '-'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 印刷エリア */}
      {ridesData !== null && (
        <div className="print-area" ref={printAreaRef}>
          <div style={{ fontFamily: 'serif', fontSize: '10pt', color: '#000' }}>
            {/* ヘッダー */}
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
              <h1 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 4px 0' }}>運行管理記録（送迎）</h1>
              <p style={{ margin: '2px 0', fontSize: '9pt' }}>事業所：おんくりの輪</p>
              <p style={{ margin: '2px 0', fontSize: '9pt' }}>対象期間：{dateFrom}〜{dateTo}</p>
              <p style={{ margin: '2px 0', fontSize: '8pt', color: '#555' }}>
                出力日時：{format(new Date(), 'yyyy/MM/dd HH:mm')} / 出力者：{user?.full_name || user?.email}
              </p>
            </div>

            {/* サマリー */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '9pt' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left' }}>総運行件数</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left' }}>総走行距離</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left' }}>異常件数</th>
                  <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left' }}>事故件数</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ridesData.length}件</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{totalDistance.toFixed(1)}km</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{abnormalCount}件</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{accidentCount}件</td>
                </tr>
              </tbody>
            </table>

            {/* 日別詳細 */}
            {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, rides]) => {
              const dayPreChecks = preChecksData.filter(c => c.date === date);
              const dayDriverChecks = driverChecksData.filter(c => c.date === date);

              return (
                <div key={date} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
                  <h2 style={{ fontSize: '12pt', fontWeight: 'bold', background: '#ddd', padding: '4px 8px', margin: '0 0 8px 0', border: '1px solid #aaa' }}>
                    {date}（{rides.length}便）
                  </h2>

                  {/* 車両点検 */}
                  {dayPreChecks.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '4px' }}>【車両使用前点検】</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                        <thead>
                          <tr style={{ background: '#f5f5f5' }}>
                            {['車両', '燃料', 'タイヤ', 'ライト', 'ブレーキ', '外装', '車内', '点検者'].map(h => (
                              <th key={h} style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dayPreChecks.map((c, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.vehicleName}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{fuelLabels[c.fuelLevel] || c.fuelLevel}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.tireOK ? '✓' : '✗'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.lightsOK ? '✓' : '✗'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.brakeOK ? '✓' : '✗'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.exteriorDamageNone ? '✓' : '✗'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.interiorOK ? '✓' : '✗'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.checkerName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 運転者点検 */}
                  {dayDriverChecks.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '4px' }}>【運転者健康確認】</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                        <thead>
                          <tr style={{ background: '#f5f5f5' }}>
                            {['氏名', '健康状態', 'アルコール確認', '備考'].map(h => (
                              <th key={h} style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dayDriverChecks.map((c, i) => (
                            <tr key={i}>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.driverName}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.fitForDuty === 'OK' ? '問題なし' : '要配慮'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.alcoholCheck ? '実施' : '未記録'}</td>
                              <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.notes || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 各運行 */}
                  {rides.map((ride, rIdx) => (
                    <div key={ride.id} style={{ marginBottom: '12px', border: '1px solid #aaa', padding: '8px' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                        {tripTypeLabel[ride.tripType]} / {ride.vehicleName}（{ride.vehiclePlate}）
                      </p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '6px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9', width: '20%' }}>運転者</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', width: '30%' }}>{ride.driverName}</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9', width: '20%' }}>同乗者</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', width: '30%' }}>{ride.attendantName || 'なし'}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>出発時刻</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }}>{ride.startTime}</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>到着時刻</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }}>{ride.endTime}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>開始メーター</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }}>{ride.startOdometerKm}km</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>終了メーター</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }}>{ride.endOdometerKm}km</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>走行距離</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }}>{ride.distanceKm}km</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>異常</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }}>
                              {abnormalityLabel[ride.abnormality || 'NONE']}
                              {ride.abnormalityNote && `：${ride.abnormalityNote}`}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px', background: '#f9f9f9' }}>承認者</td>
                            <td style={{ border: '1px solid #ddd', padding: '3px 6px' }} colSpan={3}>
                              {ride.approvedByName || '未承認'} / {ride.approvedAtUtcMs ? format(new Date(ride.approvedAtUtcMs), 'yyyy/MM/dd HH:mm') : ''}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 乗車者一覧 */}
                      {passengersMap[ride.id]?.length > 0 && (
                        <>
                          <p style={{ fontSize: '8pt', fontWeight: 'bold', marginBottom: '4px' }}>乗車利用者</p>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                            <thead>
                              <tr style={{ background: '#f5f5f5' }}>
                                {['利用者名', '乗車時刻', '降車時刻', 'SB確認', 'メモ'].map(h => (
                                  <th key={h} style={{ border: '1px solid #ccc', padding: '2px 5px' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {passengersMap[ride.id].map((p, i) => (
                                <tr key={i}>
                                  <td style={{ border: '1px solid #ccc', padding: '2px 5px' }}>{p.clientName}</td>
                                  <td style={{ border: '1px solid #ccc', padding: '2px 5px', textAlign: 'center' }}>{p.boardTime || '-'}</td>
                                  <td style={{ border: '1px solid #ccc', padding: '2px 5px', textAlign: 'center' }}>{p.alightTime || '-'}</td>
                                  <td style={{ border: '1px solid #ccc', padding: '2px 5px', textAlign: 'center' }}>{p.seatBeltChecked ? '✓' : '✗'}</td>
                                  <td style={{ border: '1px solid #ccc', padding: '2px 5px' }}>{p.note || ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {ridesData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                指定期間・条件で承認済みの運行記録がありません
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '8pt', color: '#888', marginTop: '16px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
              本記録は おんくりの輪 運行管理システムより出力されました / 出力日時：{format(new Date(), 'yyyy/MM/dd HH:mm')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}