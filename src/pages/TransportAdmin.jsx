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
import { CheckCircle, XCircle, Car, Route, Edit, Trash2, Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const tripTypeLabel = { PICKUP: '朝便（迎え）', DROPOFF: '帰便（送り）', OTHER: 'その他' };
const abnormalityLabel = { NONE: '異常なし', MINOR: '軽微', ACCIDENT: '事故' };
const abnormalityColor = { NONE: 'bg-green-100 text-green-700', MINOR: 'bg-amber-100 text-amber-700', ACCIDENT: 'bg-red-100 text-red-700' };

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
        title: '運行記録が承認されました',
        content: `${ride.date} ${tripTypeLabel[ride.tripType]} の運行記録が承認されました`,
        priority: 'medium',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['submittedRides'] }); setDetailDialogOpen(false); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (ride) => {
      await base44.entities.Ride.update(ride.id, { status: 'DRAFT' });
      await base44.entities.Notification.create({
        user_email: ride.createdByEmail,
        type: 'system',
        title: '運行記録が差し戻されました',
        content: `${ride.date} ${tripTypeLabel[ride.tripType]} の運行記録が差し戻されました。修正して再提出してください。`,
        priority: 'high',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['submittedRides'] }); setDetailDialogOpen(false); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allVehicles'] }); },
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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">管理者のみアクセスできます</p>
        <Link to={createPageUrl('TransportDashboard')}><Button className="mt-4">ダッシュボードへ</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">送迎管理センター</h1>
        <Link to={createPageUrl('TransportDashboard')}>
          <Button variant="outline" size="sm">← ダッシュボードへ</Button>
        </Link>
      </div>

      <Tabs defaultValue="approval">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approval">
            承認待ち {submittedRides.length > 0 && <Badge className="ml-1 bg-red-100 text-red-700 text-xs">{submittedRides.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="vehicles">車両管理</TabsTrigger>
          <TabsTrigger value="templates">ルートテンプレ</TabsTrigger>
        </TabsList>

        {/* 承認待ち */}
        <TabsContent value="approval" className="space-y-3 mt-4">
          {submittedRides.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-slate-400">承認待ちの運行はありません</CardContent></Card>
          ) : submittedRides.map(ride => (
            <Card key={ride.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">提出済</Badge>
                      <Badge className={`text-xs ${abnormalityColor[ride.abnormality || 'NONE']}`}>
                        {abnormalityLabel[ride.abnormality || 'NONE']}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-800">{ride.date} {tripTypeLabel[ride.tripType]}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ride.vehicleName}（{ride.vehiclePlate}）/ 運転：{ride.driverName} /
                      {ride.startTime}〜{ride.endTime || '?'} / {ride.distanceKm || '?'}km
                    </p>
                    <p className="text-xs text-slate-400">提出者：{ride.createdByName}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openRideDetail(ride)}>詳細</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approveMutation.mutate(ride)}
                      disabled={approveMutation.isPending}>
                      <CheckCircle className="w-3 h-3 mr-1" />承認
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200"
                      onClick={() => rejectMutation.mutate(ride)}
                      disabled={rejectMutation.isPending}>
                      <XCircle className="w-3 h-3 mr-1" />差戻し
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 車両管理 */}
        <TabsContent value="vehicles" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditingVehicle(null); setVehicleForm({ name: '', plateNumber: '', model: '', capacity: '', isActive: true }); setVehicleDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />車両を追加
            </Button>
          </div>
          <div className="space-y-2">
            {allVehicles.map(v => (
              <Card key={v.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-sm text-slate-800">{v.name}</p>
                      <p className="text-xs text-slate-500">{v.plateNumber} {v.model && `/ ${v.model}`} {v.capacity && `/ 定員${v.capacity}名`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={v.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {v.isActive !== false ? '有効' : '無効'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openVehicleEdit(v)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-400"
                      onClick={() => window.confirm('削除しますか？') && deleteVehicleMutation.mutate(v.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ルートテンプレ */}
        <TabsContent value="templates" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', isActive: true }); setTemplateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />テンプレを追加
            </Button>
          </div>
          <div className="space-y-2">
            {routeTemplates.map(t => (
              <Card key={t.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Route className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-sm text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {tripTypeLabel[t.tripType]} / 利用者{(t.orderedClientIds || []).length}名
                        {t.defaultVehicleName && ` / ${t.defaultVehicleName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={t.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {t.isActive !== false ? '有効' : '無効'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, tripType: t.tripType, defaultVehicleId: t.defaultVehicleId || '', defaultVehicleName: t.defaultVehicleName || '', isActive: t.isActive !== false }); setTemplateDialogOpen(true); }}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400"
                      onClick={() => window.confirm('削除しますか？') && deleteTemplateMutation.mutate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 車両ダイアログ */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingVehicle ? '車両を編集' : '車両を追加'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">車両名 *</label>
              <Input placeholder="例：ハイエース1号" value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">ナンバー *</label>
              <Input placeholder="例：札幌 300 あ 1234" value={vehicleForm.plateNumber} onChange={e => setVehicleForm(f => ({ ...f, plateNumber: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">車種（任意）</label>
                <Input placeholder="例：ハイエース" value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">定員（任意）</label>
                <Input type="number" placeholder="例：8" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={vehicleForm.isActive} onCheckedChange={v => setVehicleForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm text-slate-700">有効</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>キャンセル</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!vehicleForm.name || !vehicleForm.plateNumber || saveVehicleMutation.isPending}
              onClick={() => saveVehicleMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* テンプレダイアログ */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingTemplate ? 'テンプレを編集' : 'テンプレを追加'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">テンプレ名 *</label>
              <Input placeholder="例：花川北 朝ルート" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">便種別</label>
              <Select value={templateForm.tripType} onValueChange={v => setTemplateForm(f => ({ ...f, tripType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PICKUP">朝便（迎え）</SelectItem>
                  <SelectItem value="DROPOFF">帰便（送り）</SelectItem>
                  <SelectItem value="OTHER">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">デフォルト車両（任意）</label>
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
            <div className="flex items-center gap-3">
              <Switch checked={templateForm.isActive} onCheckedChange={v => setTemplateForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm text-slate-700">有効</span>
            </div>
            <p className="text-xs text-slate-400">※ 利用者の順番はルート作成後に運行記録から設定できます</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>キャンセル</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!templateForm.name || saveTemplateMutation.isPending}
              onClick={() => saveTemplateMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 運行詳細ダイアログ */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>運行詳細確認</DialogTitle></DialogHeader>
          {selectedRide && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">日付：</span><span className="font-medium">{selectedRide.date}</span></div>
                <div><span className="text-slate-500">便種別：</span><span className="font-medium">{tripTypeLabel[selectedRide.tripType]}</span></div>
                <div><span className="text-slate-500">車両：</span><span className="font-medium">{selectedRide.vehicleName}（{selectedRide.vehiclePlate}）</span></div>
                <div><span className="text-slate-500">運転者：</span><span className="font-medium">{selectedRide.driverName}</span></div>
                {selectedRide.attendantName && <div><span className="text-slate-500">同乗：</span><span className="font-medium">{selectedRide.attendantName}</span></div>}
                <div><span className="text-slate-500">出発：</span><span className="font-medium">{selectedRide.startTime}</span></div>
                <div><span className="text-slate-500">到着：</span><span className="font-medium">{selectedRide.endTime}</span></div>
                <div><span className="text-slate-500">開始メーター：</span><span className="font-medium">{selectedRide.startOdometerKm}km</span></div>
                <div><span className="text-slate-500">終了メーター：</span><span className="font-medium">{selectedRide.endOdometerKm}km</span></div>
                <div><span className="text-slate-500">走行距離：</span><span className="font-medium">{selectedRide.distanceKm}km</span></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1"><Users className="w-3 h-3" />乗車利用者（{ridePassengers.length}名）</p>
                {ridePassengers.length === 0
                  ? <p className="text-xs text-slate-400">記録なし</p>
                  : ridePassengers.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                      <span className="flex-1">{p.clientName}</span>
                      <span className="text-xs text-slate-400">{p.boardTime && `乗:${p.boardTime}`} {p.alightTime && `降:${p.alightTime}`}</span>
                      <Badge className={`text-xs ${p.seatBeltChecked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        SB{p.seatBeltChecked ? '✓' : '✗'}
                      </Badge>
                    </div>
                  ))
                }
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">異常報告</p>
                <Badge className={`${abnormalityColor[selectedRide.abnormality || 'NONE']}`}>
                  {abnormalityLabel[selectedRide.abnormality || 'NONE']}
                </Badge>
                {selectedRide.abnormalityNote && <p className="text-sm text-slate-700 mt-1">{selectedRide.abnormalityNote}</p>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>閉じる</Button>
            <Button className="text-red-500 border-red-200" variant="outline"
              onClick={() => rejectMutation.mutate(selectedRide)}
              disabled={rejectMutation.isPending}>
              <XCircle className="w-4 h-4 mr-1" />差戻し
            </Button>
            <Button className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate(selectedRide)}
              disabled={approveMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-1" />承認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}