import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Trash2 } from 'lucide-react';

const today = format(new Date(), 'yyyy-MM-dd');

export default function RideFormDialog({ open, onClose, user, editingRide, vehicles, onSuccess }) {
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
    routeTemplateId: '',
    routeTemplateName: '',
  });
  const [passengers, setPassengers] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: routeTemplates = [] } = useQuery({
    queryKey: ['routeTemplates'],
    queryFn: () => base44.entities.RouteTemplate.filter({ isActive: true }),
    enabled: open,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['careClients'],
    queryFn: () => base44.entities.CareClient.filter({ status: 'active' }),
    enabled: open,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staffActive'],
    queryFn: () => base44.entities.Staff.filter({ status: 'active' }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editingRide) {
      setForm({
        date: editingRide.date || today,
        tripType: editingRide.tripType || 'PICKUP',
        vehicleId: editingRide.vehicleId || '',
        vehicleName: editingRide.vehicleName || '',
        vehiclePlate: editingRide.vehiclePlate || '',
        driverEmail: editingRide.driverEmail || '',
        driverName: editingRide.driverName || '',
        attendantEmail: editingRide.attendantEmail || '',
        attendantName: editingRide.attendantName || '',
        startTime: editingRide.startTime || format(new Date(), 'HH:mm'),
        startOdometerKm: editingRide.startOdometerKm || '',
        routeTemplateId: editingRide.routeTemplateId || '',
        routeTemplateName: editingRide.routeTemplateName || '',
      });
      // load existing passengers
      base44.entities.RidePassenger.filter({ rideId: editingRide.id }, 'order')
        .then(p => setPassengers(p));
    } else {
      setForm(f => ({
        ...f,
        driverEmail: user?.email || '',
        driverName: user?.full_name || user?.email || '',
        startTime: format(new Date(), 'HH:mm'),
      }));
      setPassengers([]);
    }
  }, [open, editingRide, user]);

  const selectVehicle = (vehicleId) => {
    const v = vehicles.find(v => v.id === vehicleId);
    if (v) setForm(f => ({ ...f, vehicleId, vehicleName: v.name, vehiclePlate: v.plateNumber }));
  };

  const selectDriver = (email) => {
    const s = staffList.find(s => s.email === email);
    if (s) setForm(f => ({ ...f, driverEmail: email, driverName: s.full_name }));
  };

  const selectAttendant = (email) => {
    if (email === 'none') {
      setForm(f => ({ ...f, attendantEmail: '', attendantName: '' }));
      return;
    }
    const s = staffList.find(s => s.email === email);
    if (s) setForm(f => ({ ...f, attendantEmail: email, attendantName: s.full_name }));
  };

  const selectTemplate = (templateId) => {
    if (templateId === 'none') {
      setForm(f => ({ ...f, routeTemplateId: '', routeTemplateName: '' }));
      setPassengers([]);
      return;
    }
    const t = routeTemplates.find(t => t.id === templateId);
    if (!t) return;
    setForm(f => ({
      ...f,
      routeTemplateId: templateId,
      routeTemplateName: t.name,
      tripType: t.tripType || f.tripType,
      vehicleId: t.defaultVehicleId || f.vehicleId,
      vehicleName: t.defaultVehicleName || f.vehicleName,
      driverEmail: t.defaultDriverEmail || f.driverEmail,
      driverName: t.defaultDriverName || f.driverName,
    }));
    // テンプレから利用者リストを作成
    const templatePassengers = (t.orderedClientIds || []).map((clientId, i) => ({
      clientId,
      clientName: t.orderedClientNames?.[i] || clientId,
      seatBeltChecked: true,
      pickupOrDropLocationType: 'HOME',
      pickupLocationNote: '',
      boardTime: '',
      alightTime: '',
      note: '',
      order: i,
      _tempId: `temp_${i}`,
    }));
    setPassengers(templatePassengers);
  };

  const addPassenger = (client) => {
    if (passengers.some(p => p.clientId === client.id)) return;
    setPassengers(prev => [...prev, {
      clientId: client.id,
      clientName: client.full_name,
      seatBeltChecked: true,
      pickupOrDropLocationType: 'HOME',
      pickupLocationNote: '',
      boardTime: '',
      alightTime: '',
      note: '',
      order: prev.length,
      _tempId: `temp_${Date.now()}`,
    }]);
    setClientSearch('');
  };

  const removePassenger = (idx) => {
    setPassengers(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePassenger = (idx, field, value) => {
    setPassengers(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const v = vehicles.find(v => v.id === form.vehicleId);
      const rideData = {
        ...form,
        startOdometerKm: parseFloat(form.startOdometerKm) || 0,
        vehiclePlate: v?.plateNumber || form.vehiclePlate,
        createdByEmail: user?.email || '',
        createdByName: user?.full_name || user?.email || '',
        createdAtUtcMs: Date.now(),
        status: 'DRAFT',
      };

      let rideId;
      if (editingRide) {
        await base44.entities.Ride.update(editingRide.id, rideData);
        rideId = editingRide.id;
        // 既存のpassengerを削除して再作成
        const existing = await base44.entities.RidePassenger.filter({ rideId });
        await Promise.all(existing.map(p => base44.entities.RidePassenger.delete(p.id)));
      } else {
        const ride = await base44.entities.Ride.create(rideData);
        rideId = ride.id;
      }

      await Promise.all(passengers.map(p =>
        base44.entities.RidePassenger.create({
          rideId,
          clientId: p.clientId,
          clientName: p.clientName,
          pickupOrDropLocationType: p.pickupOrDropLocationType,
          pickupLocationNote: p.pickupLocationNote,
          boardTime: p.boardTime,
          alightTime: p.alightTime,
          seatBeltChecked: p.seatBeltChecked,
          note: p.note,
          order: p.order,
        })
      ));
    },
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const filteredClients = clients.filter(c =>
    c.full_name?.includes(clientSearch) && !passengers.some(p => p.clientId === c.id)
  );

  const isNew = !editingRide;
  const canSave = form.vehicleId && form.driverEmail && form.startTime && form.startOdometerKm;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? '新規運行を開始' : '運行を編集'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">日付</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">便種別</label>
              <Select value={form.tripType} onValueChange={v => setForm(f => ({ ...f, tripType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PICKUP">朝便（迎え）</SelectItem>
                  <SelectItem value="DROPOFF">帰便（送り）</SelectItem>
                  <SelectItem value="OTHER">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ルートテンプレ */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">ルートテンプレ（選ぶと利用者が自動入力）</label>
            <Select value={form.routeTemplateId || 'none'} onValueChange={selectTemplate}>
              <SelectTrigger><SelectValue placeholder="テンプレなし" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">テンプレなし</SelectItem>
                {routeTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 車両・ドライバー */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">車両 *</label>
              <Select value={form.vehicleId || 'none'} onValueChange={selectVehicle}>
                <SelectTrigger><SelectValue placeholder="車両を選択" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">運転者 *</label>
              <Select value={form.driverEmail || 'none'} onValueChange={selectDriver}>
                <SelectTrigger><SelectValue placeholder="運転者を選択" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">同乗スタッフ（任意）</label>
              <Select value={form.attendantEmail || 'none'} onValueChange={selectAttendant}>
                <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {staffList.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">出発時刻 *</label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">開始メーター (km) *</label>
            <Input type="number" placeholder="例: 12300" value={form.startOdometerKm}
              onChange={e => setForm(f => ({ ...f, startOdometerKm: e.target.value }))} />
          </div>

          {/* 利用者リスト */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Users className="w-3 h-3" /> 乗車利用者
                <Badge className="ml-1 bg-slate-100 text-slate-600 text-xs">{passengers.length}名</Badge>
              </label>
            </div>

            {/* 利用者追加検索 */}
            <div className="relative mb-3">
              <Input
                placeholder="利用者名で検索して追加..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="text-sm"
              />
              {clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filteredClients.slice(0, 10).map(c => (
                    <button key={c.id} onClick={() => addPassenger(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                      <Plus className="w-3 h-3 text-slate-400" />
                      {c.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {passengers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3 border rounded-lg border-dashed">
                テンプレを選ぶか、上の検索で利用者を追加してください
              </p>
            ) : (
              <div className="space-y-2">
                {passengers.map((p, idx) => (
                  <div key={p._tempId || p.id || idx} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800">{p.clientName}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={p.seatBeltChecked}
                            onCheckedChange={v => updatePassenger(idx, 'seatBeltChecked', v)}
                            className="scale-75"
                          />
                          <span className="text-xs text-slate-500">SB確認</span>
                        </div>
                        <button onClick={() => removePassenger(idx)} className="text-slate-300 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">乗車時刻</label>
                        <Input type="time" value={p.boardTime} className="h-7 text-xs mt-0.5"
                          onChange={e => updatePassenger(idx, 'boardTime', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">降車時刻</label>
                        <Input type="time" value={p.alightTime} className="h-7 text-xs mt-0.5"
                          onChange={e => updatePassenger(idx, 'alightTime', e.target.value)} />
                      </div>
                    </div>
                    <Input placeholder="メモ（任意）" value={p.note} className="h-7 text-xs mt-2"
                      onChange={e => updatePassenger(idx, 'note', e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canSave || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {isNew ? '運行を開始' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}