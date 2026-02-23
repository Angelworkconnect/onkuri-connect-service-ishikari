import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle, XCircle, Car, Route, Edit, Trash2, Plus, Users, Shield, FileSearch, AlertTriangle, ChevronDown, ChevronUp, Printer, Clock, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const tripTypeLabel = { PICKUP: '朝便（迎え）', DROPOFF: '帰便（送り）', OTHER: 'その他' };
const abnormalityLabel = { NONE: '異常なし', MINOR: '軽微', ACCIDENT: '事故' };
const abnormalityColor = { NONE: 'bg-emerald-100 text-emerald-700', MINOR: 'bg-amber-100 text-amber-700', ACCIDENT: 'bg-red-100 text-red-700' };

export default function TransportAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ name: '', plateNumber: '', model: '', capacity: '', isActive: true });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', isActive: true });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [ridePassengers, setRidePassengers] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
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

  const { data: submittedRides = [] } = useQuery({
    queryKey: ['submittedRides'],
    queryFn: () => base44.entities.Ride.filter({ status: 'SUBMITTED' }, '-createdAtUtcMs'),
  });

  const { data: approvedRides = [] } = useQuery({
    queryKey: ['approvedRides'],
    queryFn: () => base44.entities.Ride.filter({ status: 'APPROVED' }, '-approvedAtUtcMs', 30),
    enabled: historyOpen,
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['allVehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: routeTemplates = [] } = useQuery({
    queryKey: ['allRouteTemplates'],
    queryFn: () => base44.entities.RouteTemplate.list(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['careClients'],
    queryFn: () => base44.entities.CareClient.filter({ status: 'active' }),
  });

  const { data: recentDriverChecks = [] } = useQuery({
    queryKey: ['recentDriverChecks'],
    queryFn: () => base44.entities.DriverDailyCheck.list('-createdAtUtcMs', 10),
  });

  const { data: recentVehicleChecks = [] } = useQuery({
    queryKey: ['recentVehicleChecks'],
    queryFn: () => base44.entities.VehiclePreCheck.list('-checkedAtUtcMs', 10),
  });

  const approveMutation = useMutation({
    mutationFn: async (ride) => {
      await base44.entities.Ride.update(ride.id, {
        status: 'APPROVED',
        approvedByEmail: user?.email,
        approvedByName: user?.full_name || user?.email,
        approvedAtUtcMs: Date.now(),
      });
      await base44.entities.Notification.create({
        user_email: ride.createdByEmail,
        type: 'system',
        title: '✅ 運行記録が承認されました',
        content: `${ride.date} ${tripTypeLabel[ride.tripType]} の運行記録が承認されました`,
        priority: 'medium',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittedRides'] });
      queryClient.invalidateQueries({ queryKey: ['approvedRides'] });
      setDetailDialogOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (ride) => {
      await base44.entities.Ride.update(ride.id, { status: 'DRAFT' });
      await base44.entities.Notification.create({
        user_email: ride.createdByEmail,
        type: 'system',
        title: '⚠️ 運行記録が差し戻されました',
        content: `${ride.date} ${tripTypeLabel[ride.tripType]} の運行記録が差し戻されました。修正して再提出してください。`,
        priority: 'high',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittedRides'] });
      setDetailDialogOpen(false);
    },
  });

  const openRideDetail = async (ride) => {
    setSelectedRide(ride);
    const passengers = await base44.entities.RidePassenger.filter({ rideId: ride.id }, 'order');
    setRidePassengers(passengers);
    setDetailDialogOpen(true);
  };

  // Vehicle CRUD
  const saveVehicleMutation = useMutation({
    mutationFn: async () => {
      const data = { ...vehicleForm, capacity: vehicleForm.capacity ? parseInt(vehicleForm.capacity) : undefined };
      if (editingVehicle) return base44.entities.Vehicle.update(editingVehicle.id, data);
      return base44.entities.Vehicle.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleDialogOpen(false);
      setEditingVehicle(null);
      setVehicleForm({ name: '', plateNumber: '', model: '', capacity: '', isActive: true });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allVehicles'] }),
  });

  const openVehicleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({ name: vehicle.name, plateNumber: vehicle.plateNumber, model: vehicle.model || '', capacity: vehicle.capacity || '', isActive: vehicle.isActive !== false });
    setVehicleDialogOpen(true);
  };

  // Template CRUD
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) return base44.entities.RouteTemplate.update(editingTemplate.id, templateForm);
      return base44.entities.RouteTemplate.create(templateForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRouteTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['routeTemplates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', isActive: true });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.RouteTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allRouteTemplates'] }),
  });

  if (!isAdmin && user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg font-medium">管理者のみアクセスできます</p>
        <Link to={createPageUrl('TransportDashboard')}>
          <Button className="mt-4">ダッシュボードへ戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* ダークヘッダー（管理者専用） */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 px-4 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 rounded-xl p-2">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">送迎管理センター</h1>
              <p className="text-slate-400 text-xs">管理者専用ダッシュボード</p>
            </div>
          </div>
          <Link to={createPageUrl('TransportDashboard')}>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                ← スタッフ画面
              </Button>
            </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        <Tabs defaultValue="approval">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
            <TabsTrigger value="approval" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400 text-xs">
              承認待ち
              {submittedRides.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{submittedRides.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="checks" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400 text-xs">点検記録</TabsTrigger>
            <TabsTrigger value="vehicles" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400 text-xs">車両管理</TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400 text-xs">ルート</TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400 text-xs">PDF出力</TabsTrigger>
          </TabsList>

          {/* ===== 承認待ち ===== */}
          <TabsContent value="approval" className="space-y-3 mt-4">
            {submittedRides.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl py-14 text-center border border-slate-700">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">承認待ちの運行はありません</p>
              </div>
            ) : submittedRides.map(ride => (
              <div key={ride.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 hover:border-amber-500/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">提出済</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${abnormalityColor[ride.abnormality || 'NONE']}`}>
                        {abnormalityLabel[ride.abnormality || 'NONE']}
                      </span>
                      {ride.abnormality === 'ACCIDENT' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <p className="text-white font-bold">{ride.date}（{tripTypeLabel[ride.tripType]}）</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      🚌 {ride.vehicleName}（{ride.vehiclePlate}）｜👤 {ride.driverName}｜🕐 {ride.startTime}〜{ride.endTime || '?'}｜📍 {ride.distanceKm || '?'}km
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">提出者：{ride.createdByName}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => openRideDetail(ride)}>
                      <FileSearch className="w-3 h-3 mr-1" />詳細確認
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => approveMutation.mutate(ride)} disabled={approveMutation.isPending}>
                      <CheckCircle className="w-3 h-3 mr-1" />承認
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-900/30"
                      onClick={() => rejectMutation.mutate(ride)} disabled={rejectMutation.isPending}>
                      <XCircle className="w-3 h-3 mr-1" />差戻し
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* 承認済み履歴 */}
            <div className="mt-4">
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 hover:text-slate-300 transition-colors"
              >
                <span className="text-sm font-medium">承認済み履歴（直近30件）</span>
                {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {historyOpen && (
                <div className="mt-2 space-y-2">
                  {approvedRides.map(ride => (
                    <div key={ride.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-sm font-medium">{ride.date}（{tripTypeLabel[ride.tripType]}）</p>
                        <p className="text-slate-500 text-xs">{ride.vehicleName}｜{ride.driverName}｜{ride.distanceKm}km</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded-full">✓ 承認済</span>
                        <p className="text-slate-500 text-xs mt-1">承認：{ride.approvedByName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== 点検記録確認 ===== */}
          <TabsContent value="checks" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 運転者健康確認 */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="bg-blue-900/50 border-b border-slate-700 px-4 py-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-bold text-sm">運転者健康確認（直近10件）</span>
                </div>
                <div className="divide-y divide-slate-700">
                  {recentDriverChecks.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-6">記録なし</p>
                  ) : recentDriverChecks.map(c => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{c.driverName}</p>
                          <p className="text-slate-500 text-xs">{c.date}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.fitForDuty === 'OK' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                            {c.fitForDuty === 'OK' ? '✅ 問題なし' : '⚠️ 要配慮'}
                          </span>
                          <p className="text-slate-500 text-xs mt-1">
                            アルコール：{c.alcoholCheck ? '✓ 実施' : '未記録'}
                          </p>
                        </div>
                      </div>
                      {c.notes && <p className="text-slate-400 text-xs mt-1 bg-slate-700/50 rounded px-2 py-1">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 車両使用前点検 */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="bg-purple-900/50 border-b border-slate-700 px-4 py-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 font-bold text-sm">車両点検記録（直近10件）</span>
                </div>
                <div className="divide-y divide-slate-700">
                  {recentVehicleChecks.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-6">記録なし</p>
                  ) : recentVehicleChecks.map(c => (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{c.vehicleName}</p>
                          <p className="text-slate-500 text-xs">{c.date}｜点検者：{c.checkerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-300 text-xs">燃料：{c.fuelLevel}</p>
                          {c.otherIssue && (
                            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">⚠ 異常あり</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {[
                          { key: 'tireOK', label: 'タイヤ' },
                          { key: 'lightsOK', label: 'ライト' },
                          { key: 'brakeOK', label: 'ブレーキ' },
                          { key: 'exteriorDamageNone', label: '外装' },
                          { key: 'interiorOK', label: '車内' },
                        ].map(({ key, label }) => (
                          <span key={key} className={`text-xs px-1.5 py-0.5 rounded ${c[key] ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                            {c[key] ? '✓' : '✗'}{label}
                          </span>
                        ))}
                      </div>
                      {c.issueNote && <p className="text-red-300 text-xs mt-1 bg-red-900/20 rounded px-2 py-1">{c.issueNote}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== 車両管理 ===== */}
          <TabsContent value="vehicles" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-slate-400 text-sm">登録車両一覧</p>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => { setEditingVehicle(null); setVehicleForm({ name: '', plateNumber: '', model: '', capacity: '', isActive: true }); setVehicleDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />車両を追加
              </Button>
            </div>
            <div className="space-y-2">
              {allVehicles.map(v => (
                <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 rounded-xl p-2.5">
                      <Car className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{v.name}</p>
                      <p className="text-slate-400 text-xs">
                        ナンバー：{v.plateNumber}
                        {v.model && ` ｜ 車種：${v.model}`}
                        {v.capacity && ` ｜ 定員：${v.capacity}名`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.isActive !== false ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                      {v.isActive !== false ? '有効' : '無効'}
                    </span>
                    <button className="text-slate-400 hover:text-amber-400 p-1 transition-colors" onClick={() => openVehicleEdit(v)}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                      onClick={() => window.confirm('この車両を削除しますか？') && deleteVehicleMutation.mutate(v.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ===== ルートテンプレ ===== */}
          <TabsContent value="templates" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-slate-400 text-sm">ルートテンプレ一覧（スタッフが1タップで選べます）</p>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', isActive: true }); setTemplateDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />テンプレを追加
              </Button>
            </div>
            <div className="space-y-2">
              {routeTemplates.map(t => (
                <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 rounded-xl p-2.5">
                      <Route className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{t.name}</p>
                      <p className="text-slate-400 text-xs">
                        {tripTypeLabel[t.tripType]} ｜ 利用者 {(t.orderedClientIds || []).length}名
                        {t.defaultVehicleName && ` ｜ ${t.defaultVehicleName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive !== false ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                      {t.isActive !== false ? '有効' : '無効'}
                    </span>
                    <button className="text-slate-400 hover:text-amber-400 p-1 transition-colors"
                      onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, tripType: t.tripType, defaultVehicleId: t.defaultVehicleId || '', defaultVehicleName: t.defaultVehicleName || '', isActive: t.isActive !== false }); setTemplateDialogOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                      onClick={() => window.confirm('このテンプレを削除しますか？') && deleteTemplateMutation.mutate(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 車両ダイアログ */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-500" />
              {editingVehicle ? '車両を編集' : '車両を追加'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">車両名 *</label>
              <Input placeholder="例：ハイエース1号" value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">ナンバープレート *</label>
              <Input placeholder="例：札幌 300 あ 1234" value={vehicleForm.plateNumber} onChange={e => setVehicleForm(f => ({ ...f, plateNumber: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">車種（任意）</label>
                <Input placeholder="例：ハイエース" value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">定員（任意）</label>
                <Input type="number" placeholder="例：8" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Switch checked={vehicleForm.isActive} onCheckedChange={v => setVehicleForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm text-slate-700 font-medium">有効（スタッフが選択可能）</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>キャンセル</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!vehicleForm.name || !vehicleForm.plateNumber || saveVehicleMutation.isPending}
              onClick={() => saveVehicleMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* テンプレダイアログ */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-amber-500" />
              {editingTemplate ? 'テンプレを編集' : 'テンプレを追加'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">テンプレ名 *</label>
              <Input placeholder="例：花川北 朝ルート" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">便種別</label>
              <Select value={templateForm.tripType} onValueChange={v => setTemplateForm(f => ({ ...f, tripType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PICKUP">🌅 朝便（迎え）</SelectItem>
                  <SelectItem value="DROPOFF">🌇 帰便（送り）</SelectItem>
                  <SelectItem value="OTHER">🚐 その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">デフォルト車両（任意）</label>
              <Select value={templateForm.defaultVehicleId || 'none'} onValueChange={v => {
                const vehicle = allVehicles.find(x => x.id === v);
                setTemplateForm(f => ({ ...f, defaultVehicleId: v === 'none' ? '' : v, defaultVehicleName: vehicle?.name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {allVehicles.filter(v => v.isActive !== false).map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Switch checked={templateForm.isActive} onCheckedChange={v => setTemplateForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm text-slate-700 font-medium">有効（スタッフの選択肢に表示）</span>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              💡 利用者の乗車順はスタッフが運行記録から設定できます
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>キャンセル</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!templateForm.name || saveTemplateMutation.isPending}
              onClick={() => saveTemplateMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 運行詳細ダイアログ */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-blue-500" />
              運行詳細確認
            </DialogTitle>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-4 py-2">
              {/* 基本情報 */}
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500 text-xs">日付</span><p className="font-bold text-slate-800">{selectedRide.date}</p></div>
                <div><span className="text-slate-500 text-xs">便種別</span><p className="font-bold text-slate-800">{tripTypeLabel[selectedRide.tripType]}</p></div>
                <div><span className="text-slate-500 text-xs">車両</span><p className="font-bold text-slate-800">{selectedRide.vehicleName}（{selectedRide.vehiclePlate}）</p></div>
                <div><span className="text-slate-500 text-xs">運転者</span><p className="font-bold text-slate-800">{selectedRide.driverName}</p></div>
                {selectedRide.attendantName && <div><span className="text-slate-500 text-xs">同乗スタッフ</span><p className="font-bold text-slate-800">{selectedRide.attendantName}</p></div>}
                <div><span className="text-slate-500 text-xs">出発時刻</span><p className="font-bold text-slate-800">{selectedRide.startTime}</p></div>
                <div><span className="text-slate-500 text-xs">到着時刻</span><p className="font-bold text-slate-800">{selectedRide.endTime}</p></div>
                <div><span className="text-slate-500 text-xs">開始メーター</span><p className="font-bold text-slate-800">{selectedRide.startOdometerKm}km</p></div>
                <div><span className="text-slate-500 text-xs">終了メーター</span><p className="font-bold text-slate-800">{selectedRide.endOdometerKm}km</p></div>
                <div><span className="text-slate-500 text-xs">走行距離</span><p className="font-bold text-blue-700 text-lg">{selectedRide.distanceKm}km</p></div>
              </div>

              {/* 異常報告 */}
              <div className="rounded-xl border p-3">
                <p className="text-xs font-bold text-slate-600 mb-2">異常報告</p>
                <span className={`text-sm px-3 py-1 rounded-full font-bold ${abnormalityColor[selectedRide.abnormality || 'NONE']}`}>
                  {abnormalityLabel[selectedRide.abnormality || 'NONE']}
                </span>
                {selectedRide.abnormalityNote && (
                  <p className="text-sm text-slate-700 mt-2 bg-amber-50 rounded-lg p-2 border border-amber-100">{selectedRide.abnormalityNote}</p>
                )}
              </div>

              {/* 乗客 */}
              <div className="rounded-xl border p-3">
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 乗車利用者（{ridePassengers.length}名）
                </p>
                {ridePassengers.length === 0
                  ? <p className="text-xs text-slate-400">記録なし</p>
                  : ridePassengers.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm py-2 border-b last:border-0">
                      <span className="flex-1 font-medium">{p.clientName}</span>
                      <span className="text-xs text-slate-400">{p.boardTime && `乗:${p.boardTime}`} {p.alightTime && `降:${p.alightTime}`}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${p.seatBeltChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        SB{p.seatBeltChecked ? '✓' : '✗'}
                      </span>
                    </div>
                  ))
                }
              </div>

              {/* 提出情報 */}
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                <p>提出者：{selectedRide.createdByName}</p>
                {selectedRide.routeTemplateName && <p>ルートテンプレ：{selectedRide.routeTemplateName}</p>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => rejectMutation.mutate(selectedRide)} disabled={rejectMutation.isPending}>
              <XCircle className="w-4 h-4 mr-1" />差戻し
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => approveMutation.mutate(selectedRide)} disabled={approveMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-1" />承認する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}