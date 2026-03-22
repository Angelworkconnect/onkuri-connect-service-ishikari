import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const TAX_MODES = [
  { value: 'FULL', label: '無制限（制限なし）' },
  { value: 'SPOUSE_103', label: '103万の壁（配偶者控除）' },
  { value: 'SPOUSE_106', label: '106万の壁' },
  { value: 'SPOUSE_130', label: '130万の壁（社会保険）' },
  { value: 'STUDENT_LIMIT', label: '学生制限' },
  { value: 'CUSTOM', label: 'カスタム（個別設定）' },
];

export default function StaffTaxFields({ form, setForm }) {
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  return (
    <div className="border rounded-lg p-3 space-y-3 bg-pink-50/50">
      <p className="text-xs font-bold text-pink-700">💕 扶養・税制プロファイル</p>
      <div>
        <Label>税制モード</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {TAX_MODES.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => update('tax_mode', m.value)}
              className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                (form.tax_mode || 'FULL') === m.value
                  ? 'bg-pink-600 text-white border-pink-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {form.tax_mode === 'CUSTOM' && (
        <div>
          <Label>年収上限（円）</Label>
          <Input type="number" value={form.annual_income_limit || ''} placeholder="1200000"
            onChange={(e) => update('annual_income_limit', Number(e.target.value))} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>月労働時間上限</Label>
          <Input type="number" value={form.monthly_hour_limit || ''} placeholder="80"
            onChange={(e) => update('monthly_hour_limit', Number(e.target.value))} />
        </div>
        <div>
          <Label>時給（円）</Label>
          <Input type="number" value={form.hourly_wage || ''} placeholder="1100"
            onChange={(e) => update('hourly_wage', Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label>最大連勤日数</Label>
        <Input type="number" value={form.max_consecutive_days || ''} placeholder="5"
          onChange={(e) => update('max_consecutive_days', Number(e.target.value))} />
      </div>
    </div>
  );
}