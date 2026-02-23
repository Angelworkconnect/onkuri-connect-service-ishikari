import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Car, Clock, MapPin, Users, Plus, ChevronRight, FileText, Settings, AlertCircle, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RideFormDialog from '@/components/transport/RideFormDialog.jsx';
import DriverCheckDialog from '@/components/transport/DriverCheckDialog.jsx';
import VehicleCheckDialog from '@/components/transport/VehicleCheckDialog.jsx';

const today = format(new Date(), 'yyyy-MM-dd');
const tripTypeLabel = { PICKUP: '朝便（迎え）', DROPOFF: '帰便（送り）', OTHER: 'その他' };
const statusColor = { DRAFT: 'bg-yellow-100 text-yellow-700', SUBMITTED: 'bg-blue-100 text-blue-700', APPROVED: 'bg-green-100 text-green-700' };
const statusLabel = { DRAFT: '下書き', SUBMITTED: '提出済', APPROVED: '承認済' };

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
      // 管理者に通知
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
    setEndForm({
      endTime: format(new Date(), 'HH:mm'),
      endOdometerKm: '',
      abnormality: 'NONE',
      abnormalityNote: '',
    });
    setEndDialogOpen(true);
  };

  const driverChecked = todayDriverCheck.length > 0;
  const checkedVehicleIds = new Set(todayVehicleChecks.map(c => c.vehicleId));
  const submittedCount = submittedRides.length;
  const draftRides = todayRides.filter(r => r.status === 'DRAFT');
  const submittedToday = todayRides.filter(r => r.status === 'SUBMITTED').length;
  const approvedToday = todayRides.filter(r => r.status === 'APPROVED').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            送迎運行管理
          </h1>
          <p className="text-sm text-slate-500">{format(new Date(), 'yyyy年M月d日（eee）', { locale: ja })}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link to={createPageUrl('TransportAdmin')}>
              <Button variant="outline" size="sm"><Settings className="w-4 h-4 mr-1" />管理</Button>
            </Link>
          )}
          <Link to={createPageUrl('TransportExport')}>
            <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" />PDF出力</Button>
          </Link>
        </div>
      </div>

      {/* 警告バナー */}
      {!driverChecked && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">運転者健康確認が未実施です</p>
          </div>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setDriverCheckOpen(true)}>
            確認する
          </Button>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{todayRides.length}</p>
            <p className="text-xs text-slate-500">今日の運行</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{submittedToday}</p>
            <p className="text-xs text-slate-500">提出済み</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{approvedToday}</p>
            <p className="text-xs text-slate-500">承認済み</p>
          </CardContent>
        </Card>
      </div>

      {/* 新規運行 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md flex-col gap-1"
          onClick={() => { setEditingRide(null); setRideDialogOpen(true); }}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-bold">新規運行を開始</span>
        </Button>
        <div className="grid grid-cols-1 gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDriverCheckOpen(true)}>
            {driverChecked ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />}
            運転者確認
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setVehicleCheckOpen(true)}>
            <Car className="w-3 h-3 mr-1" />
            車両点検記録
          </Button>
        </div>
      </div>

      {/* 進行中・今日の運行 */}
      {draftRides.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-bold text-orange-700">🚌 進行中の運行（完了報告が必要）</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {draftRides.map(ride => (
              <div key={ride.id} className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-medium text-sm text-slate-800">{tripTypeLabel[ride.tripType]}</p>
                  <p className="text-xs text-slate-500">{ride.vehicleName} / {ride.driverName} / 出発 {ride.startTime}</p>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                  onClick={() => openEndDialog(ride)}>
                  完了報告
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 今日の全運行 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-bold text-slate-700">今日の運行記録</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {todayRides.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">今日の運行はまだありません</p>
          ) : (
            todayRides.map(ride => (
              <div key={ride.id} className="border rounded-lg p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">{tripTypeLabel[ride.tripType]}</span>
                      <Badge className={`text-xs px-2 py-0 ${statusColor[ride.status]}`}>{statusLabel[ride.status]}</Badge>
                      {ride.abnormality !== 'NONE' && <Badge className="text-xs px-2 py-0 bg-red-100 text-red-700">要注意</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {ride.vehicleName} / {ride.driverName} / {ride.startTime}{ride.endTime ? `〜${ride.endTime}` : ''} / {ride.distanceKm ? `${ride.distanceKm}km` : '走行中'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingRide(ride); setRideDialogOpen(true); }}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 管理者：承認待ち */}
      {isAdmin && submittedCount > 0 && (
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">承認待ちの運行が {submittedCount} 件あります</span>
            </div>
            <Link to={createPageUrl('TransportAdmin')}>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white text-xs">承認する</Button>
            </Link>
          </CardContent>
        </Card>
      )}

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
            <DialogTitle>運行完了報告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {endingRide && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{tripTypeLabel[endingRide.tripType]}</p>
                <p className="text-slate-500">{endingRide.vehicleName} / 出発 {endingRide.startTime} / 開始メーター {endingRide.startOdometerKm}km</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">到着時刻 *</label>
                <Input type="time" value={endForm.endTime} onChange={e => setEndForm({ ...endForm, endTime: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">終了メーター (km) *</label>
                <Input type="number" placeholder="例: 12345" value={endForm.endOdometerKm}
                  onChange={e => setEndForm({ ...endForm, endOdometerKm: e.target.value })} />
              </div>
            </div>
            {endForm.endOdometerKm && endingRide?.startOdometerKm && (
              <div className="bg-green-50 rounded p-2 text-sm text-green-700 text-center">
                走行距離：{Math.max(0, parseFloat(endForm.endOdometerKm) - parseFloat(endingRide.startOdometerKm)).toFixed(1)} km
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">異常の有無</label>
              <Select value={endForm.abnormality} onValueChange={v => setEndForm({ ...endForm, abnormality: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">なし</SelectItem>
                  <SelectItem value="MINOR">軽微な異常あり</SelectItem>
                  <SelectItem value="ACCIDENT">事故・重大事故</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {endForm.abnormality !== 'NONE' && (
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">異常内容</label>
                <Input placeholder="異常の詳細を入力" value={endForm.abnormalityNote}
                  onChange={e => setEndForm({ ...endForm, abnormalityNote: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>キャンセル</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!endForm.endTime || !endForm.endOdometerKm || endRideMutation.isPending}
              onClick={() => endRideMutation.mutate({ rideId: endingRide.id, data: endForm })}
            >
              完了・提出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}