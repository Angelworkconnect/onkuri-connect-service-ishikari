import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Truck, Download, Settings, ClipboardCheck, Plus, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const today = new Date().toISOString().split('T')[0];
const tripLabel = (t) => t === 'PICKUP' ? '🌅 朝便' : t === 'DROPOFF' ? '🌇 帰便' : '🚐 その他';

export default function TransportAdmin() {
  const [user, setUser] = useState(null);
  const [detailRide, setDetailRide] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [exportFrom, setExportFrom] = useState(today);
  const [exportTo, setExportTo] = useState(today);
  const [exportVehicle, setExportVehicle] = useState('');
  const [exportDriver, setExportDriver] = useState('');
  const [exportTripType, setExportTripType] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportLogs, setExportLogs] = useState([]);
  const [vehicleDialog, setVehicleDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ name: '', plateNumber: '', model: '', capacityRegular: '', capacityWithWheelchair: '', wheelchairAccessible: false, isActive: true });
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', defaultPassengerNames: [], isActive: true });
  const [passengerInput, setPassengerInput] = useState('');
  const [clientDialog, setClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', address: '', wheelchairRequired: false, notes: '', daysOfWeek: [], isActive: true });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async u => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) u.full_name = staffList[0].full_name;
      if (u.role !== 'admin' && !(staffList[0]?.role === 'admin')) {
        alert('管理者権限が必要です'); window.location.href = '/';
      }
      setUser(u);
      const logs = await base44.entities.TransportExportLog.list('-created_date', 20);
      setExportLogs(logs);
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: submittedRides = [] } = useQuery({
    queryKey: ['ta-submitted'],
    queryFn: () => base44.entities.Ride.filter({ status: 'SUBMITTED' }),
    enabled: !!user, refetchInterval: 30000,
  });
  const { data: approvedRides = [] } = useQuery({
    queryKey: ['ta-approved'],
    queryFn: () => base44.entities.Ride.filter({ status: 'APPROVED' }),
    enabled: !!user,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['ta-vehicles'],
    queryFn: () => base44.entities.Vehicle.list('name'),
    enabled: !!user,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['ta-staff'],
    queryFn: () => base44.entities.Staff.filter({ approval_status: 'approved' }),
    enabled: !!user,
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['ta-templates'],
    queryFn: () => base44.entities.RouteTemplate.list('name'),
    enabled: !!user,
  });
  const { data: preChecks = [] } = useQuery({
    queryKey: ['ta-prechecks'],
    queryFn: () => base44.entities.VehiclePreCheck.list('-date', 50),
    enabled: !!user,
  });
  const { data: driverChecks = [] } = useQuery({
    queryKey: ['ta-driverchecks'],
    queryFn: () => base44.entities.DriverDailyCheck.list('-date', 50),
    enabled: !!user,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['ta-clients'],
    queryFn: () => base44.entities.Client.list('name'),
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (ride) => {
      await base44.entities.Ride.update(ride.id, {
        status: 'APPROVED',
        approvedByEmail: user.email,
        approvedByName: user.full_name,
        approvedAtUtcMs: Date.now(),
        adminNote,
      });
      await base44.entities.Notification.create({
        user_email: ride.createdByEmail,
        type: 'transport',
        title: '送迎記録が承認されました',
        content: `${ride.date} ${tripLabel(ride.tripType)}`,
        link_url: '/Transport',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ta-submitted']);
      queryClient.invalidateQueries(['ta-approved']);
      setDetailRide(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (ride) => {
      await base44.entities.Ride.update(ride.id, { status: 'DRAFT', adminNote });
      await base44.entities.Notification.create({
        user_email: ride.createdByEmail,
        type: 'transport',
        title: '送迎記録が差し戻されました',
        content: `${ride.date} ${tripLabel(ride.tripType)}${adminNote ? '：' + adminNote : ''}`,
        link_url: '/Transport',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ta-submitted']);
      setDetailRide(null);
    },
  });

  const saveVehicleMutation = useMutation({
    mutationFn: (data) => editingVehicle
      ? base44.entities.Vehicle.update(editingVehicle.id, data)
      : base44.entities.Vehicle.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['ta-vehicles']); setVehicleDialog(false); },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['ta-vehicles']),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => editingTemplate
      ? base44.entities.RouteTemplate.update(editingTemplate.id, data)
      : base44.entities.RouteTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['ta-templates']); setTemplateDialog(false); },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.RouteTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['ta-templates']),
  });

  const saveClientMutation = useMutation({
    mutationFn: (data) => editingClient
      ? base44.entities.Client.update(editingClient.id, data)
      : base44.entities.Client.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['ta-clients']); setClientDialog(false); },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['ta-clients']),
  });

  const handleExportPDF = async (exportType) => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('generateTransportPdf', {
        dateFrom: exportFrom,
        dateTo: exportTo,
        vehicleId: exportVehicle || undefined,
        driverEmail: exportDriver || undefined,
        tripType: exportTripType || undefined,
        exportType,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport-${exportFrom}-${exportTo}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); a.remove();
      const logs = await base44.entities.TransportExportLog.list('-created_date', 20);
      setExportLogs(logs);
    } catch (e) {
      alert('PDF出力に失敗しました: ' + e.message);
    }
    setExporting(false);
  };

  const openVehicleDialog = (v = null) => {
    setEditingVehicle(v);
    setVehicleForm(v ? { name: v.name, plateNumber: v.plateNumber, model: v.model || '', capacityRegular: v.capacityRegular || '', capacityWithWheelchair: v.capacityWithWheelchair || '', wheelchairAccessible: v.wheelchairAccessible || false, isActive: v.isActive !== false } : { name: '', plateNumber: '', model: '', capacityRegular: '', capacityWithWheelchair: '', wheelchairAccessible: false, isActive: true });
    setVehicleDialog(true);
  };

  const openTemplateDialog = (t = null) => {
    setEditingTemplate(t);
    setTemplateForm(t ? { name: t.name, tripType: t.tripType, defaultVehicleId: t.defaultVehicleId || '', defaultVehicleName: t.defaultVehicleName || '', defaultPassengerNames: t.defaultPassengerNames || [], isActive: t.isActive !== false } : { name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', defaultPassengerNames: [], isActive: true });
    setPassengerInput((t?.defaultPassengerNames || []).join('\n'));
    setTemplateDialog(true);
  };

  const openClientDialog = (c = null) => {
    setEditingClient(c);
    setClientForm(c ? { name: c.name, phone: c.phone || '', address: c.address || '', wheelchairRequired: c.wheelchairRequired || false, notes: c.notes || '', daysOfWeek: c.daysOfWeek || [], isActive: c.isActive !== false } : { name: '', phone: '', address: '', wheelchairRequired: false, notes: '', daysOfWeek: [], isActive: true });
    setClientDialog(true);
  };

  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  if (!user) return <div className="min-h-screen flex items-center justify-center text-slate-400">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6" />
            <h1 className="text-2xl font-bold">送迎管理センター</h1>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: '承認待ち', value: submittedRides.length, color: 'text-amber-300' },
              { label: '承認済み（総計）', value: approvedRides.length, color: 'text-green-300' },
              { label: '登録車両', value: vehicles.filter(v => v.isActive !== false).length, color: 'text-blue-200' },
              { label: '本日の点検', value: preChecks.filter(c => c.date === today).length, color: 'text-purple-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
        <Tabs defaultValue="approval">
          <TabsList className="bg-white shadow p-1 mb-4 w-full flex-wrap gap-1">
            {[
              { value: 'approval', label: `承認 (${submittedRides.length})` },
              { value: 'checks', label: '点検記録' },
              { value: 'vehicles', label: '車両管理' },
              { value: 'clients', label: '利用者管理' },
              { value: 'templates', label: 'テンプレ' },
              { value: 'export', label: 'PDF出力' },
            ].map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-sm">{label}</TabsTrigger>
            ))}
          </TabsList>

          {/* 承認タブ */}
          <TabsContent value="approval">
            <Card className="border-0 shadow">
              <div className="p-4 border-b">
                <h2 className="font-bold">承認待ち運行一覧</h2>
              </div>
              {submittedRides.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>承認待ちの運行はありません</p>
                </div>
              ) : (
                <div className="divide-y">
                  {submittedRides.sort((a, b) => b.date.localeCompare(a.date)).map(ride => (
                    <div key={ride.id} className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between" onClick={() => { setDetailRide(ride); setAdminNote(ride.adminNote || ''); }}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{ride.date}</span>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">{tripLabel(ride.tripType)}</Badge>
                          {ride.abnormality !== 'NONE' && <Badge className="bg-red-100 text-red-700 text-xs">⚠️ 異常</Badge>}
                        </div>
                        <p className="text-sm text-slate-600">{ride.vehicleName} / {ride.driverName}</p>
                        <p className="text-xs text-slate-400">{ride.startTime} ～ {ride.endTime} / {(ride.distanceKm || 0).toFixed(1)}km</p>
                      </div>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={e => { e.stopPropagation(); setDetailRide(ride); setAdminNote(''); }}>
                        確認・承認
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* 点検タブ */}
          <TabsContent value="checks">
            <div className="space-y-4">
              <Card className="border-0 shadow">
                <div className="p-4 border-b font-bold">車両使用前点検（直近）</div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead>車両</TableHead>
                        <TableHead>点検者</TableHead>
                        <TableHead>燃料</TableHead>
                        <TableHead>タイヤ</TableHead>
                        <TableHead>ライト</TableHead>
                        <TableHead>ブレーキ</TableHead>
                        <TableHead>外観</TableHead>
                        <TableHead>問題</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preChecks.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.date}</TableCell>
                          <TableCell>{c.vehicleName}</TableCell>
                          <TableCell>{c.checkerName}</TableCell>
                          <TableCell>{c.fuelLevel}</TableCell>
                          <TableCell>{c.tireOK ? '✅' : '❌'}</TableCell>
                          <TableCell>{c.lightsOK ? '✅' : '❌'}</TableCell>
                          <TableCell>{c.brakeOK ? '✅' : '❌'}</TableCell>
                          <TableCell>{c.exteriorDamageNone ? '✅' : '❌'}</TableCell>
                          <TableCell>{c.otherIssue ? <span className="text-red-600">{c.issueNote}</span> : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
              <Card className="border-0 shadow">
                <div className="p-4 border-b font-bold">運転者の日常確認（直近）</div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead>運転者</TableHead>
                        <TableHead>就業可否</TableHead>
                        <TableHead>アルコール確認</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driverChecks.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.date}</TableCell>
                          <TableCell>{c.driverName}</TableCell>
                          <TableCell>
                            <Badge className={c.fitForDuty === 'OK' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                              {c.fitForDuty === 'OK' ? '問題なし' : '要配慮'}
                            </Badge>
                          </TableCell>
                          <TableCell>{c.alcoholCheck ? '✅ 実施済み' : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 車両管理タブ */}
          <TabsContent value="vehicles">
            <Card className="border-0 shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold">車両一覧</h2>
                <Button className="bg-[#2D4A6F]" onClick={() => openVehicleDialog()}>
                  <Plus className="w-4 h-4 mr-1" />新規車両
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>車両名</TableHead>
                      <TableHead>ナンバー</TableHead>
                      <TableHead>車種</TableHead>
                      <TableHead>定員</TableHead>
                      <TableHead>車椅子</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>{v.plateNumber}</TableCell>
                        <TableCell>{v.model || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {v.capacityRegular ? `${v.capacityRegular}名` : '-'}
                          {v.capacityWithWheelchair && v.wheelchairAccessible && (
                            <div className="text-xs text-slate-500">♿: {v.capacityWithWheelchair}名</div>
                          )}
                        </TableCell>
                        <TableCell>{v.wheelchairAccessible ? <Badge className="bg-purple-100 text-purple-700">♿ 可</Badge> : <span className="text-slate-400 text-xs">-</span>}</TableCell>
                        <TableCell><Badge className={v.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>{v.isActive !== false ? '有効' : '無効'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openVehicleDialog(v)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteVehicleMutation.mutate(v.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* 利用者管理タブ */}
          <TabsContent value="clients">
            <Card className="border-0 shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold">利用者一覧</h2>
                <Button className="bg-[#2D4A6F]" onClick={() => openClientDialog()}>
                  <Plus className="w-4 h-4 mr-1" />新規利用者
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>電話</TableHead>
                      <TableHead>利用曜日</TableHead>
                      <TableHead>♿</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.phone || '-'}</TableCell>
                        <TableCell className="text-sm">{c.daysOfWeek && c.daysOfWeek.length > 0 ? c.daysOfWeek.map(d => dayLabels[d]).join('') : '-'}</TableCell>
                        <TableCell>{c.wheelchairRequired ? '♿' : '-'}</TableCell>
                        <TableCell><Badge className={c.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>{c.isActive !== false ? '有効' : '無効'}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openClientDialog(c)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteClientMutation.mutate(c.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* テンプレタブ */}
          <TabsContent value="templates">
            <Card className="border-0 shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold">ルートテンプレ一覧</h2>
                <Button className="bg-[#2D4A6F]" onClick={() => openTemplateDialog()}>
                  <Plus className="w-4 h-4 mr-1" />新規テンプレ
                </Button>
              </div>
              <div className="divide-y">
                {templates.map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{t.name}</span>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">{tripLabel(t.tripType)}</Badge>
                        {!t.isActive && <Badge className="bg-slate-100 text-slate-500 text-xs">無効</Badge>}
                      </div>
                      <p className="text-sm text-slate-500">
                        {t.defaultVehicleName && `車両: ${t.defaultVehicleName} / `}
                        利用者: {(t.defaultPassengerNames || []).join('、') || 'なし'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openTemplateDialog(t)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteTemplateMutation.mutate(t.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* PDF出力タブ */}
          <TabsContent value="export">
            <div className="space-y-4">
              <Card className="border-0 shadow p-6">
                <h2 className="font-bold mb-4 flex items-center gap-2"><Download className="w-5 h-5" />PDF出力（監査対応）</h2>
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <Label>開始日 *</Label>
                    <Input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label>終了日 *</Label>
                    <Input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} />
                  </div>
                  <div>
                    <Label>車両フィルタ</Label>
                    <Select value={exportVehicle || 'all'} onValueChange={v => setExportVehicle(v === 'all' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="全車両" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全車両</SelectItem>
                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>便種別フィルタ</Label>
                    <Select value={exportTripType || 'all'} onValueChange={v => setExportTripType(v === 'all' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="全便種" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全便種</SelectItem>
                        <SelectItem value="PICKUP">朝便（迎え）</SelectItem>
                        <SelectItem value="DROPOFF">帰便（送り）</SelectItem>
                        <SelectItem value="OTHER">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button className="bg-[#2D4A6F] hover:bg-[#1E3A5F]" disabled={exporting} onClick={() => handleExportPDF('PDF_DAILY')}>
                    <Download className="w-4 h-4 mr-2" />
                    {exporting ? '生成中...' : '日別PDF出力'}
                  </Button>
                  <Button variant="outline" disabled={exporting} onClick={() => handleExportPDF('PDF_MONTHLY')}>
                    <Download className="w-4 h-4 mr-2" />
                    月別PDF出力
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-3">※ 承認済み（APPROVED）の記録のみ出力されます。出力者・日時がPDFに記載されます。</p>
              </Card>

              <Card className="border-0 shadow">
                <div className="p-4 border-b font-bold">出力ログ（監査証跡）</div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>出力日時</TableHead>
                        <TableHead>出力者</TableHead>
                        <TableHead>種別</TableHead>
                        <TableHead>期間</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exportLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{log.createdAtUtcMs ? new Date(log.createdAtUtcMs + 9*3600000).toISOString().replace('T', ' ').substring(0, 16) : '-'}</TableCell>
                          <TableCell>{log.createdByName}</TableCell>
                          <TableCell><Badge className="bg-blue-100 text-blue-700 text-xs">{log.exportType}</Badge></TableCell>
                          <TableCell className="text-xs">{log.dateFrom} ～ {log.dateTo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 承認詳細ダイアログ */}
      <Dialog open={!!detailRide} onOpenChange={() => setDetailRide(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>運行記録の確認</DialogTitle>
          </DialogHeader>
          {detailRide && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3">
                <div><span className="text-slate-500">日付</span><p className="font-medium">{detailRide.date}</p></div>
                <div><span className="text-slate-500">便種別</span><p className="font-medium">{tripLabel(detailRide.tripType)}</p></div>
                <div><span className="text-slate-500">車両</span><p className="font-medium">{detailRide.vehicleName}</p></div>
                <div><span className="text-slate-500">ナンバー</span><p className="font-medium">{detailRide.vehiclePlate}</p></div>
                <div><span className="text-slate-500">運転者</span><p className="font-medium">{detailRide.driverName}</p></div>
                <div><span className="text-slate-500">同乗者</span><p className="font-medium">{detailRide.attendantName || 'なし'}</p></div>
                <div><span className="text-slate-500">出発</span><p className="font-medium">{detailRide.startTime}</p></div>
                <div><span className="text-slate-500">到着</span><p className="font-medium">{detailRide.endTime || '-'}</p></div>
                <div><span className="text-slate-500">開始メーター</span><p className="font-medium">{detailRide.startOdometerKm} km</p></div>
                <div><span className="text-slate-500">終了メーター</span><p className="font-medium">{detailRide.endOdometerKm || '-'} km</p></div>
                <div><span className="text-slate-500">走行距離</span><p className="font-bold text-blue-700">{(detailRide.distanceKm || 0).toFixed(1)} km</p></div>
                <div><span className="text-slate-500">異常</span><p className={`font-medium ${detailRide.abnormality !== 'NONE' ? 'text-red-600' : 'text-green-600'}`}>{detailRide.abnormality === 'NONE' ? 'なし' : detailRide.abnormality === 'MINOR' ? '軽微' : '事故'}</p></div>
              </div>
              {detailRide.abnormalityNote && <div className="bg-red-50 p-3 rounded-xl text-red-700 text-sm"><strong>異常内容:</strong> {detailRide.abnormalityNote}</div>}
              <div>
                <Label className="text-xs font-bold">管理者メモ（任意）</Label>
                <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="差し戻し理由など" className="mt-1 h-20" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="text-red-600 border-red-200" onClick={() => rejectMutation.mutate(detailRide)} disabled={rejectMutation.isPending}>
              <XCircle className="w-4 h-4 mr-1" />差し戻し
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate(detailRide)} disabled={approveMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-1" />承認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 車両ダイアログ */}
      <Dialog open={vehicleDialog} onOpenChange={setVehicleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingVehicle ? '車両編集' : '新規車両登録'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
          <div><Label>車両名 *</Label><Input value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} placeholder="ハイエース1号" /></div>
          <div><Label>ナンバー *</Label><Input value={vehicleForm.plateNumber} onChange={e => setVehicleForm(f => ({ ...f, plateNumber: e.target.value }))} placeholder="札幌 500 あ 1234" /></div>
          <div><Label>車種</Label><Input value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} placeholder="ハイエース" /></div>
          <div><Label>通常時定員</Label><Input type="number" min="1" value={vehicleForm.capacityRegular} onChange={e => setVehicleForm(f => ({ ...f, capacityRegular: e.target.value }))} placeholder="4" /></div>
           <div className="flex items-center gap-2"><Switch checked={vehicleForm.wheelchairAccessible} onCheckedChange={v => setVehicleForm(f => ({ ...f, wheelchairAccessible: v }))} /><Label>車椅子送迎可能</Label></div>
           {vehicleForm.wheelchairAccessible && (
             <div><Label>車椅子時定員</Label><Input type="number" min="1" value={vehicleForm.capacityWithWheelchair} onChange={e => setVehicleForm(f => ({ ...f, capacityWithWheelchair: e.target.value }))} placeholder="3" /></div>
           )}
          <div className="flex items-center gap-2"><Switch checked={vehicleForm.isActive} onCheckedChange={v => setVehicleForm(f => ({ ...f, isActive: v }))} /><Label>有効</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialog(false)}>キャンセル</Button>
            <Button className="bg-[#2D4A6F]" disabled={!vehicleForm.name || !vehicleForm.plateNumber} onClick={() => saveVehicleMutation.mutate({ ...vehicleForm, capacityRegular: vehicleForm.capacityRegular ? Number(vehicleForm.capacityRegular) : undefined, capacityWithWheelchair: vehicleForm.capacityWithWheelchair ? Number(vehicleForm.capacityWithWheelchair) : undefined })}>
              {editingVehicle ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* テンプレダイアログ */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTemplate ? 'テンプレ編集' : '新規テンプレ'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>テンプレ名 *</Label><Input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="花川北 朝ルート" /></div>
            <div>
              <Label>便種別 *</Label>
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
              <Label>デフォルト車両</Label>
              <Select value={templateForm.defaultVehicleId || 'none'} onValueChange={v => {
                const veh = vehicles.find(x => x.id === v);
                setTemplateForm(f => ({ ...f, defaultVehicleId: v === 'none' ? '' : v, defaultVehicleName: veh?.name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>デフォルト利用者（1行1名）</Label>
              <Textarea value={passengerInput} onChange={e => { setPassengerInput(e.target.value); setTemplateForm(f => ({ ...f, defaultPassengerNames: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })); }} className="h-28 font-mono text-sm" placeholder="山田 花子&#10;佐藤 一郎" />
            </div>
            <div className="flex items-center gap-2"><Switch checked={templateForm.isActive} onCheckedChange={v => setTemplateForm(f => ({ ...f, isActive: v }))} /><Label>有効</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>キャンセル</Button>
            <Button className="bg-[#2D4A6F]" disabled={!templateForm.name} onClick={() => saveTemplateMutation.mutate(templateForm)}>
              {editingTemplate ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}