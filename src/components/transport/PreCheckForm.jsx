import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const FUEL_LABELS = { FULL: '満タン', '3_4': '3/4', HALF: '1/2', '1_4': '1/4', LOW: '少ない' };

export default function PreCheckForm({ user, vehicles, onSaved, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    vehicleId: '',
    fuelLevel: 'FULL',
    tireOK: true, lightsOK: true, brakeOK: true,
    exteriorDamageNone: true, interiorOK: true,
    otherIssue: false, issueNote: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.vehicleId) return;
    setSaving(true);
    const vehicle = vehicles.find(v => v.id === form.vehicleId);
    await base44.entities.VehiclePreCheck.create({
      ...form,
      vehicleName: vehicle?.name || '',
      checkerEmail: user.email,
      checkerName: user.full_name,
      checkedAtUtcMs: Date.now(),
    });
    setSaving(false);
    onSaved && onSaved();
  };

  const checks = [
    { key: 'tireOK', label: 'タイヤ（空気圧・損傷）', icon: '🔄' },
    { key: 'lightsOK', label: 'ライト（前後・ウインカー）', icon: '💡' },
    { key: 'brakeOK', label: 'ブレーキ（感触・液量）', icon: '🛑' },
    { key: 'exteriorDamageNone', label: '車体外観（傷・凹みなし）', icon: '🚌' },
    { key: 'interiorOK', label: '車内清潔・装備', icon: '🪑' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">🔍 車両使用前点検</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">点検日</label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">車両 *</label>
          <Select value={form.vehicleId || 'none'} onValueChange={v => setForm(f => ({ ...f, vehicleId: v === 'none' ? '' : v }))}>
            <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
            <SelectContent>
              {vehicles.filter(v => v.isActive !== false).map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600 mb-1 block">燃料レベル</label>
        <div className="flex gap-2">
          {Object.entries(FUEL_LABELS).map(([val, label]) => (
            <button key={val} type="button"
              onClick={() => setForm(f => ({ ...f, fuelLevel: val }))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${form.fuelLevel === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {checks.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
            <span className="text-sm text-slate-700">{icon} {label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${form[key] ? 'text-green-600' : 'text-red-500'}`}>{form[key] ? 'OK' : 'NG'}</span>
              <Switch checked={form[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50">
          <span className="text-sm text-red-700">⚠️ その他の問題あり</span>
          <Switch checked={form.otherIssue} onCheckedChange={v => setForm(f => ({ ...f, otherIssue: v }))} />
        </div>
        {form.otherIssue && (
          <Input placeholder="問題の内容を記入" value={form.issueNote} onChange={e => setForm(f => ({ ...f, issueNote: e.target.value }))} />
        )}
      </div>

      <Button className="w-full bg-green-600 hover:bg-green-700" disabled={!form.vehicleId || saving} onClick={handleSave}>
        {saving ? '保存中...' : '点検完了として記録'}
      </Button>
    </div>
  );
}