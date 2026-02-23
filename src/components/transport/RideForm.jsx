import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ChevronRight, Clock, Gauge } from 'lucide-react';

const getNow = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
};
const getToday = () => new Date().toISOString().split('T')[0];

export default function RideForm({ user, vehicles, staff, templates, onSaved, onCancel }) {
  const [step, setStep] = useState(1); // 1=基本情報, 2=乗客, 3=終了
  const [saving, setSaving] = useState(false);
  const [savedRide, setSavedRide] = useState(null);
  const [clients, setClients] = useState([]);

  const [form, setForm] = useState({
    date: getToday(),
    tripType: 'PICKUP',
    vehicleId: '',
    vehicleName: '',
    vehiclePlate: '',
    driverEmail: user?.email || '',
    driverName: user?.full_name || '',
    attendantEmail: '',
    attendantName: '',
    startTime: getNow(),
    endTime: '',
    startOdometerKm: '',
    endOdometerKm: '',
    abnormality: 'NONE',
    abnormalityNote: '',
    routeTemplateId: '',
    routeTemplateName: '',
  });

  const [passengers, setPassengers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date(today).getDay();
        const allClients = await base44.entities.Client.list('name');
        const todayClients = allClients.filter(c => c.isActive !== false && c.daysOfWeek && c.daysOfWeek.includes(dayOfWeek));
        setClients(todayClients);
      } catch (error) {
        console.error('Failed to load clients:', error);
        setClients([]);
      }
    })();
  }, []);

  const applyTemplate = (t) => {
    setForm(f => ({
      ...f,
      tripType: t.tripType,
      vehicleId: t.defaultVehicleId || f.vehicleId,
      vehicleName: t.defaultVehicleName || f.vehicleName,
      vehiclePlate: vehicles.find(v => v.id === t.defaultVehicleId)?.plateNumber || f.vehiclePlate,
      routeTemplateId: t.id,
      routeTemplateName: t.name,
    }));
    setPassengers((t.defaultPassengerNames || []).map((name, i) => ({
      clientName: name, boardTime: '', alightTime: '', seatBeltChecked: true, note: '', order: i,
    })));
  };

  const handleVehicleChange = (id) => {
    const v = vehicles.find(x => x.id === id);
    setForm(f => ({ ...f, vehicleId: id, vehicleName: v?.name || '', vehiclePlate: v?.plateNumber || '' }));
  };

  const handleDriverChange = (email) => {
    const s = staff.find(x => x.email === email);
    setForm(f => ({ ...f, driverEmail: email, driverName: s?.full_name || '' }));
  };

  const handleAttendantChange = (email) => {
    if (email === 'none') { setForm(f => ({ ...f, attendantEmail: '', attendantName: '' })); return; }
    const s = staff.find(x => x.email === email);
    setForm(f => ({ ...f, attendantEmail: email, attendantName: s?.full_name || '' }));
  };

  const addPassenger = () => {
    setPassengers(prev => [...prev, { clientName: '', boardTime: '', alightTime: '', seatBeltChecked: true, note: '', order: prev.length }]);
  };

  const addClientPassenger = (clientName) => {
    setPassengers(prev => [...prev, { clientName, boardTime: '', alightTime: '', seatBeltChecked: true, note: '', order: prev.length }]);
  };
  const removePassenger = (i) => setPassengers(prev => prev.filter((_, idx) => idx !== i));
  const updatePassenger = (i, key, val) => setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));

  // Step1保存 → DRAFT作成
  const saveStep1 = async () => {
    if (!form.vehicleId || !form.driverEmail || !form.startOdometerKm) return;
    setSaving(true);
    const ride = await base44.entities.Ride.create({
      ...form,
      startOdometerKm: Number(form.startOdometerKm),
      status: 'DRAFT',
      createdByEmail: user.email,
      createdByName: user.full_name,
    });
    setSavedRide(ride);
    setSaving(false);
    setStep(2);
  };

  // Step2: 乗客保存
  const saveStep2 = async () => {
    setSaving(true);
    // 既存乗客を削除して再作成
    const existing = await base44.entities.RidePassenger.filter({ rideId: savedRide.id });
    for (const p of existing) await base44.entities.RidePassenger.delete(p.id);
    for (const p of passengers.filter(x => x.clientName.trim())) {
      await base44.entities.RidePassenger.create({ ...p, rideId: savedRide.id });
    }
    setSaving(false);
    setStep(3);
  };

  // Step3: 終了・提出
  const submitRide = async () => {
    if (!form.endOdometerKm || !form.endTime) return;
    setSaving(true);
    const dist = Math.max(0, Number(form.endOdometerKm) - Number(form.startOdometerKm));
    await base44.entities.Ride.update(savedRide.id, {
      endTime: form.endTime,
      endOdometerKm: Number(form.endOdometerKm),
      distanceKm: dist,
      abnormality: form.abnormality,
      abnormalityNote: form.abnormalityNote,
      status: 'SUBMITTED',
    });
    // 管理者通知
    const admins = staff.filter(s => s.role === 'admin');
    const notifs = admins.map(a => ({
      user_email: a.email,
      type: 'transport',
      title: '新しい送迎記録が提出されました',
      content: `${form.date} ${form.tripType === 'PICKUP' ? '朝便' : form.tripType === 'DROPOFF' ? '帰便' : 'その他'} / ${form.driverName}`,
      link_url: '/TransportAdmin',
      createdAtUtc: Date.now(),
    }));
    if (notifs.length) await base44.entities.Notification.bulkCreate(notifs);
    setSaving(false);
    onSaved && onSaved();
  };

  const canStep1 = form.vehicleId && form.driverEmail && form.startOdometerKm && form.startTime && form.date;
  const canStep3 = form.endOdometerKm && form.endTime;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* ステップ表示 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
        {['基本情報', '乗客確認', '運行終了'].map((label, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-1 text-sm font-medium ${step === i+1 ? 'text-white' : 'text-white/50'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === i+1 ? 'bg-white text-blue-600' : step > i+1 ? 'bg-green-400 text-white' : 'bg-white/20 text-white'}`}>{step > i+1 ? '✓' : i+1}</span>
              <span className="hidden sm:block">{label}</span>
            </div>
            {i < 2 && <ChevronRight className="w-4 h-4 text-white/40" />}
          </React.Fragment>
        ))}
        <button onClick={onCancel} className="ml-auto text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">

        {/* Step 1: 基本情報 */}
        {step === 1 && (
          <>
            {/* テンプレ選択 */}
            {templates.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">⚡ テンプレから開始（ワンタップ）</p>
                <div className="flex flex-wrap gap-2">
                  {templates.filter(t => t.isActive !== false).map(t => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                      className={`text-xs px-3 py-1.5 rounded-xl border-2 font-medium transition-all ${form.routeTemplateId === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                      {t.tripType === 'PICKUP' ? '🌅' : '🌇'} {t.name}
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

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">車両 *</label>
              <Select value={form.vehicleId || 'none'} onValueChange={v => handleVehicleChange(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="車両を選択" /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.isActive !== false).map(v => (
                    <SelectItem key={v.id} value={v.id}>🚌 {v.name}（{v.plateNumber}）</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">運転者 *</label>
              <Select value={form.driverEmail || 'none'} onValueChange={v => handleDriverChange(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="運転者を選択" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.approval_status === 'approved').map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">同乗スタッフ（任意）</label>
              <Select value={form.attendantEmail || 'none'} onValueChange={handleAttendantChange}>
                <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {staff.filter(s => s.approval_status === 'approved' && s.email !== form.driverEmail).map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block"><Clock className="w-3 h-3 inline mr-1" />出発時刻 *</label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block"><Gauge className="w-3 h-3 inline mr-1" />開始メーター(km) *</label>
                <Input type="number" placeholder="例: 12345" value={form.startOdometerKm} onChange={e => setForm(f => ({ ...f, startOdometerKm: e.target.value }))} />
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={!canStep1 || saving} onClick={saveStep1}>
              {saving ? '保存中...' : '次へ：乗客確認 →'}
            </Button>
          </>
        )}

        {/* Step 2: 乗客 */}
         {step === 2 && (
           <>
             <div className="flex items-center justify-between">
               <p className="text-sm font-bold text-slate-700">乗車利用者（{passengers.length}名）</p>
               <button type="button" onClick={addPassenger} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                 <Plus className="w-3 h-3" />手動追加
               </button>
             </div>

             {clients.length > 0 && (
               <div>
                 <p className="text-xs font-bold text-slate-500 mb-2">本日の利用者一覧（タップで追加）</p>
                 <div className="flex flex-wrap gap-2 mb-3">
                   {clients.map(c => (
                     <button key={c.id} onClick={() => addClientPassenger(c.name)} className="text-xs px-3 py-1.5 rounded-lg border-2 border-green-300 bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-all">
                       {c.wheelchairRequired ? '♿ ' : ''}{c.name}
                     </button>
                   ))}
                 </div>
               </div>
             )}

             {passengers.length === 0 && (
               <div className="text-center py-6 text-slate-400 text-sm">
                 <p>{clients.length > 0 ? '上記から利用者を選択するか' : ''}乗客を追加してください</p>
                 <button type="button" onClick={addPassenger} className="mt-2 text-blue-500 text-xs underline">＋ 追加する</button>
               </div>
             )}

            <div className="space-y-3">
              {passengers.map((p, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
                  <div className="flex gap-2 items-center">
                    <span className="text-slate-400 text-xs font-bold w-5">{i+1}</span>
                    <Input placeholder="利用者名 *" value={p.clientName} onChange={e => updatePassenger(i, 'clientName', e.target.value)} className="flex-1" />
                    <button type="button" onClick={() => removePassenger(i)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-7">
                    <div>
                      <label className="text-xs text-slate-500">乗車時刻</label>
                      <Input type="time" value={p.boardTime} onChange={e => updatePassenger(i, 'boardTime', e.target.value)} className="text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">降車時刻</label>
                      <Input type="time" value={p.alightTime} onChange={e => updatePassenger(i, 'alightTime', e.target.value)} className="text-xs" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-7">
                    <Switch checked={p.seatBeltChecked} onCheckedChange={v => updatePassenger(i, 'seatBeltChecked', v)} />
                    <span className="text-xs text-slate-600">シートベルト確認済み</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← 戻る</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={saveStep2}>
                {saving ? '保存中...' : '次へ：運行終了 →'}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: 終了 */}
        {step === 3 && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              ✅ 運行記録を作成しました。到着後に終了情報を入力して提出してください。
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">到着時刻 *</label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">終了メーター(km) *</label>
                <Input type="number" placeholder="例: 12378" value={form.endOdometerKm} onChange={e => setForm(f => ({ ...f, endOdometerKm: e.target.value }))} />
              </div>
            </div>

            {form.endOdometerKm && form.startOdometerKm && (
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                <p className="text-blue-700 font-bold text-lg">
                  走行距離：{Math.max(0, Number(form.endOdometerKm) - Number(form.startOdometerKm)).toFixed(1)} km
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">異常の有無 *</label>
              <Select value={form.abnormality} onValueChange={v => setForm(f => ({ ...f, abnormality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">✅ 異常なし</SelectItem>
                  <SelectItem value="MINOR">⚠️ 軽微な異常</SelectItem>
                  <SelectItem value="ACCIDENT">🚨 事故・重大異常</SelectItem>
                </SelectContent>
              </Select>
              {form.abnormality !== 'NONE' && (
                <Input className="mt-2" placeholder="異常の内容を記入（必須）" value={form.abnormalityNote} onChange={e => setForm(f => ({ ...f, abnormalityNote: e.target.value }))} />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← 戻る</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold"
                disabled={!canStep3 || saving || (form.abnormality !== 'NONE' && !form.abnormalityNote)}
                onClick={submitRide}
              >
                {saving ? '提出中...' : '提出する ✓'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}