import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle, XCircle, Car, Route, Edit, Trash2, Plus, Users, Shield,
  FileSearch, AlertTriangle, ChevronDown, ChevronUp, Printer, Clock, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const tripLabel = { PICKUP: '朝便（迎え）', DROPOFF: '帰便（送り）', OTHER: 'その他' };
const abnColor = { NONE: 'bg-emerald-100 text-emerald-700', MINOR: 'bg-amber-100 text-amber-700', ACCIDENT: 'bg-red-100 text-red-700' };
const abnLabel = { NONE: '異常なし', MINOR: '軽微', ACCIDENT: '事故' };
const fuelLabels = { FULL: 'FULL', '3_4': '3/4', HALF: '1/2', '1_4': '1/4', LOW: '要給油' };

export default function TransportAdmin() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  // 承認タブ
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [ridePassengers, setRidePassengers] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  // 車両管理
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ name: '', plateNumber: '', model: '', capacity: '', isActive: true });

  // テンプレ管理
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', defaultPassengerNames: [], isActive: true });

  // PDF出力
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [filterVehicleId, setFilterVehicleId] = useState('all');
  const [filterTripType, setFilterTripType] = useState('all');
  const [ridesData, setRidesData] = useState(null);
  const [passengersMap, setPassengersMap] = useState({});
  const [preChecksData, setPreChecksData] = useState([]);
  const [driverChecksData, setDriverChecksData] = useState([]);
  const [isExportLoading, setIsExportLoading] = useState(false);
  const printAreaRef = useRef(null);

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
    queryKey: ['ta-submitted'],
    queryFn: () => base44.entities.Ride.filter({ status: 'SUBMITTED' }, '-created_date'),
    refetchInterval: 15000,
  });

  const { data: approvedRides = [] } = useQuery({
    queryKey: ['ta-approved'],
    queryFn: () => base44.entities.Ride.filter({ status: 'APPROVED' }, '-approvedAtUtcMs', 30),
    enabled: historyOpen,
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['ta-vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
  });

  const { data: routeTemplates = [] } = useQuery({
    queryKey: ['ta-templates'],
    queryFn: () => base44.entities.RouteTemplate.list(),
  });

  const { data: recentDriverChecks = [] } = useQuery({
    queryKey: ['ta-driverchecks'],
    queryFn: () => base44.entities.DriverDailyCheck.list('-createdAtUtcMs', 10),
  });

  const { data: recentVehicleChecks = [] } = useQuery({
    queryKey: ['ta-vehiclechecks'],
    queryFn: () => base44.entities.VehiclePreCheck.list('-checkedAtUtcMs', 10),
  });

  const { data: exportLogs = [] } = useQuery({
    queryKey: ['ta-exportlogs'],
    queryFn: () => base44.entities.TransportExportLog.list('-createdAtUtcMs', 20),
  });

  // 承認
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
        title: '✅ 送迎記録が承認されました',
        content: `${ride.date} ${tripLabel[ride.tripType]} の送迎記録が承認されました`,
        priority: 'medium',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta-submitted'] });
      queryClient.invalidateQueries({ queryKey: ['ta-approved'] });
      setDetailOpen(false);
    },
  });

  // 差戻し
  const rejectMutation = useMutation({
    mutationFn: async (ride) => {
      await base44.entities.Ride.update(ride.id, { status: 'SUBMITTED' });
      await base44.entities.Notification.create({
        user_email: ride.createdByEmail,
        type: 'system',
        title: '⚠️ 送迎記録の確認依頼',
        content: `${ride.date} ${tripLabel[ride.tripType]} の送迎記録を管理者が確認中です`,
        priority: 'high',
        createdAtUtc: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta-submitted'] });
      setDetailOpen(false);
    },
  });

  // APPROVED記録の修正保存
  const editSaveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Ride.update(selectedRide.id, {
        vehicleName: editForm.vehicleName,
        vehiclePlate: editForm.vehiclePlate,
        driverName: editForm.driverName,
        attendantName: editForm.attendantName,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        startOdometerKm: parseFloat(editForm.startOdometerKm),
        endOdometerKm: editForm.endOdometerKm ? parseFloat(editForm.endOdometerKm) : undefined,
        distanceKm: editForm.endOdometerKm && editForm.startOdometerKm
          ? Math.max(0, parseFloat(editForm.endOdometerKm) - parseFloat(editForm.startOdometerKm))
          : undefined,
        abnormality: editForm.abnormality,
        abnormalityNote: editForm.abnormalityNote,
        adminNote: editForm.adminNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta-approved'] });
      queryClient.invalidateQueries({ queryKey: ['ta-submitted'] });
      setEditMode(false);
      setDetailOpen(false);
    },
  });

  // 削除
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ride.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta-submitted'] });
      queryClient.invalidateQueries({ queryKey: ['ta-approved'] });
      setDetailOpen(false);
    },
  });

  const openDetail = async (ride) => {
    setSelectedRide(ride);
    setEditForm({
      vehicleName: ride.vehicleName,
      vehiclePlate: ride.vehiclePlate,
      driverName: ride.driverName,
      attendantName: ride.attendantName || '',
      startTime: ride.startTime,
      endTime: ride.endTime || '',
      startOdometerKm: ride.startOdometerKm,
      endOdometerKm: ride.endOdometerKm || '',
      abnormality: ride.abnormality || 'NONE',
      abnormalityNote: ride.abnormalityNote || '',
      adminNote: ride.adminNote || '',
    });
    setEditMode(false);
    const passengers = await base44.entities.RidePassenger.filter({ rideId: ride.id }, 'order');
    setRidePassengers(passengers);
    setDetailOpen(true);
  };

  // 車両CRUD
  const saveVehicleMutation = useMutation({
    mutationFn: () => {
      const data = { ...vehicleForm, capacity: vehicleForm.capacity ? parseInt(vehicleForm.capacity) : undefined };
      if (editingVehicle) return base44.entities.Vehicle.update(editingVehicle.id, data);
      return base44.entities.Vehicle.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta-vehicles'] });
      setVehicleDialogOpen(false);
      setEditingVehicle(null);
      setVehicleForm({ name: '', plateNumber: '', model: '', capacity: '', isActive: true });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ta-vehicles'] }),
  });

  // テンプレCRUD
  const saveTemplateMutation = useMutation({
    mutationFn: () => {
      if (editingTemplate) return base44.entities.RouteTemplate.update(editingTemplate.id, templateForm);
      return base44.entities.RouteTemplate.create(templateForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ta-templates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', defaultPassengerNames: [], isActive: true });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.RouteTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ta-templates'] }),
  });

  // PDF出力
  const loadAndPrint = async () => {
    setIsExportLoading(true);
    try {
      const rides = await base44.entities.Ride.filter({ status: 'APPROVED' }, 'date');
      const filtered = rides.filter(r => {
        if (r.date < dateFrom || r.date > dateTo) return false;
        if (filterVehicleId !== 'all' && r.vehicleId !== filterVehicleId) return false;
        if (filterTripType !== 'all' && r.tripType !== filterTripType) return false;
        return true;
      });
      const pMap = {};
      await Promise.all(filtered.map(async (ride) => {
        pMap[ride.id] = await base44.entities.RidePassenger.filter({ rideId: ride.id }, 'order');
      }));
      const preChecks = (await base44.entities.VehiclePreCheck.filter({})).filter(c => c.date >= dateFrom && c.date <= dateTo);
      const driverChecks = (await base44.entities.DriverDailyCheck.filter({})).filter(c => c.date >= dateFrom && c.date <= dateTo);
      setRidesData(filtered);
      setPassengersMap(pMap);
      setPreChecksData(preChecks);
      setDriverChecksData(driverChecks);
      await base44.entities.TransportExportLog.create({
        exportType: 'PDF_DAILY',
        dateFrom, dateTo,
        createdByEmail: user?.email || '',
        createdByName: user?.full_name || user?.email || '',
        createdAtUtcMs: Date.now(),
      });
      queryClient.invalidateQueries({ queryKey: ['ta-exportlogs'] });
      setTimeout(() => window.print(), 600);
    } finally {
      setIsExportLoading(false);
    }
  };

  const groupedByDate = ridesData ? ridesData.reduce((acc, r) => { if (!acc[r.date]) acc[r.date] = []; acc[r.date].push(r); return acc; }, {}) : {};
  const totalDist = ridesData ? ridesData.reduce((s, r) => s + (r.distanceKm || 0), 0) : 0;

  if (!isAdmin && user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg font-medium">管理者のみアクセスできます</p>
        <Link to={createPageUrl('Transport')}><Button className="mt-4">送迎画面へ戻る</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: #fff; }
          @page { margin: 15mm; size: A4; }
        }
        .print-area { display: none; }
      `}</style>

      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 px-4 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 rounded-xl p-2"><Shield className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-white font-bold text-lg">送迎管理センター</h1>
              <p className="text-slate-400 text-xs">管理者専用ダッシュボード</p>
            </div>
          </div>
          <Link to={createPageUrl('Transport')}>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">← スタッフ画面</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        <Tabs defaultValue="approval">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700 mb-5">
            {[
              { value: 'approval', label: '承認待ち', badge: submittedRides.length },
              { value: 'checks', label: '点検記録', badge: 0 },
              { value: 'vehicles', label: '車両管理', badge: 0 },
              { value: 'templates', label: 'ルート', badge: 0 },
              { value: 'export', label: 'PDF出力', badge: 0 },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400 text-xs">
                {t.label}
                {t.badge > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{t.badge}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ===== 承認待ち ===== */}
          <TabsContent value="approval" className="space-y-3">
            {submittedRides.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl py-14 text-center border border-slate-700">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">承認待ちの送迎はありません</p>
              </div>
            ) : submittedRides.map(ride => (
              <div key={ride.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 hover:border-amber-500/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">提出済</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${abnColor[ride.abnormality || 'NONE']}`}>{abnLabel[ride.abnormality || 'NONE']}</span>
                      {ride.abnormality === 'ACCIDENT' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <p className="text-white font-bold">{ride.date}（{tripLabel[ride.tripType]}）</p>
                    <p className="text-slate-400 text-xs mt-0.5">🚌 {ride.vehicleName}（{ride.vehiclePlate}）｜👤 {ride.driverName}｜🕐 {ride.startTime}〜{ride.endTime || '?'}｜📍 {ride.distanceKm || '?'}km</p>
                    <p className="text-slate-500 text-xs">提出者：{ride.createdByName}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => openDetail(ride)}>
                      <FileSearch className="w-3 h-3 mr-1" />詳細
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => approveMutation.mutate(ride)} disabled={approveMutation.isPending}>
                      <CheckCircle className="w-3 h-3 mr-1" />承認
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* 承認済み履歴 */}
            <div className="mt-4">
              <button onClick={() => setHistoryOpen(!historyOpen)}
                className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 hover:text-slate-300 transition-colors">
                <span className="text-sm font-medium">承認済み履歴（直近30件）</span>
                {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {historyOpen && (
                <div className="mt-2 space-y-2">
                  {approvedRides.map(ride => (
                    <div key={ride.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-amber-500/30" onClick={() => openDetail(ride)}>
                      <div>
                        <p className="text-slate-300 text-sm font-medium">{ride.date}（{tripLabel[ride.tripType]}）</p>
                        <p className="text-slate-500 text-xs">{ride.vehicleName}｜{ride.driverName}｜{ride.distanceKm}km</p>
                      </div>
                      <div className="text-right">
                        <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded-full">✓ 承認済</span>
                        <p className="text-slate-500 text-xs mt-1">{ride.approvedByName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== 点検記録 ===== */}
          <TabsContent value="checks" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="bg-blue-900/50 border-b border-slate-700 px-4 py-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-bold text-sm">運転者健康確認（直近10件）</span>
                </div>
                <div className="divide-y divide-slate-700">
                  {recentDriverChecks.length === 0
                    ? <p className="text-slate-500 text-xs text-center py-6">記録なし</p>
                    : recentDriverChecks.map(c => (
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
                            <p className="text-slate-500 text-xs mt-1">アルコール：{c.alcoholCheck ? '✓ 実施' : '未記録'}</p>
                          </div>
                        </div>
                        {c.notes && <p className="text-slate-400 text-xs mt-1 bg-slate-700/50 rounded px-2 py-1">{c.notes}</p>}
                      </div>
                    ))}
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="bg-purple-900/50 border-b border-slate-700 px-4 py-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-300 font-bold text-sm">車両点検記録（直近10件）</span>
                </div>
                <div className="divide-y divide-slate-700">
                  {recentVehicleChecks.length === 0
                    ? <p className="text-slate-500 text-xs text-center py-6">記録なし</p>
                    : recentVehicleChecks.map(c => (
                      <div key={c.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{c.vehicleName}</p>
                            <p className="text-slate-500 text-xs">{c.date}｜点検者：{c.checkerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-300 text-xs">燃料：{fuelLabels[c.fuelLevel] || c.fuelLevel}</p>
                            {c.otherIssue && <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">⚠ 異常あり</span>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {[['tireOK','タイヤ'],['lightsOK','ライト'],['brakeOK','ブレーキ'],['exteriorDamageNone','外装'],['interiorOK','車内']].map(([key, label]) => (
                            <span key={key} className={`text-xs px-1.5 py-0.5 rounded ${c[key] ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                              {c[key] ? '✓' : '✗'}{label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== 車両管理 ===== */}
          <TabsContent value="vehicles" className="mt-0">
            <div className="flex justify-between items-center mb-3">
              <p className="text-slate-400 text-sm">登録車両一覧</p>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => { setEditingVehicle(null); setVehicleForm({ name: '', plateNumber: '', model: '', capacity: '', isActive: true }); setVehicleDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />車両追加
              </Button>
            </div>
            <div className="space-y-2">
              {allVehicles.map(v => (
                <div key={v.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 rounded-xl p-2.5"><Car className="w-5 h-5 text-amber-400" /></div>
                    <div>
                      <p className="text-white font-bold">{v.name}</p>
                      <p className="text-slate-400 text-xs">ナンバー：{v.plateNumber}{v.model && ` ｜ ${v.model}`}{v.capacity && ` ｜ 定員${v.capacity}名`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.isActive !== false ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{v.isActive !== false ? '有効' : '無効'}</span>
                    <button className="text-slate-400 hover:text-amber-400 p-1" onClick={() => { setEditingVehicle(v); setVehicleForm({ name: v.name, plateNumber: v.plateNumber, model: v.model || '', capacity: v.capacity || '', isActive: v.isActive !== false }); setVehicleDialogOpen(true); }}><Edit className="w-4 h-4" /></button>
                    <button className="text-slate-400 hover:text-red-400 p-1" onClick={() => window.confirm('削除しますか？') && deleteVehicleMutation.mutate(v.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ===== ルートテンプレ ===== */}
          <TabsContent value="templates" className="mt-0">
            <div className="flex justify-between items-center mb-3">
              <p className="text-slate-400 text-sm">ルートテンプレ一覧</p>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', tripType: 'PICKUP', defaultVehicleId: '', defaultVehicleName: '', defaultPassengerNames: [], isActive: true }); setTemplateDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />テンプレ追加
              </Button>
            </div>
            <div className="space-y-2">
              {routeTemplates.map(t => (
                <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 rounded-xl p-2.5"><Route className="w-5 h-5 text-blue-400" /></div>
                    <div>
                      <p className="text-white font-bold">{t.name}</p>
                      <p className="text-slate-400 text-xs">{tripLabel[t.tripType]} ｜ 利用者 {(t.defaultPassengerNames || []).length}名{t.defaultVehicleName && ` ｜ ${t.defaultVehicleName}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive !== false ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>{t.isActive !== false ? '有効' : '無効'}</span>
                    <button className="text-slate-400 hover:text-amber-400 p-1" onClick={() => { setEditingTemplate(t); setTemplateForm({ name: t.name, tripType: t.tripType, defaultVehicleId: t.defaultVehicleId || '', defaultVehicleName: t.defaultVehicleName || '', defaultPassengerNames: t.defaultPassengerNames || [], isActive: t.isActive !== false }); setTemplateDialogOpen(true); }}><Edit className="w-4 h-4" /></button>
                    <button className="text-slate-400 hover:text-red-400 p-1" onClick={() => window.confirm('削除しますか？') && deleteTemplateMutation.mutate(t.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ===== PDF出力 ===== */}
          <TabsContent value="export" className="mt-0 space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-4 no-print">
              <p className="text-slate-300 font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400" /> 出力設定</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">開始日</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">終了日</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">車両</label>
                  <Select value={filterVehicleId} onValueChange={setFilterVehicleId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全車両</SelectItem>
                      {allVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">便種別</label>
                  <Select value={filterTripType} onValueChange={setFilterTripType}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全便</SelectItem>
                      <SelectItem value="PICKUP">朝便（迎え）</SelectItem>
                      <SelectItem value="DROPOFF">帰便（送り）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold" disabled={isExportLoading} onClick={loadAndPrint}>
                <Printer className="w-4 h-4 mr-2" />{isExportLoading ? 'データ読込中...' : 'PDF出力（印刷）'}
              </Button>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden no-print">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 font-bold text-sm">出力ログ（直近20件）</span>
              </div>
              <div className="divide-y divide-slate-700">
                {exportLogs.length === 0
                  ? <p className="text-slate-500 text-xs text-center py-6">出力履歴はありません</p>
                  : exportLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className="text-slate-400">{log.dateFrom}〜{log.dateTo}</span>
                      <span className="text-slate-500">{log.createdByName} / {log.createdAtUtcMs ? format(new Date(log.createdAtUtcMs), 'MM/dd HH:mm') : '-'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 印刷エリア */}
      {ridesData !== null && (
        <div className="print-area" ref={printAreaRef}>
          <div style={{ fontFamily: 'serif', fontSize: '10pt', color: '#000', padding: '0' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
              <h1 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 4px 0' }}>送迎運行管理記録</h1>
              <p style={{ margin: '2px 0', fontSize: '9pt' }}>事業所：おんくりの輪</p>
              <p style={{ margin: '2px 0', fontSize: '9pt' }}>対象期間：{dateFrom}〜{dateTo}</p>
              <p style={{ margin: '2px 0', fontSize: '8pt', color: '#555' }}>出力日時：{format(new Date(), 'yyyy/MM/dd HH:mm')} / 出力者：{user?.full_name || user?.email}</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '9pt' }}>
              <thead><tr style={{ background: '#eee' }}>{['総運行件数', '総走行距離', '異常件数'].map(h => <th key={h} style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left' }}>{h}</th>)}</tr></thead>
              <tbody><tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ridesData.length}件</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{totalDist.toFixed(1)}km</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ridesData.filter(r => r.abnormality !== 'NONE').length}件</td>
              </tr></tbody>
            </table>
            {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, rides]) => {
              const dayPreChecks = preChecksData.filter(c => c.date === date);
              const dayDriverChecks = driverChecksData.filter(c => c.date === date);
              return (
                <div key={date} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
                  <h2 style={{ fontSize: '12pt', fontWeight: 'bold', background: '#ddd', padding: '4px 8px', margin: '0 0 8px 0', border: '1px solid #aaa' }}>{date}（{rides.length}便）</h2>
                  {dayDriverChecks.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '4px' }}>【運転者健康確認】</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                        <thead><tr style={{ background: '#f5f5f5' }}>{['氏名', '健康状態', 'アルコール', '備考'].map(h => <th key={h} style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{h}</th>)}</tr></thead>
                        <tbody>{dayDriverChecks.map((c, i) => (
                          <tr key={i}>
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.driverName}</td>
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.fitForDuty === 'OK' ? '問題なし' : '要配慮'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c.alcoholCheck ? '実施' : '未記録'}</td>
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.notes || ''}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  {dayPreChecks.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '9pt', fontWeight: 'bold', marginBottom: '4px' }}>【車両使用前点検】</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                        <thead><tr style={{ background: '#f5f5f5' }}>{['車両', '燃料', 'タイヤ', 'ライト', 'ブレーキ', '外装', '車内', '点検者'].map(h => <th key={h} style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{h}</th>)}</tr></thead>
                        <tbody>{dayPreChecks.map((c, i) => (
                          <tr key={i}>
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.vehicleName}</td>
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{fuelLabels[c.fuelLevel] || c.fuelLevel}</td>
                            {['tireOK','lightsOK','brakeOK','exteriorDamageNone','interiorOK'].map(k => <td key={k} style={{ border: '1px solid #ccc', padding: '3px 5px', textAlign: 'center' }}>{c[k] ? '✓' : '✗'}</td>)}
                            <td style={{ border: '1px solid #ccc', padding: '3px 5px' }}>{c.checkerName}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  {rides.map(ride => (
                    <div key={ride.id} style={{ marginBottom: '12px', border: '1px solid #aaa', padding: '8px' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                        {tripLabel[ride.tripType]} / {ride.vehicleName}（{ride.vehiclePlate}）
                      </p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '6px' }}>
                        <tbody>
                          <tr>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9',width:'20%' }}>運転者</td><td style={{ border:'1px solid #ddd',padding:'3px 6px',width:'30%' }}>{ride.driverName}</td>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9',width:'20%' }}>同乗者</td><td style={{ border:'1px solid #ddd',padding:'3px 6px',width:'30%' }}>{ride.attendantName||'なし'}</td>
                          </tr>
                          <tr>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>出発</td><td style={{ border:'1px solid #ddd',padding:'3px 6px' }}>{ride.startTime}</td>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>到着</td><td style={{ border:'1px solid #ddd',padding:'3px 6px' }}>{ride.endTime||'-'}</td>
                          </tr>
                          <tr>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>開始メーター</td><td style={{ border:'1px solid #ddd',padding:'3px 6px' }}>{ride.startOdometerKm}km</td>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>終了メーター</td><td style={{ border:'1px solid #ddd',padding:'3px 6px' }}>{ride.endOdometerKm||'-'}km</td>
                          </tr>
                          <tr>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>走行距離</td><td style={{ border:'1px solid #ddd',padding:'3px 6px' }}>{ride.distanceKm||'-'}km</td>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>異常</td><td style={{ border:'1px solid #ddd',padding:'3px 6px' }}>{abnLabel[ride.abnormality||'NONE']}{ride.abnormalityNote&&`：${ride.abnormalityNote}`}</td>
                          </tr>
                          <tr>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px',background:'#f9f9f9' }}>承認者</td>
                            <td style={{ border:'1px solid #ddd',padding:'3px 6px' }} colSpan={3}>{ride.approvedByName||'-'} / {ride.approvedAtUtcMs?format(new Date(ride.approvedAtUtcMs),'yyyy/MM/dd HH:mm'):''}</td>
                          </tr>
                        </tbody>
                      </table>
                      {passengersMap[ride.id]?.length > 0 && (
                        <>
                          <p style={{ fontSize:'8pt',fontWeight:'bold',marginBottom:'4px' }}>乗車利用者</p>
                          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'8pt' }}>
                            <thead><tr style={{ background:'#f5f5f5' }}>{['利用者名','乗車','降車','SB'].map(h=><th key={h} style={{ border:'1px solid #ccc',padding:'2px 5px' }}>{h}</th>)}</tr></thead>
                            <tbody>{passengersMap[ride.id].map((p,i)=>(
                              <tr key={i}>
                                <td style={{ border:'1px solid #ccc',padding:'2px 5px' }}>{p.clientName}</td>
                                <td style={{ border:'1px solid #ccc',padding:'2px 5px',textAlign:'center' }}>{p.boardTime||'-'}</td>
                                <td style={{ border:'1px solid #ccc',padding:'2px 5px',textAlign:'center' }}>{p.alightTime||'-'}</td>
                                <td style={{ border:'1px solid #ccc',padding:'2px 5px',textAlign:'center' }}>{p.seatBeltChecked?'✓':'✗'}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            {ridesData.length === 0 && <div style={{ textAlign:'center',padding:'30px',color:'#888' }}>指定期間・条件で承認済みの記録がありません</div>}
            <div style={{ textAlign:'center',fontSize:'8pt',color:'#888',marginTop:'16px',borderTop:'1px solid #ccc',paddingTop:'8px' }}>
              おんくりの輪 送迎管理システムより出力 / {format(new Date(),'yyyy/MM/dd HH:mm')}
            </div>
          </div>
        </div>
      )}

      {/* 運行詳細ダイアログ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-blue-500" />
              {selectedRide?.status === 'APPROVED' ? '承認済み運行詳細' : '運行詳細確認'}
            </DialogTitle>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-4 py-2">
              {selectedRide.status === 'APPROVED' && !editMode && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <span className="text-sm text-emerald-700 font-medium">✓ 承認済み — {selectedRide.approvedByName}</span>
                  <Button size="sm" variant="outline" className="text-amber-600 border-amber-300" onClick={() => setEditMode(true)}>修正モード</Button>
                </div>
              )}

              {editMode ? (
                <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠ 修正モード（履歴として保存されます）</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs font-bold text-slate-600 mb-1 block">出発時刻</label><Input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} /></div>
                    <div><label className="text-xs font-bold text-slate-600 mb-1 block">到着時刻</label><Input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} /></div>
                    <div><label className="text-xs font-bold text-slate-600 mb-1 block">開始メーター</label><Input type="number" value={editForm.startOdometerKm} onChange={e => setEditForm(f => ({ ...f, startOdometerKm: e.target.value }))} /></div>
                    <div><label className="text-xs font-bold text-slate-600 mb-1 block">終了メーター</label><Input type="number" value={editForm.endOdometerKm} onChange={e => setEditForm(f => ({ ...f, endOdometerKm: e.target.value }))} /></div>
                    <div><label className="text-xs font-bold text-slate-600 mb-1 block">運転者名</label><Input value={editForm.driverName} onChange={e => setEditForm(f => ({ ...f, driverName: e.target.value }))} /></div>
                    <div><label className="text-xs font-bold text-slate-600 mb-1 block">同乗者名</label><Input value={editForm.attendantName} onChange={e => setEditForm(f => ({ ...f, attendantName: e.target.value }))} /></div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">異常</label>
                    <Select value={editForm.abnormality} onValueChange={v => setEditForm(f => ({ ...f, abnormality: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">異常なし</SelectItem>
                        <SelectItem value="MINOR">軽微な異常</SelectItem>
                        <SelectItem value="ACCIDENT">事故</SelectItem>
                      </SelectContent>
                    </Select>
                    {editForm.abnormality !== 'NONE' && <Input className="mt-1" value={editForm.abnormalityNote} onChange={e => setEditForm(f => ({ ...f, abnormalityNote: e.target.value }))} placeholder="異常内容" />}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1 block">管理者メモ</label>
                    <Textarea value={editForm.adminNote} onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))} placeholder="管理者用メモ（任意）" className="h-16" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500 text-xs">日付</span><p className="font-bold">{selectedRide.date}</p></div>
                    <div><span className="text-slate-500 text-xs">便種別</span><p className="font-bold">{tripLabel[selectedRide.tripType]}</p></div>
                    <div><span className="text-slate-500 text-xs">車両</span><p className="font-bold">{selectedRide.vehicleName}（{selectedRide.vehiclePlate}）</p></div>
                    <div><span className="text-slate-500 text-xs">運転者</span><p className="font-bold">{selectedRide.driverName}</p></div>
                    {selectedRide.attendantName && <div><span className="text-slate-500 text-xs">同乗</span><p className="font-bold">{selectedRide.attendantName}</p></div>}
                    <div><span className="text-slate-500 text-xs">出発</span><p className="font-bold">{selectedRide.startTime}</p></div>
                    <div><span className="text-slate-500 text-xs">到着</span><p className="font-bold">{selectedRide.endTime || '-'}</p></div>
                    <div><span className="text-slate-500 text-xs">開始メーター</span><p className="font-bold">{selectedRide.startOdometerKm}km</p></div>
                    <div><span className="text-slate-500 text-xs">終了メーター</span><p className="font-bold">{selectedRide.endOdometerKm ? `${selectedRide.endOdometerKm}km` : '-'}</p></div>
                    <div><span className="text-slate-500 text-xs">走行距離</span><p className="font-bold text-blue-700 text-lg">{selectedRide.distanceKm || '-'}km</p></div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">異常報告</p>
                    <span className={`text-sm px-3 py-1 rounded-full font-bold ${abnColor[selectedRide.abnormality || 'NONE']}`}>{abnLabel[selectedRide.abnormality || 'NONE']}</span>
                    {selectedRide.abnormalityNote && <p className="text-sm text-slate-700 mt-2 bg-amber-50 rounded p-2">{selectedRide.abnormalityNote}</p>}
                  </div>
                  {ridePassengers.length > 0 && (
                    <div className="rounded-xl border p-3">
                      <p className="text-xs font-bold text-slate-600 mb-2">乗車利用者（{ridePassengers.length}名）</p>
                      {ridePassengers.map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-sm py-2 border-b last:border-0">
                          <span className="flex-1 font-medium">{p.clientName}</span>
                          <span className="text-xs text-slate-400">{p.boardTime && `乗:${p.boardTime}`} {p.alightTime && `降:${p.alightTime}`}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.seatBeltChecked ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>SB{p.seatBeltChecked ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                    <p>提出者：{selectedRide.createdByName}</p>
                    {selectedRide.adminNote && <p className="mt-1 font-bold">管理者メモ：{selectedRide.adminNote}</p>}
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>キャンセル</Button>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => editSaveMutation.mutate()} disabled={editSaveMutation.isPending}>
                  {editSaveMutation.isPending ? '保存中...' : '修正を保存'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>閉じる</Button>
                {selectedRide?.status === 'SUBMITTED' && (
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => rejectMutation.mutate(selectedRide)} disabled={rejectMutation.isPending}>
                    <XCircle className="w-4 h-4 mr-1" />差戻し
                  </Button>
                )}
                {selectedRide?.status === 'APPROVED' && (
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => window.confirm('この記録を削除しますか？') && deleteMutation.mutate(selectedRide.id)}>
                    <Trash2 className="w-4 h-4 mr-1" />削除
                  </Button>
                )}
                {selectedRide?.status === 'SUBMITTED' && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => approveMutation.mutate(selectedRide)} disabled={approveMutation.isPending}>
                    <CheckCircle className="w-4 h-4 mr-1" />承認する
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 車両ダイアログ */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingVehicle ? '車両を編集' : '車両を追加'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block">車両名 *</label><Input placeholder="例：ハイエース1号" value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-xs font-bold text-slate-600 mb-1 block">ナンバー *</label><Input placeholder="例：札幌300あ1234" value={vehicleForm.plateNumber} onChange={e => setVehicleForm(f => ({ ...f, plateNumber: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-bold text-slate-600 mb-1 block">車種</label><Input placeholder="ハイエース" value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} /></div>
              <div><label className="text-xs font-bold text-slate-600 mb-1 block">定員</label><Input type="number" placeholder="8" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Switch checked={vehicleForm.isActive} onCheckedChange={v => setVehicleForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm text-slate-700 font-medium">有効（スタッフが選択可能）</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleDialogOpen(false)}>キャンセル</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" disabled={!vehicleForm.name || !vehicleForm.plateNumber || saveVehicleMutation.isPending} onClick={() => saveVehicleMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* テンプレダイアログ */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTemplate ? 'テンプレを編集' : 'テンプレを追加'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-bold text-slate-600 mb-1 block">テンプレ名 *</label><Input placeholder="例：花川北 朝ルート" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">便種別</label>
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
              <label className="text-xs font-bold text-slate-600 mb-1 block">デフォルト車両（任意）</label>
              <Select value={templateForm.defaultVehicleId || 'none'} onValueChange={v => {
                const vehicle = allVehicles.find(x => x.id === v);
                setTemplateForm(f => ({ ...f, defaultVehicleId: v === 'none' ? '' : v, defaultVehicleName: vehicle?.name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {allVehicles.filter(v => v.isActive !== false).map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">デフォルト利用者名</label>
                <button className="text-xs text-blue-600 font-bold" onClick={() => setTemplateForm(f => ({ ...f, defaultPassengerNames: [...f.defaultPassengerNames, ''] }))}>＋ 追加</button>
              </div>
              <div className="space-y-1">
                {(templateForm.defaultPassengerNames || []).map((name, i) => (
                  <div key={i} className="flex gap-1">
                    <Input placeholder="利用者名" value={name} onChange={e => setTemplateForm(f => ({ ...f, defaultPassengerNames: f.defaultPassengerNames.map((n, idx) => idx === i ? e.target.value : n) }))} />
                    <button className="text-red-400 hover:text-red-600 px-2" onClick={() => setTemplateForm(f => ({ ...f, defaultPassengerNames: f.defaultPassengerNames.filter((_, idx) => idx !== i) }))}>✗</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <Switch checked={templateForm.isActive} onCheckedChange={v => setTemplateForm(f => ({ ...f, isActive: v }))} />
              <span className="text-sm text-slate-700 font-medium">有効（スタッフの選択肢に表示）</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>キャンセル</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" disabled={!templateForm.name || saveTemplateMutation.isPending} onClick={() => saveTemplateMutation.mutate()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}