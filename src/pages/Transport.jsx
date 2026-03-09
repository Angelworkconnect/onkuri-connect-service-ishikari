import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, CheckCircle2, Clock, Truck, AlertTriangle, ClipboardCheck, User, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RideForm from '../components/transport/RideForm';
import PastRidesView from '../components/transport/PastRidesView';
import PreCheckForm from '../components/transport/PreCheckForm';
import DriverCheckForm from '../components/transport/DriverCheckForm';
import { format } from 'date-fns';

const tripLabel = (t) => t === 'PICKUP' ? '🌅 朝便' : t === 'DROPOFF' ? '🌇 帰便' : '🚐 その他';
const statusBadge = (s) => {
  if (s === 'APPROVED') return <Badge className="bg-green-100 text-green-700">承認済</Badge>;
  if (s === 'SUBMITTED') return <Badge className="bg-blue-100 text-blue-700">提出済</Badge>;
  return <Badge className="bg-amber-100 text-amber-700">下書き</Badge>;
};

export default function Transport() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mode, setMode] = useState(null); // 'ride' | 'precheck' | 'drivercheck'
  const [editingRide, setEditingRide] = useState(null);
  const [selectedRidePassengers, setSelectedRidePassengers] = useState(null);
  const [today, setToday] = useState(() => new Date(Date.now() + 9*3600000).toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async u => {
      if (!u) return;
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        if (staffList[0].role === 'admin') setIsAdmin(true);
      }
      if (u.role === 'admin') setIsAdmin(true);
      setUser(u);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentToday = new Date(Date.now() + 9*3600000).toISOString().split('T')[0];
          setToday(prevToday => {
            if (prevToday !== currentToday) {
              queryClient.invalidateQueries({ queryKey: ['transport-today'] });
              queryClient.invalidateQueries({ queryKey: ['transport-precheck-today'] });
              queryClient.invalidateQueries({ queryKey: ['transport-drivercheck-today'] });
            }
            return currentToday;
          });
    }, 60000);
    return () => clearInterval(timer);
  }, [queryClient]);

  const { data: todayRides = [] } = useQuery({
    queryKey: ['transport-today'],
    queryFn: () => base44.entities.Ride.filter({ date: today }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: myRides = [] } = useQuery({
    queryKey: ['transport-my'],
    queryFn: () => base44.entities.Ride.list('-created_date', 20),
    enabled: !!user,
  });

  const pastRides = myRides.filter(r => r.date !== today);

  const { data: pastPassengersMap = {} } = useQuery({
    queryKey: ['transport-past-passengers-map', pastRides.map(r => r.id).join(',')],
    queryFn: async () => {
      const map = {};
      for (const ride of pastRides) {
        map[ride.id] = await base44.entities.RidePassenger.filter({ rideId: ride.id });
      }
      return map;
    },
    enabled: !!user && pastRides.length > 0,
    staleTime: 120000,
  });

  // 即時削除用のローカルフィルタ
  const [deletedIds, setDeletedIds] = useState([]);

  const { data: ridePassengersMap = {} } = useQuery({
    queryKey: ['transport-passengers-map', todayRides.map(r => r.id).join(',')],
    queryFn: async () => {
      const map = {};
      for (const ride of todayRides) {
        map[ride.id] = await base44.entities.RidePassenger.filter({ rideId: ride.id });
      }
      return map;
    },
    enabled: !!user && todayRides.length > 0,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['transport-vehicles'],
    queryFn: () => base44.entities.Vehicle.list('name'),
    enabled: !!user,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['transport-staff'],
    queryFn: () => base44.entities.Staff.filter({ approval_status: 'approved' }),
    enabled: !!user,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['transport-templates'],
    queryFn: () => base44.entities.RouteTemplate.list('name'),
    enabled: !!user,
  });

  const { data: todayPreChecks = [] } = useQuery({
    queryKey: ['transport-precheck-today'],
    queryFn: () => base44.entities.VehiclePreCheck.filter({ date: today }),
    enabled: !!user,
  });



  const { data: myDriverCheck } = useQuery({
    queryKey: ['transport-drivercheck-today', user?.email],
    queryFn: () => base44.entities.DriverDailyCheck.filter({ date: today, driverEmail: user.email }),
    enabled: !!user,
    select: (data) => data[0] || null,
  });

  const deleteRideMutation = useMutation({
    mutationFn: (id) => base44.entities.Ride.delete(id),
    onMutate: (deletedId) => {
      // ローカルで即時非表示
      setDeletedIds(prev => [...prev, deletedId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-today'] });
      queryClient.invalidateQueries({ queryKey: ['transport-my'] });
    },
    onError: (_, deletedId) => {
      // エラー時は元に戻す
      setDeletedIds(prev => prev.filter(id => id !== deletedId));
    },
  });

  const handleSaved = () => {
    setMode(null);
    setEditingRide(null);
    queryClient.invalidateQueries({ queryKey: ['transport-today'] });
    queryClient.invalidateQueries({ queryKey: ['transport-passengers-map'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['transport-my'] });
    queryClient.invalidateQueries({ queryKey: ['transport-precheck-today'] });
    queryClient.invalidateQueries({ queryKey: ['transport-drivercheck-today'] });
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">読み込み中...</div>
    </div>
  );

  const uncheckedVehicles = vehicles.filter(v => v.isActive !== false && !todayPreChecks.find(c => c.vehicleId === v.id));
  const submittedCount = todayRides.filter(r => r.status === 'SUBMITTED').length;
  const draftRides = myRides.filter(r => (r.status === 'DRAFT' || r.status === 'REJECTED') && !deletedIds.includes(r.id));

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-1">
            <Truck className="w-6 h-6" />
            <h1 className="text-2xl font-bold">送迎 運行管理</h1>
          </div>
          <p className="text-blue-200 text-sm">{user.full_name} さん / {today}</p>

          {/* 統計カード */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{todayRides.length}</p>
              <p className="text-xs text-blue-100">本日の便数</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-300">{submittedCount}</p>
              <p className="text-xs text-blue-100">承認待ち</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${uncheckedVehicles.length > 0 ? 'text-red-300' : 'text-green-300'}`}>
                {uncheckedVehicles.length > 0 ? '!' : '✓'}
              </p>
              <p className="text-xs text-blue-100">車両点検</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 -mt-4">

        {/* 警告 */}
        {uncheckedVehicles.length > 0 && !mode && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-amber-700 text-sm font-medium">
              <strong>車両点検が未実施</strong>です：{uncheckedVehicles.map(v => v.name).join('、')}
            </p>
          </div>
        )}
        {!myDriverCheck && !mode && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-blue-700 text-sm">本日の<strong>運転者確認</strong>が未実施です</p>
          </div>
        )}

        {/* フォーム表示エリア */}
         {mode === 'ride' && (
            <RideForm user={user} vehicles={vehicles} staff={staff} templates={templates} editingRide={editingRide} todayRides={todayRides} ridePassengersMap={ridePassengersMap} onSaved={handleSaved} onCancel={() => { setMode(null); setEditingRide(null); }} />
         )}
        {mode === 'precheck' && (
          <PreCheckForm user={user} vehicles={vehicles} onSaved={handleSaved} onCancel={() => setMode(null)} />
        )}
        {mode === 'drivercheck' && (
          <DriverCheckForm user={user} onSaved={handleSaved} onCancel={() => setMode(null)} />
        )}

        {/* アクションボタン */}
        {!mode && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMode('ride')}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 flex items-center gap-4 shadow-lg active:scale-95 transition-transform"
            >
              <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
                <Plus className="w-7 h-7" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold">新規運行を記録</p>
                <p className="text-blue-100 text-sm">テンプレ＋メーター入力で1分で完了</p>
              </div>
              <span className="ml-auto text-2xl">🚌</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('precheck')}
                className={`rounded-xl p-3 border-2 text-left transition-all ${todayPreChecks.length > 0 ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className={`w-4 h-4 ${todayPreChecks.length > 0 ? 'text-green-600' : 'text-amber-600'}`} />
                  <span className={`text-sm font-bold ${todayPreChecks.length > 0 ? 'text-green-700' : 'text-amber-700'}`}>車両点検</span>
                </div>
                <p className={`text-xs ${todayPreChecks.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {todayPreChecks.length > 0 ? `${todayPreChecks.length}件 完了` : '未実施'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('drivercheck')}
                className={`rounded-xl p-3 border-2 text-left transition-all ${myDriverCheck ? 'border-green-300 bg-green-50' : 'border-blue-200 bg-blue-50'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className={`w-4 h-4 ${myDriverCheck ? 'text-green-600' : 'text-blue-600'}`} />
                  <span className={`text-sm font-bold ${myDriverCheck ? 'text-green-700' : 'text-blue-700'}`}>運転者確認</span>
                </div>
                <p className={`text-xs ${myDriverCheck ? 'text-green-600' : 'text-blue-600'}`}>
                  {myDriverCheck ? `完了（${myDriverCheck.fitForDuty === 'OK' ? '問題なし' : '要配慮'}）` : '未実施'}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* 下書き・差し戻し記録 */}
        {!mode && draftRides.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-600 mb-2">下書き・差し戻し（{draftRides.length}件）</h2>
            <div className="space-y-2">
              {draftRides.map(ride => (
                <Card key={ride.id} className={`p-3 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${ride.status === 'REJECTED' ? 'border-l-4 border-red-500' : 'border-l-4 border-amber-500'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">{tripLabel(ride.tripType)}</span>
                        {ride.status === 'REJECTED' ? (
                          <Badge className="bg-red-100 text-red-700">差し戻し</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">下書き</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {ride.vehicleName} / {ride.driverName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ride.date} {ride.startTime}{ride.endTime ? ` ～ ${ride.endTime}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingRide(ride); setMode('ride'); }}>
                        編集
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm('削除しますか？')) deleteRideMutation.mutate(ride.id); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 本日の運行一覧 */}
         {!mode && (
           <div>
             <h2 className="text-sm font-bold text-slate-600 mb-2">本日の運行（{todayRides.length}件）</h2>
            {todayRides.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-xl">
                <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>本日の運行記録はありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayRides.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).map(ride => {
                   const passengers = ridePassengersMap[ride.id] || [];
                   return (
                     <Card key={ride.id} className="p-3 border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRidePassengers({ ride, passengers })}>
                       <div className="flex items-start justify-between">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="text-sm font-bold">{tripLabel(ride.tripType)}</span>
                             {statusBadge(ride.status)}
                             {ride.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700">⚠️</Badge>}
                           </div>
                           <p className="text-xs text-slate-500">
                             {ride.vehicleName} / {ride.driverName}
                           </p>
                           <p className="text-xs text-slate-500">
                             <Clock className="w-3 h-3 inline mr-1" />{ride.startTime}{ride.endTime ? ` ～ ${ride.endTime}` : ' (運行中)'}
                             {ride.distanceKm ? ` / ${ride.distanceKm.toFixed(1)}km` : ''}
                           </p>
                         {passengers.length > 0 && (
                           <p className="text-xs text-slate-500 mt-0.5">
                             👥 {passengers.length}名：{passengers.map(p => p.clientName).join('、')}
                           </p>
                         )}
                         </div>
                         <Badge className="bg-blue-100 text-blue-700 ml-2 shrink-0">{passengers.length}名</Badge>
                       </div>
                     </Card>
                   );
                 })}
              </div>
            )}
          </div>
        )}

        {/* 過去の記録 */}
        {!mode && (
          <PastRidesView rides={pastRides} passengersMap={pastPassengersMap} />
        )}

        {/* 運行詳細ダイアログ */}
        <Dialog open={!!selectedRidePassengers} onOpenChange={() => setSelectedRidePassengers(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>運行詳細</DialogTitle>
            </DialogHeader>
            {selectedRidePassengers && (
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">便種別</p>
                    <p className="text-sm font-bold">{tripLabel(selectedRidePassengers.ride.tripType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">車両</p>
                    <p className="text-sm font-bold">{selectedRidePassengers.ride.vehicleName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">運転者</p>
                    <p className="text-sm font-bold">{selectedRidePassengers.ride.driverName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">時間</p>
                    <p className="text-sm font-bold">{selectedRidePassengers.ride.startTime}{selectedRidePassengers.ride.endTime ? ` ～ ${selectedRidePassengers.ride.endTime}` : ' (運行中)'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold mb-2">乗客一覧（{selectedRidePassengers.passengers.length}名）</p>
                  {selectedRidePassengers.passengers.length === 0 ? (
                    <p className="text-xs text-slate-500">乗客なし</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedRidePassengers.passengers.sort((a, b) => a.order - b.order).map((p, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-2 text-xs">
                          <p className="font-medium">{p.clientName}</p>
                          <p className="text-slate-500">
                            {p.boardTime && <>乗: {p.boardTime}</> } {p.boardTime && p.alightTime && ' / '} {p.alightTime && <>降: {p.alightTime}</>}
                          </p>
                          {p.note && <p className="text-slate-500 mt-1">📝 {p.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}