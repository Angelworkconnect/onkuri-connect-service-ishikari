import React, { useState, useEffect } from 'react';
import { Mail, X, Check } from "lucide-react";
import StaffTaxFields from './StaffTaxFields';

function SegmentSelect({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
            value === opt.value
              ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const QUALIFICATIONS = [
  '無資格','看護師','准看護師','介護福祉士','実務者研修','初任者研修',
  '理学療法士','作業療法士','言語聴覚士','柔道整復師','あん摩マッサージ指圧師',
  '社会福祉士','精神保健福祉士','社会福祉主事任用資格',
  '管理栄養士','栄養士','介護支援専門員','認知症介護実践者研修',
  '普通自動車免許','普通二種免許','福祉有償運送講習',
];

const DEFAULT_FORM = {
  full_name: '', last_name: '', first_name: '',
  email: '', phone: '', address: '', date_of_birth: '',
  gender: 'other', role: 'temporary', status: 'active',
  approval_status: 'pending', qualifications: [],
  display_in_shift_calendar: true, external_staff_code: '',
  monthly_salary: '', hourly_wage: '', daily_wage: '',
  commute_allowance: '', commute_allowance_type: 'monthly',
  tax_mode: 'FULL', monthly_hour_limit: '', max_consecutive_days: '',
};

export default function StaffDialog({ open, onOpenChange, editingStaff, onSubmit, onInvite, invitePending }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setSaved(false); setSaving(false); return; }
    if (editingStaff) {
      const nameParts = (editingStaff.full_name || '').split(/\s+/);
      setForm({
        ...DEFAULT_FORM,
        full_name: editingStaff.full_name || '',
        last_name: nameParts[0] || '',
        first_name: nameParts.slice(1).join(' ') || '',
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        address: editingStaff.address || '',
        date_of_birth: editingStaff.date_of_birth || '',
        gender: editingStaff.gender || 'other',
        role: editingStaff.role || 'temporary',
        status: editingStaff.status || 'active',
        approval_status: editingStaff.approval_status || 'pending',
        qualifications: editingStaff.qualifications || [],
        display_in_shift_calendar: editingStaff.display_in_shift_calendar !== false,
        external_staff_code: editingStaff.external_staff_code || '',
        monthly_salary: editingStaff.monthly_salary || '',
        hourly_wage: editingStaff.hourly_wage || '',
        daily_wage: editingStaff.daily_wage || '',
        commute_allowance: editingStaff.commute_allowance || '',
        commute_allowance_type: editingStaff.commute_allowance_type || 'monthly',
        tax_mode: editingStaff.tax_mode || 'FULL',
        annual_income_limit: editingStaff.annual_income_limit || '',
        monthly_hour_limit: editingStaff.monthly_hour_limit || '',
        max_consecutive_days: editingStaff.max_consecutive_days || '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setSaved(false);
    setSaving(false);
  }, [open, editingStaff?.id]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    const fullName = [form.last_name, form.first_name].filter(Boolean).join(' ') || form.full_name;
    await onSubmit({ ...form, full_name: fullName });
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onOpenChange(false);
    }, 1200);
  };

  const toggleQualification = (q) => {
    setForm(prev => {
      const cur = prev.qualifications || [];
      return { ...prev, qualifications: cur.includes(q) ? cur.filter(x => x !== q) : [...cur, q] };
    });
  };

  if (!open) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1, background: 'white', borderRadius: '12px',
        width: '100%', maxWidth: '540px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        margin: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
            {editingStaff ? 'スタッフ編集' : '新規スタッフ登録'}
          </h2>
          <button onClick={() => onOpenChange(false)} style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 氏名 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>苗字 *</label>
                <input value={form.last_name}
                  onChange={e => { const ln = e.target.value; setForm(p => ({ ...p, last_name: ln, full_name: [ln, p.first_name].filter(Boolean).join(' ') })); }}
                  placeholder="山下"
                  style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>名前 *</label>
                <input value={form.first_name}
                  onChange={e => { const fn = e.target.value; setForm(p => ({ ...p, first_name: fn, full_name: [p.last_name, fn].filter(Boolean).join(' ') })); }}
                  placeholder="恵"
                  style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* メール */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>メールアドレス *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="yamada@example.com"
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* 電話 */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>電話番号</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="090-1234-5678"
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* 住所 */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>住所</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="札幌市中央区..."
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* 生年月日・性別 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>生年月日</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>性別</label>
                <SegmentSelect value={form.gender} onChange={v => set('gender', v)} options={[
                  { value: 'male', label: '男性' }, { value: 'female', label: '女性' }, { value: 'other', label: 'その他' },
                ]} />
              </div>
            </div>

            {/* 外部コード */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>外部連携コード</label>
              <input value={form.external_staff_code} onChange={e => set('external_staff_code', e.target.value)} placeholder="例: 001, E0042"
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* カテゴリー */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>カテゴリー *</label>
              <SegmentSelect value={form.role} onChange={v => set('role', v)} options={[
                { value: 'admin', label: '管理者' }, { value: 'full_time', label: '正社員' },
                { value: 'part_time', label: 'パート' }, { value: 'temporary', label: '単発' },
              ]} />
            </div>

            {/* 在籍ステータス */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>在籍ステータス *</label>
              <SegmentSelect value={form.status} onChange={v => set('status', v)} options={[
                { value: 'active', label: '在職中' }, { value: 'leave', label: '休職中' }, { value: 'inactive', label: '退職・停止' },
              ]} />
            </div>

            {/* 承認ステータス */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>承認ステータス *</label>
              <SegmentSelect value={form.approval_status} onChange={v => set('approval_status', v)} options={[
                { value: 'pending', label: '承認待ち' }, { value: 'approved', label: '承認済み' }, { value: 'rejected', label: '却下' },
              ]} />
            </div>

            {/* シフトカレンダー */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <input type="checkbox" checked={form.display_in_shift_calendar} onChange={e => set('display_in_shift_calendar', e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
              />
              <label style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>シフトカレンダーに表示する</label>
            </div>

            {/* 保有資格 */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>保有資格（複数選択可）</label>
              <div style={{ marginTop: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', maxHeight: '140px', overflowY: 'auto', background: '#f8fafc' }}>
                {QUALIFICATIONS.map(q => (
                  <label key={q} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 4px', cursor: 'pointer', borderRadius: '4px' }}>
                    <input type="checkbox" checked={(form.qualifications || []).includes(q)} onChange={() => toggleQualification(q)}
                      style={{ width: '14px', height: '14px', accentColor: '#4f46e5' }}
                    />
                    <span style={{ fontSize: '13px', color: '#374151' }}>{q}</span>
                  </label>
                ))}
              </div>
              {(form.qualifications || []).length > 0 && (
                <p style={{ fontSize: '12px', color: '#4f46e5', marginTop: '4px' }}>選択中: {form.qualifications.join('、')}</p>
              )}
            </div>

            {/* 給与設定 */}
            <div style={{ border: '1px solid #fcd34d', borderRadius: '8px', padding: '16px', background: '#fffbeb' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400e', marginBottom: '10px' }}>給与設定</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {[
                  { label: '月給（円）', key: 'monthly_salary', placeholder: '200000' },
                  { label: '時給（円）', key: 'hourly_wage', placeholder: '1200' },
                  { label: '日給（円）', key: 'daily_wage', placeholder: '10000' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', color: '#374151' }}>{f.label}</label>
                    <input type="number" placeholder={f.placeholder} value={form[f.key]}
                      onChange={e => set(f.key, e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', marginTop: '4px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid #fcd34d', paddingTop: '12px', marginTop: '12px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>交通費</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>交通費（円）</label>
                    <input type="number" placeholder="10000" value={form.commute_allowance}
                      onChange={e => set('commute_allowance', e.target.value ? Number(e.target.value) : '')}
                      style={{ width: '100%', marginTop: '4px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>支給単位</label>
                    <SegmentSelect value={form.commute_allowance_type} onChange={v => set('commute_allowance_type', v)} options={[
                      { value: 'monthly', label: '月額' }, { value: 'daily', label: '日額' },
                    ]} />
                  </div>
                </div>
              </div>
            </div>

            <StaffTaxFields form={form} setForm={setForm} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: '16px 24px', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end',
          background: 'white', borderRadius: '0 0 12px 12px'
        }}>
          {editingStaff && (
            <button
              type="button"
              onClick={() => onInvite(form.email)}
              disabled={invitePending}
              style={{
                padding: '9px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                border: '1px solid #bfdbfe', color: '#2563eb', background: 'white',
                cursor: invitePending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Mail size={15} /> {invitePending ? '送信中...' : '招待メールを送信'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              padding: '9px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
              border: '1px solid #d1d5db', color: '#374151', background: 'white', cursor: 'pointer'
            }}
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || saved}
            style={{
              padding: '9px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
              border: 'none', cursor: saving ? 'wait' : 'pointer',
              background: saved ? '#16a34a' : '#2D4A6F',
              color: 'white', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            {saved ? <><Check size={16} /> 更新しました！</> : saving ? '保存中...' : (editingStaff ? '更新' : '登録')}
          </button>
        </div>
      </div>
    </div>
  );
}