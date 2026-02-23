import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export default function DriverCheckForm({ user, onSaved, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    fitForDuty: 'OK',
    alcoholCheck: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.DriverDailyCheck.create({
      ...form,
      driverEmail: user.email,
      driverName: user.full_name,
      createdAtUtcMs: Date.now(),
    });
    setSaving(false);
    onSaved && onSaved();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">👤 運転者の日常確認</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600 mb-1 block">確認日</label>
        <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600 mb-2 block">就業可否（自己申告） *</label>
        <div className="grid grid-cols-2 gap-2">
          {[{ val: 'OK', label: '✅ 問題なし', cls: 'border-green-500 bg-green-50 text-green-700' }, { val: 'CAUTION', label: '⚠️ 要配慮', cls: 'border-amber-500 bg-amber-50 text-amber-700' }].map(({ val, label, cls }) => (
            <button key={val} type="button" onClick={() => setForm(f => ({ ...f, fitForDuty: val }))}
              className={`py-3 rounded-xl border-2 font-bold transition-all ${form.fitForDuty === val ? cls : 'border-slate-200 text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
        <span className="text-sm text-slate-700">🍺 アルコールチェック実施済み</span>
        <Switch checked={form.alcoholCheck} onCheckedChange={v => setForm(f => ({ ...f, alcoholCheck: v }))} />
      </div>

      <Button className="w-full bg-green-600 hover:bg-green-700" disabled={saving} onClick={handleSave}>
        {saving ? '保存中...' : '確認完了として記録'}
      </Button>
    </div>
  );
}