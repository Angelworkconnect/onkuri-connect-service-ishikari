import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Car, Clock, Plus, FileText, Settings, AlertCircle, Truck, Sun, Moon, Users, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RideFormDialog from '@/components/transport/RideFormDialog.jsx';
import DriverCheckDialog from '@/components/transport/DriverCheckDialog.jsx';
import VehicleCheckDialog from '@/components/transport/VehicleCheckDialog.jsx';

const today = format(new Date(), 'yyyy-MM-dd');
const tripTypeLabel = { PICKUP: '朝便（迎え）', DROPOFF: '帰便（送り）', OTHER: 'その他' };
const statusColor = { DRAFT: 'bg-yellow-100 text-yellow-700 border-yellow-200', SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200', APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
const statusLabel = { DRAFT: '記録中', SUBMITTED: '提出済', APPROVED: '✓ 承認済' };

export default function TransportDashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rideDialogOpen, setRideDialogOpen] = useState(false);
  const [driverCheckOpen, setDriverCheckOpen] = useState(false);
  const [vehicleCheckOpen, setVehicleCheckOpen] = useState(false);
  const [editingRide, setEditingRide] = useState(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [endingRide, setEndingRide] = useState(null);
  const [endForm, setEndForm] = useState({ endTime: '', endOdometerKm: '', abnormality: 'NONE', abnormalityNote: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (!u) return;
      if (u.role === 'admin') setIsAdmin(true);
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        if (staffList[0].role === 'admin') setIsAdmin(true);
      }
      setUser(u);
    }).catch(() => {});
  }, []);

  const { data: todayRides = [] } = useQuery({
    queryKey: ['rides', today],
    queryFn: () => base44.entities.Ride.filter({ date: today }, '-createdAtUtcMs'),
    refetchInterval: 30000,
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ isActive: true }),
  });

  const { data: todayDriverCheck = [] } = useQuery({
    queryKey: ['driverCheck', today, user?.email],
    queryFn: () => user ? base44.entities.DriverDailyCheck.filter({ date: today, driverEmail: user.email }) : [],
    enabled: !!user,
  });

  const { data: todayVehicleChecks = [] } = useQuery({
    queryKey: ['vehicleCheck', today],
    queryFn: () => base44.entities.VehiclePreCheck.filter({ date: today }),
  });

  const { data: submittedRides = [] } = useQuery({
    queryKey: ['submittedRides'],
    queryFn: () => isAdmin ? base44.entities.Ride.filter({ status: 'SUBMITTED' }) : [],
    enabled: isAdmin,
  });

  const endRideMutation = useMutation({
    mutationFn: async ({ rideId, data }) => {
      const dist = data.endOdometerKm && endingRide?.startOdometerKm
        ? parseFloat(data.endOdometerKm) - parseFloat(endingRide.startOdometerKm)
        : 0;
      await base44.entities.Ride.update(rideId, {
        endTime: data.endTime,
        endOdometerKm: parseFloat(data.endOdometerKm),
        distanceKm: Math.max(0, dist),
        abnormality: data.abnormality,
        abnormalityNote: data.abnormalityNote,
        status: 'SUBMITTED',
      });
      const admins = await base44.entities.Staff.filter({ role: 'admin' });
      await Promise.all(admins.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'system',
          title: '運行が提出されました',
          content: `${user?.full_name || user?.email} さんが運行記録を提出しました（${endingRide?.date} ${tripTypeLabel[endingRide?.tripType]}）`,
          priority: 'medium',
          createdAtUtc: Date.now(),
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rides', today] });
      queryClient.invalidateQueries({ queryKey: ['submittedRides'] });
      setEndDialogOpen(false);
      setEndingRide(null);
      setEndForm({ endTime: '', endOdometerKm: '', abnormality: 'NONE', abnormalityNote: '' });
    },
  });

  const openEndDialog = (ride) => {
    setEndingRide(ride);
    setEndForm({ endTime: format(new Date(), 'HH:mm'), endOdometerKm: '', abnormality: 'NONE', abnormalityNote: '' });
    setEndDialogOpen(true);
  };

  const driverChecked = todayDriverCheck.length > 0;
  const submittedCount = submittedRides.length;
  const draftRides = todayRides.filter(r => r.status === 'DRAFT');
  const submittedToday = todayRides.filter(r => r.status === 'SUBMITTED').length;
  const approvedToday = todayRides.filter(r => r.status === 'APPROVED').length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '😊 おはようございます' : hour < 17 ? '☀️ こんにちは' : '🌙 おつかれさまです';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-50">
      {/* カラフルヘッダー */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white px-4 pt-6 pb-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-10 text-9xl">🚌</div>
        </div>
        <div className="relative max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-blue-100 text-sm">{greeting}</p>
              <h1 className="text-2xl font-bold tracking-tight">{user?.full_name || 'スタッフ'} さん</h1>
              <p className="text-blue-200 text-sm mt-0.5">{format(new Date(), 'yyyy年M月d日（eee）', { locale: ja })}</p>
            </div>
            {isAdmin && (
              <Link to={createPageUrl('TransportAdmin')}>
                <button className="bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-all">
                  <Settings className="w-3 h-3" />管理センター
                </button>
              </Link>
            )}
          </div>

          {/* 今日のカウンター */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: '今日の運行', value: todayRides.length, color: 'bg-white/20' },
              { label: '提出済み', value: submittedToday, color: 'bg-white/20' },
              { label: '承認済み', value: approvedToday, color: 'bg-emerald-400/30' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} backdrop-blur rounded-xl p-2.5 text-center`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-blue-100">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 pb-10">

        {/* 警告バナー */}
        {!driverChecked && (
          <div className="bg-amber-400 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-amber-200">
            <div className="bg-white/30 rounded-full p-2">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-white">
              <p className="font-bold text-sm">運転者健康確認が未実施！</p>
              <p className="text-xs text-amber-100">運行前に必ず確認してください</p>
            </div>
            <button
              className="bg-white text-amber-600 font-bold text-xs px-3 py-1.5 rounded-full shadow"
              onClick={() => setDriverCheckOpen(true)}
            >
              今すぐ確認
            </button>
          </div>
        )}

        {/* 承認待ち（管理者） */}
        {isAdmin && submittedCount > 0 && (
          <div className="bg-blue-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-blue-200">
            <div className="bg-white/20 rounded-full p-2">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-white">
              <p className="font-bold text-sm">承認待ち：{submittedCount}件</p>
              <p className="text-xs text-blue-200">スタッフからの提出があります</p>
            </div>
            <Link to={createPageUrl('TransportAdmin')}>
              <button className="bg-white text-blue-600 font-bold text-xs px-3 py-1.5 rounded-full shadow">承認する</button>
            </Link>
          </div>
        )}

        {/* 進行中の運行 */}
        {draftRides.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-orange-200">
            <div className="bg-gradient-to-r from-orange-400 to-red-400 px-4 py-2.5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">進行中の運行 — 完了報告してください</span>
            </div>
            <div className="p-3 space-y-2">
              {draftRides.map(ride => (
                <div key={ride.id} className="flex items-center justify-between bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{tripTypeLabel[ride.tripType]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">🚌 {ride.vehicleName}｜🕐 出発 {ride.startTime}</p>
                  </div>
                  <button
                    className="bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
                    onClick={() => openEndDialog(ride)}
                  >
                    完了報告
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メインアクションボタン */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">アクション</p>
          {/* 新規運行ボタン（大） */}
          <button
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-blue-200 transition-all active:scale-98"
            onClick={() => { setEditingRide(null); setRideDialogOpen(true); }}
          >
            <div className="bg-white/20 rounded-2xl p-3">
              <Plus className="w-8 h-8" />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold">新規運行を開始</p>
              <p className="text-blue-100 text-sm">テンプレを選ぶだけ！1分で完了</p>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              className={`flex items-center gap-3 rounded-2xl p-4 border-2 transition-all ${driverChecked ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
              onClick={() => setDriverCheckOpen(true)}
            >
              <div className={`rounded-full p-2 ${driverChecked ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {driverChecked
                  ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                  : <AlertCircle className="w-5 h-5 text-amber-500" />
                }
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500">健康確認</p>
                <p className={`text-sm font-bold ${driverChecked ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {driverChecked ? '完了 ✓' : '未実施'}
                </p>
              </div>
            </button>

            <button
              className="flex items-center gap-3 rounded-2xl p-4 border-2 border-slate-200 bg-slate-50 transition-all hover:border-blue-200 hover:bg-blue-50"
              onClick={() => setVehicleCheckOpen(true)}
            >
              <div className="bg-slate-100 rounded-full p-2">
                <Car className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500">車両点検</p>
                <p className="text-sm font-bold text-slate-700">記録する</p>
              </div>
            </button>
          </div>
        </div>

        {/* 今日の運行記録 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-600">今日の運行記録</span>
          </div>
          {todayRides.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-4xl mb-2">🚌</p>
              <p className="text-slate-400 text-sm">まだ運行記録がありません</p>
            </div>
          ) : (
            <div className="divide-y">
              {todayRides.map(ride => (
                <div key={ride.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800">{tripTypeLabel[ride.tripType]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[ride.status]}`}>
                        {statusLabel[ride.status]}
                      </span>
                      {ride.abnormality !== 'NONE' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-medium">⚠ 要注意</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      🚌 {ride.vehicleName}｜👤 {ride.driverName}｜🕐 {ride.startTime}{ride.endTime ? `〜${ride.endTime}` : ''}
                      {ride.distanceKm ? `｜📍 ${ride.distanceKm}km` : ''}
                    </p>
                  </div>
                  <button
                    className="text-slate-300 hover:text-blue-500 transition-colors"
                    onClick={() => { setEditingRide(ride); setRideDialogOpen(true); }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ダイアログ群 */}
      <RideFormDialog
        open={rideDialogOpen}
        onClose={() => { setRideDialogOpen(false); setEditingRide(null); }}
        user={user}
        editingRide={editingRide}
        vehicles={allVehicles}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['rides', today] })}
      />

      <DriverCheckDialog
        open={driverCheckOpen}
        onClose={() => setDriverCheckOpen(false)}
        user={user}
        todayCheck={todayDriverCheck[0]}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['driverCheck', today, user?.email] })}
      />

      <VehicleCheckDialog
        open={vehicleCheckOpen}
        onClose={() => setVehicleCheckOpen(false)}
        user={user}
        vehicles={allVehicles}
        todayChecks={todayVehicleChecks}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['vehicleCheck', today] })}
      />

      {/* 完了報告ダイアログ */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🏁</span> 運行完了報告
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {endingRide && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                <p className="font-bold text-blue-800">{tripTypeLabel[endingRide.tripType]}</p>
                <p className="text-xs text-slate-500 mt-0.5">🚌 {endingRide.vehicleName}｜出発 {endingRide.startTime}｜開始 {endingRide.startOdometerKm}km</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">🕐 到着時刻 *</label>
                <Input type="time" value={endForm.endTime} onChange={e => setEndForm({ ...endForm, endTime: e.target.value })}
                  className="border-2 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">📍 終了メーター(km) *</label>
                <Input type="number" placeholder="例: 12345" value={endForm.endOdometerKm}
                  onChange={e => setEndForm({ ...endForm, endOdometerKm: e.target.value })}
                  className="border-2 focus:border-blue-400" />
              </div>
            </div>
            {endForm.endOdometerKm && endingRide?.startOdometerKm && (
              <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                <p className="text-emerald-700 font-bold text-lg">
                  走行距離：{Math.max(0, parseFloat(endForm.endOdometerKm) - parseFloat(endingRide.startOdometerKm)).toFixed(1)} km
                </p>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">異常の有無</label>
              <Select value={endForm.abnormality} onValueChange={v => setEndForm({ ...endForm, abnormality: v })}>
                <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">✅ 異常なし</SelectItem>
                  <SelectItem value="MINOR">⚠️ 軽微な異常あり</SelectItem>
                  <SelectItem value="ACCIDENT">🚨 事故・重大事故</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {endForm.abnormality !== 'NONE' && (
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">異常内容 *</label>
                <Input placeholder="異常の詳細を入力してください" value={endForm.abnormalityNote}
                  onChange={e => setEndForm({ ...endForm, abnormalityNote: e.target.value })}
                  className="border-2 border-red-200 focus:border-red-400" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>キャンセル</Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold"
              disabled={!endForm.endTime || !endForm.endOdometerKm || endRideMutation.isPending}
              onClick={() => endRideMutation.mutate({ rideId: endingRide.id, data: endForm })}
            >
              {endRideMutation.isPending ? '送信中...' : '完了・提出する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}