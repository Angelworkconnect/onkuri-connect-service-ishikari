import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import StaffTaxFields from './StaffTaxFields';

// ネイティブselectラッパー（Radix UIのSelect問題を回避）
function NativeSelect({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${className}`}
    >
      {children}
    </select>
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
  full_name: '',
  last_name: '',
  first_name: '',
  email: '',
  phone: '',
  address: '',
  date_of_birth: '',
  gender: 'other',
  role: 'temporary',
  status: 'active',
  approval_status: 'pending',
  qualifications: [],
  display_in_shift_calendar: true,
  external_staff_code: '',
  monthly_salary: '',
  hourly_wage: '',
  daily_wage: '',
  commute_allowance: '',
  commute_allowance_type: 'monthly',
  tax_mode: 'FULL',
  monthly_hour_limit: '',
  max_consecutive_days: '',
};

export default function StaffDialog({ open, onOpenChange, editingStaff, onSubmit, onInvite, invitePending }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  // ダイアログが開くたびにフォームをリセット/セット
  useEffect(() => {
    if (!open) return;
    if (editingStaff) {
      const nameParts = (editingStaff.full_name || '').split(' ');
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
  }, [open, editingStaff?.id]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const fullName = [form.last_name, form.first_name].filter(Boolean).join(' ') || form.full_name;
    onSubmit({ ...form, full_name: fullName });
  };

  const toggleQualification = (q) => {
    setForm(prev => {
      const cur = prev.qualifications || [];
      const has = cur.includes(q);
      return { ...prev, qualifications: has ? cur.filter(x => x !== q) : [...cur, q] };
    });
  };

  const canSubmit = (form.last_name || form.full_name) && form.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editingStaff ? 'スタッフ編集' : '新規スタッフ登録'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* 氏名 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>苗字 *</Label>
              <Input
                value={form.last_name}
                onChange={e => {
                  const ln = e.target.value;
                  setForm(prev => ({ ...prev, last_name: ln, full_name: [ln, prev.first_name].filter(Boolean).join(' ') }));
                }}
                placeholder="山下"
              />
            </div>
            <div>
              <Label>名前 *</Label>
              <Input
                value={form.first_name}
                onChange={e => {
                  const fn = e.target.value;
                  setForm(prev => ({ ...prev, first_name: fn, full_name: [prev.last_name, fn].filter(Boolean).join(' ') }));
                }}
                placeholder="恵"
              />
            </div>
          </div>

          {/* メール */}
          <div>
            <Label>メールアドレス *</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="yamada@example.com" />
          </div>

          {/* 電話・住所 */}
          <div>
            <Label>電話番号</Label>
            <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="090-1234-5678" />
          </div>
          <div>
            <Label>住所</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="札幌市中央区..." />
          </div>

          {/* 生年月日・性別 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>生年月日</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div>
              <Label>性別</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 外部コード */}
          <div>
            <Label>外部連携コード <span className="text-xs font-normal text-slate-400">（給与ソフト・勤怠システムの社員番号）</span></Label>
            <Input value={form.external_staff_code} onChange={e => set('external_staff_code', e.target.value)} placeholder="例: 001, E0042" />
            <p className="text-xs text-slate-400 mt-1">MFクラウド・freee・弥生・ジョブカンなどのCSV出力時に使用</p>
          </div>

          {/* カテゴリー */}
          <div>
            <Label>カテゴリー *</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">管理者</SelectItem>
                <SelectItem value="full_time">正社員</SelectItem>
                <SelectItem value="part_time">パート</SelectItem>
                <SelectItem value="temporary">単発</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 在籍ステータス */}
          <div>
            <Label>在籍ステータス *</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">在職中</SelectItem>
                <SelectItem value="leave">休職中</SelectItem>
                <SelectItem value="inactive">退職・停止</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 承認ステータス */}
          <div>
            <Label>承認ステータス *</Label>
            <Select value={form.approval_status} onValueChange={v => set('approval_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">承認待ち</SelectItem>
                <SelectItem value="approved">承認済み</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* シフトカレンダー表示 */}
          <div className="flex items-center gap-2 p-2 border rounded-lg bg-blue-50">
            <input
              type="checkbox"
              checked={form.display_in_shift_calendar}
              onChange={e => set('display_in_shift_calendar', e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <Label className="mb-0 cursor-pointer">シフトカレンダーに表示する</Label>
          </div>

          {/* 保有資格 */}
          <div>
            <Label>保有資格（複数選択可）</Label>
            <div className="mt-2 border rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50 space-y-1">
              {QUALIFICATIONS.map(q => (
                <label key={q} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={(form.qualifications || []).includes(q)}
                    onChange={() => toggleQualification(q)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{q}</span>
                </label>
              ))}
            </div>
            {(form.qualifications || []).length > 0 && (
              <p className="text-xs text-indigo-600 mt-1">選択中: {form.qualifications.join('、')}</p>
            )}
          </div>

          {/* 給与設定 */}
          <div className="border rounded-lg p-4 bg-amber-50 space-y-3">
            <p className="text-sm font-bold text-amber-800">給与設定</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">月給（円）</Label>
                <Input type="number" placeholder="200000" value={form.monthly_salary}
                  onChange={e => set('monthly_salary', e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div>
                <Label className="text-xs">時給（円）</Label>
                <Input type="number" placeholder="1200" value={form.hourly_wage}
                  onChange={e => set('hourly_wage', e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div>
                <Label className="text-xs">日給（円）</Label>
                <Input type="number" placeholder="10000" value={form.daily_wage}
                  onChange={e => set('daily_wage', e.target.value ? Number(e.target.value) : '')} />
              </div>
            </div>
            <div className="border-t border-amber-200 pt-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">交通費</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">交通費（円）</Label>
                  <Input type="number" placeholder="10000" value={form.commute_allowance}
                    onChange={e => set('commute_allowance', e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div>
                  <Label className="text-xs">支給単位</Label>
                  <Select value={form.commute_allowance_type} onValueChange={v => set('commute_allowance_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">月額</SelectItem>
                      <SelectItem value="daily">日額（出勤日数×金額）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <StaffTaxFields form={form} setForm={setForm} />
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2 pt-2 border-t">
          {editingStaff && (
            <Button variant="outline" onClick={() => onInvite(form.email)}
              className="w-full sm:w-auto gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              disabled={invitePending}>
              <Mail className="w-4 h-4" />{invitePending ? '送信中...' : '招待メールを送信'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">キャンセル</Button>
            <Button onClick={handleSubmit} className="bg-[#2D4A6F] flex-1 sm:flex-none" disabled={!canSubmit}>
              {editingStaff ? '更新' : '登録'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}