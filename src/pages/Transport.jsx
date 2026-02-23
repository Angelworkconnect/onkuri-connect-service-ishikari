import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Car, Plus, Clock, CheckCircle, AlertCircle, Users, ChevronRight, Zap, User } from 'lucide-react';

const today = format(new Date(), 'yyyy-MM-dd');
const tripTypeLabel = { PICKUP: '🌅 朝便（迎え）', DROPOFF: '🌇 帰便（送り）', OTHER: '🚐 その他' };
const statusColor = { SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200', APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
const statusLabel = { SUBMITTED: '承認待ち', APPROVED: '✓ 承認済' };

export default function Transport() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    date: today,
    tripType: 'PICKUP',
    vehicleId: '',
    vehicleName: '',
    vehiclePlate: '',
    driverEmail: '',
    driverName: '',
    attendantEmail: '',
    attendantName: '',
    startTime: format(new Date(), 'HH:mm'),
    startOdometerKm: '',
    endTime: '',
    endOdometerKm: '',
    abnormality: 'NONE',
    abnormalityNote: '',
    passengers: [],
  });

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
      setForm(f => ({ ...f, driverEmail: u.email, driverName: u.full_name || u.email }));
    }).catch(() => {});
  }, []);

  const { data: todayRides = [] } = useQuery({
    queryKey: ['transport-today', today],
    queryFn: () => base44.entities.Ride.filter({ date: today }, '-created_date'),
    refetchInterval: 30000,
  });

  const { data: myRides = [] } = useQuery({
    queryKey: ['transport-my', user?.email],
    queryFn: () => base44.entities.Ride.filter({ createdByEmail: user.email }, '-created_date', 30),
    enabled: !!user,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['transport-vehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ isActive: true }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['transport-staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['transport-templates'],
    queryFn: () => base44.entities.RouteTemplate.filter({ isActive: true }),
  });

  const { data: todayDriverCheck = [] } = useQuery({
    queryKey: ['transport-drivercheck', today, user?.email],
    queryFn: () => base44.entities.DriverDailyCheck.filter({ date: today, driverEmail: user.email }),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const dist = form.endOdometerKm && form.startOdometerKm
        ? Math.max(0, parseFloat(form.endOdometerKm) - parseFloat(form.startOdometerKm))
        : undefined;
      const ride = await base44.entities.Ride.create({
        date: form.date,
        tripType: form.tripType,
        vehicleId: form.vehicleId,
        vehicleName: form.vehicleName,
        vehiclePlate: form.vehiclePlate,
        driverEmail: form.driverEmail,
        driverName: form.driverName,
        attendantEmail: form.attendantEmail || undefined,
        attendantName: form.attendantName || undefined,
        startTime: form.startTime,
        endTime: form.endTime || undefined,
        startOdometerKm: parseFloat(form.startOdometerKm),
        endOdometerKm: form.endOdometerKm ? parseFloat(form.endOdometerKm) : undefined,
        distanceKm: dist,
        abnormality: form.abnormality,
        abnormalityNote: form.abnormalityNote || undefined,
        status: 'SUBMITTED',
        createdByEmail: user.email,
        createdByName: user.full_name || user.email,
      });
      // 利用者登録
      if (form.passengers.length > 0) {
        await base44.entities.RidePassenger.bulkCreate(
          form.passengers.filter(p => p.clientName.trim()).map((p, i) => ({
            rideId: ride.id,
            clientName: p.clientName,
            boardTime: p.boardTime || undefined,
            alightTime: p.alightTime || undefined,
            seatBeltChecked: p.seatBeltChecked !== false,
            note: p.note || undefined,
            order: i,
          }))
        );
      }
      // 管理者通知
      const admins = await base44.entities.Staff.filter({ role: 'admin' });
      if (admins.length > 0) {
        await base44.entities.Notification.bulkCreate(admins.map(a => ({
          user_email: a.email,
          type: 'system',
          title: '🚌 送迎記録が提出されました',
          content: `${user.full_name || user.email} さんが ${form.date} ${tripTypeLabel[form.tripType]} の送迎記録を提出しました`,
          priority: 'medium',
          createdAtUtc: Date.now(),
        })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-today'] });
      queryClient.invalidateQueries({ queryKey: ['transport-my'] });
      setFormOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setForm({
      date: today,
      tripType: 'PICKUP',
      vehicleId: '',
      vehicleName: '',
      vehiclePlate: '',
      driverEmail: user?.email || '',
      driverName: user?.full_name || user?.email || '',
      attendantEmail: '',
      attendantName: '',
      startTime: format(new Date(), 'HH:mm'),
      startOdometerKm: '',
      endTime: '',
      endOdometerKm: '',
      abnormality: 'NONE',
      abnormalityNote: '',
      passengers: [],
    });
  };

  const applyTemplate = (tmpl) => {
    const vehicle = vehicles.find(v => v.id === tmpl.defaultVehicleId);
    setForm(f => ({
      ...f,
      tripType: tmpl.tripType,
      routeTemplateId: tmpl.id,
      routeTemplateName: tmpl.name,
      vehicleId: tmpl.defaultVehicleId || f.vehicleId,
      vehicleName: vehicle?.name || f.vehicleName,
      vehiclePlate: vehicle?.plateNumber || f.vehiclePlate,
      passengers: (tmpl.defaultPassengerNames || []).map((name, i) => ({
        clientName: name, boardTime: '', alightTime: '', seatBeltChecked: true, note: '', order: i,
      })),
    }));
  };

  const addPassenger = () => setForm(f => ({ ...f, passengers: [...f.passengers, { clientName: '', boardTime: '', alightTime: '', seatBeltChecked: true, note: '' }] }));
  const removePassenger = (i) => setForm(f => ({ ...f, passengers: f.passengers.filter((_, idx) => idx !== i) }));
  const updatePassenger = (i, key, val) => setForm(f => ({ ...f, passengers: f.passengers.map((p, idx) => idx === i ? { ...p, [key]: val } : p) }));

  const driverChecked = todayDriverCheck.length > 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '😊 おはようございます' : hour < 17 ? '☀️ こんにちは' : '🌙 おつかれさまです';

  const canSubmit = form.vehicleId && form.driverEmail && form.startTime && form.startOdometerKm &&
    (form.abnormality === 'NONE' || form.abnormalityNote.trim());

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-500 text-white px-4 pt-8 pb-24 relative overflow-hidden">
        {/* 装飾 */}
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute top-4 right-16 w-24 h-24 bg-yellow-400/20 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-36 h-36 bg-pink-400/20 rounded-full" />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-violet-200 text-sm font-medium">{greeting}</p>
          <h1 className="text-3xl font-black tracking-tight mt-1">{user?.full_name || 'スタッフ'} <span className="text-yellow-300">さん</span></h1>
          <p className="text-blue-200 text-sm mt-1">{format(new Date(), 'yyyy年M月d日（eee）', { locale: ja })}</p>
        </div>
      </div>

      {/* 統計カード（ヘッダーの外に出す） */}
      <div className="max-w-2xl mx-auto px-4 -mt-14">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '今日の送迎', value: todayRides.length, color: 'from-blue-500 to-blue-600', icon: '🚌' },
            { label: '承認待ち', value: todayRides.filter(r => r.status === 'SUBMITTED').length, color: 'from-amber-400 to-orange-500', icon: '⏳' },
            { label: '承認済み', value: todayRides.filter(r => r.status === 'APPROVED').length, color: 'from-emerald-400 to-green-600', icon: '✅' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-3 text-center shadow-lg`}>
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-white/80 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 space-y-4 pb-10">
        {/* 健康確認警告 */}
        {!driverChecked && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-amber-200/60">
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
            <div className="flex-1 text-white">
              <p className="font-bold text-sm">本日の運転者健康確認が未実施です</p>
              <p className="text-xs text-amber-100">管理センターで記録してください</p>
            </div>
          </div>
        )}

        {/* 入力ボタン（スタッフのみ） */}
        {!isAdmin && (
          <button
            className="w-full bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 text-white rounded-3xl p-5 flex items-center gap-4 shadow-xl shadow-blue-500/30 hover:scale-[1.02] transition-transform active:scale-100"
            onClick={() => setFormOpen(true)}
          >
            <div className="bg-white/20 rounded-2xl p-3 shrink-0">
              <Plus className="w-8 h-8" />
            </div>
            <div className="text-left flex-1">
              <p className="text-xl font-black tracking-tight">送迎記録を入力</p>
              <p className="text-blue-100 text-sm font-medium">入力後すぐに管理者へ提出されます</p>
            </div>
            <div className="text-3xl shrink-0">🚌</div>
          </button>
        )}

        {/* 今日の送迎一覧 */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-blue-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-slate-700">今日の送迎一覧</span>
          </div>
          {todayRides.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">まだ記録がありません</div>
          ) : (
            <div className="divide-y">
              {todayRides.map(ride => (
                <div key={ride.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">{tripTypeLabel[ride.tripType]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[ride.status]}`}>
                          {statusLabel[ride.status]}
                        </span>
                        {ride.abnormality !== 'NONE' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">⚠ 異常あり</span>}
                      </div>
                      <p className="text-xs text-slate-400">
                        🚌 {ride.vehicleName}｜👤 {ride.driverName}｜🕐 {ride.startTime}{ride.endTime ? `〜${ride.endTime}` : ''}
                        {ride.distanceKm ? `｜📍 ${ride.distanceKm}km` : ''}
                      </p>
                      {ride.status === 'SUBMITTED' && ride.createdByEmail === user?.email && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">⏳ 管理者の承認をお待ちください（編集不可）</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 自分の最近の記録 */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-violet-50 flex items-center gap-2">
            <User className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-slate-700">自分の送迎履歴（直近30件）</span>
          </div>
          {myRides.filter(r => r.date !== today).length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">過去の記録はありません</div>
          ) : (
            <div className="divide-y">
              {myRides.filter(r => r.date !== today).slice(0, 10).map(ride => (
                <div key={ride.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-500">{ride.date}</span>
                      <span className="text-xs text-slate-700">{tripTypeLabel[ride.tripType]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${statusColor[ride.status]}`}>
                        {statusLabel[ride.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{ride.vehicleName}｜{ride.distanceKm || '-'}km</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 送迎入力ダイアログ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">🚌</span> 送迎記録入力
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* テンプレ選択 */}
            {templates.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">ルートテンプレから開始（任意）</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors font-medium">
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">日付 *</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">便種別 *</label>
                <Select value={form.tripType} onValueChange={v => setForm(f => ({ ...f, tripType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PICKUP">🌅 朝便（迎え）</SelectItem>
                    <SelectItem value="DROPOFF">🌇 帰便（送り）</SelectItem>
                    <SelectItem value="OTHER">🚐 その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 車両選択 */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">車両 *</label>
              <Select value={form.vehicleId || 'none'} onValueChange={v => {
                const vehicle = vehicles.find(x => x.id === v);
                setForm(f => ({ ...f, vehicleId: v === 'none' ? '' : v, vehicleName: vehicle?.name || '', vehiclePlate: vehicle?.plateNumber || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="車両を選択" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>🚌 {v.name}（{v.plateNumber}）</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* 運転者選択（わかりやすいUI） */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">運転者 *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {staff.filter(s => s.approval_status === 'approved').map(s => (
                  <button key={s.email} onClick={() => setForm(f => ({ ...f, driverEmail: s.email, driverName: s.full_name }))}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${form.driverEmail === s.email ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${form.driverEmail === s.email ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {s.full_name?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{s.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.role === 'admin' ? '管理者' : s.role === 'full_time' ? '正社員' : s.role === 'part_time' ? 'パート' : '単発'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 同乗者 */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">同乗スタッフ（任意）</label>
              <Select value={form.attendantEmail || 'none'} onValueChange={v => {
                const s = staff.find(x => x.email === v);
                setForm(f => ({ ...f, attendantEmail: v === 'none' ? '' : v, attendantName: s?.full_name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {staff.filter(s => s.approval_status === 'approved' && s.email !== form.driverEmail).map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 時刻・メーター */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">出発時刻 *</label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">開始メーター(km) *</label>
                <Input type="number" placeholder="例: 12345" value={form.startOdometerKm} onChange={e => setForm(f => ({ ...f, startOdometerKm: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">到着時刻</label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">終了メーター(km)</label>
                <Input type="number" placeholder="例: 12378" value={form.endOdometerKm} onChange={e => setForm(f => ({ ...f, endOdometerKm: e.target.value }))} />
              </div>
            </div>
            {form.endOdometerKm && form.startOdometerKm && (
              <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                <p className="text-emerald-700 font-bold">走行距離：{Math.max(0, parseFloat(form.endOdometerKm) - parseFloat(form.startOdometerKm)).toFixed(1)} km</p>
              </div>
            )}

            {/* 利用者 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600">乗車利用者</label>
                <button onClick={addPassenger} className="text-xs text-blue-600 font-bold hover:underline">＋ 追加</button>
              </div>
              <div className="space-y-2">
                {form.passengers.map((p, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input placeholder="利用者名 *" value={p.clientName} onChange={e => updatePassenger(i, 'clientName', e.target.value)} className="flex-1" />
                      <button onClick={() => removePassenger(i)} className="text-red-400 hover:text-red-600 text-sm px-2">✗</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="time" placeholder="乗車時刻" value={p.boardTime} onChange={e => updatePassenger(i, 'boardTime', e.target.value)} />
                      <Input type="time" placeholder="降車時刻" value={p.alightTime} onChange={e => updatePassenger(i, 'alightTime', e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.seatBeltChecked} onCheckedChange={v => updatePassenger(i, 'seatBeltChecked', v)} />
                      <span className="text-xs text-slate-600">シートベルト確認済み</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 異常 */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">異常の有無</label>
              <Select value={form.abnormality} onValueChange={v => setForm(f => ({ ...f, abnormality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">✅ 異常なし</SelectItem>
                  <SelectItem value="MINOR">⚠️ 軽微な異常あり</SelectItem>
                  <SelectItem value="ACCIDENT">🚨 事故・重大事故</SelectItem>
                </SelectContent>
              </Select>
              {form.abnormality !== 'NONE' && (
                <Input className="mt-2 border-red-200" placeholder="異常の内容を入力してください（必須）" value={form.abnormalityNote}
                  onChange={e => setForm(f => ({ ...f, abnormalityNote: e.target.value }))} />
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              📋 保存すると管理者に提出されます。提出後は編集できません。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>キャンセル</Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold"
              disabled={!canSubmit || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? '提出中...' : '提出する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}