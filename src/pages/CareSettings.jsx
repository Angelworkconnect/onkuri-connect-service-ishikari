import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { Save, ArrowLeft, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const DEFAULT_FORM = {
  facility_name: 'サンプル施設',
  capacity: 18,
  unit_price: 10200,
  fixed_cost: 2350000,
  business_days_of_week: [1, 2, 3, 4, 5, 6],
  monthly_business_days: 26,
  memo: '',
  cost_input_mode: 'simple',
  salary_total_monthly: 0,
  salary_staff_count: 0,
  salary_avg_hourly: 1000,
  salary_monthly_hours: 160,
  other_costs_monthly: 0,
};

export default function CareSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [existingId, setExistingId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['care-biz-settings'],
    queryFn: () => base44.entities.CareBusinessSettings.list(),
  });

  useEffect(() => {
    if (settingsList.length > 0) {
      const s = settingsList[0];
      setExistingId(s.id);
      setForm({
        facility_name: s.facility_name || '',
        capacity: s.capacity || 18,
        unit_price: s.unit_price || 10200,
        fixed_cost: s.fixed_cost || 2350000,
        business_days_of_week: s.business_days_of_week || [1,2,3,4,5,6],
        monthly_business_days: s.monthly_business_days || 26,
        memo: s.memo || '',
        cost_input_mode: s.cost_input_mode || 'simple',
        salary_total_monthly: s.salary_total_monthly || 0,
        salary_staff_count: s.salary_staff_count || 0,
        salary_avg_hourly: s.salary_avg_hourly || 1000,
        salary_monthly_hours: s.salary_monthly_hours || 160,
        other_costs_monthly: s.other_costs_monthly || 0,
      });
    }
  }, [settingsList.length]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (existingId) return base44.entities.CareBusinessSettings.update(existingId, data);
      return base44.entities.CareBusinessSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['care-biz-settings']);
      queryClient.invalidateQueries(['care-business-metrics']);
      toast({ title: '保存しました', duration: 1500 });
    },
  });

  const toggleDay = (dow) => {
    const days = form.business_days_of_week.includes(dow)
      ? form.business_days_of_week.filter(d => d !== dow)
      : [...form.business_days_of_week, dow].sort();
    setForm({ ...form, business_days_of_week: days });
  };

  const weeklyDays = form.business_days_of_week.length;
  const maxWeeklySlots = form.capacity * weeklyDays;

  // 詳細モード計算
  const calculatedSalaryTotal = form.salary_staff_count > 0
    ? Math.round(form.salary_avg_hourly * form.salary_monthly_hours * form.salary_staff_count)
    : 0;
  const totalCostDetailed = calculatedSalaryTotal + (form.other_costs_monthly || 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/CareBusinessDashboard" className="flex items-center gap-2 text-white/70 hover:text-white mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" />ダッシュボードへ戻る
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="w-7 h-7 text-[#E8A4B8]" />
            <h1 className="text-2xl font-bold">経営設定</h1>
          </div>
          <p className="text-white/60 text-sm mt-1">施設の基本情報と経営数値を設定します</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* 基本情報 */}
        <Card className="border-0 shadow-md p-6 space-y-5">
          <div>
            <Label className="text-sm font-medium">施設名</Label>
            <Input className="mt-1" value={form.facility_name} onChange={e => setForm({ ...form, facility_name: e.target.value })} placeholder="例：デイサービス〇〇" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">定員（名）</Label>
              <Input className="mt-1" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-sm font-medium">月営業日数</Label>
              <Input className="mt-1" type="number" value={form.monthly_business_days} onChange={e => setForm({ ...form, monthly_business_days: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">客単価（円/人）</Label>
              <Input className="mt-1" type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: Number(e.target.value) })} />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">営業曜日</Label>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4,5,6,0].map(dow => {
                const active = form.business_days_of_week.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    className={`w-11 h-11 rounded-full text-sm font-bold border-2 transition-all ${
                      active ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]' : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {DAY_LABELS[dow]}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-sm text-slate-500">
              <span>営業日数：週{weeklyDays}日</span>
              <span>最大週枠：{maxWeeklySlots}枠</span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">備考メモ（ダッシュボードに表示）</Label>
            <Textarea className="mt-1" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={3} placeholder="経営上の重要事項や目標など..." />
          </div>
        </Card>

        {/* コスト入力モード選択 */}
        <Card className="border-0 shadow-md p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">費用設定</h2>
          <p className="text-xs text-slate-500">経営健全度AIで人件費比率を見たい場合は「詳細モード」を選択してください</p>

          <div className="flex gap-3">
            <button
              onClick={() => setForm({ ...form, cost_input_mode: 'simple' })}
              className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                form.cost_input_mode === 'simple'
                  ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              シンプルモード
            </button>
            <button
              onClick={() => setForm({ ...form, cost_input_mode: 'detailed' })}
              className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                form.cost_input_mode === 'detailed'
                  ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              詳細モード
            </button>
          </div>

          {/* シンプルモード */}
          {form.cost_input_mode === 'simple' && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">固定費（月額・円）</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.fixed_cost}
                  onChange={e => setForm({ ...form, fixed_cost: Number(e.target.value) })}
                  placeholder="例：2,350,000"
                />
              </div>
              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                シンプルモード：固定費（家賃・光熱費・施設管理など）のみを入力します。
              </div>
            </div>
          )}

          {/* 詳細モード */}
          {form.cost_input_mode === 'detailed' && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">常勤スタッフ数（名）</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={form.salary_staff_count}
                    onChange={e => setForm({ ...form, salary_staff_count: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">平均時給（円/h）</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={form.salary_avg_hourly}
                    onChange={e => setForm({ ...form, salary_avg_hourly: Number(e.target.value) })}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">月間平均勤務時間（h）</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.salary_monthly_hours}
                  onChange={e => setForm({ ...form, salary_monthly_hours: Number(e.target.value) })}
                  placeholder="160"
                />
                <p className="text-xs text-slate-400 mt-1">例：160h（月20営業日 × 8h）</p>
              </div>
              <div>
                <Label className="text-sm font-medium">その他月間費用（円）</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={form.other_costs_monthly}
                  onChange={e => setForm({ ...form, other_costs_monthly: Number(e.target.value) })}
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-1">家賃・光熱費・施設管理など</p>
              </div>

              {/* 計算結果表示 */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">給与総額（月額）</span>
                  <span className="font-bold text-slate-800">¥{calculatedSalaryTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">その他費用</span>
                  <span className="font-bold text-slate-800">¥{form.other_costs_monthly.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                  <span className="text-slate-700 font-medium">合計月間費用</span>
                  <span className="font-bold text-[#2D4A6F]">¥{totalCostDetailed.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                詳細モード：スタッフ給与と施設費を分けて入力します。経営健全度AIで人件費比率が正確に計算されます。
              </div>
            </div>
          )}
        </Card>

        <Button
          className="w-full bg-[#2D4A6F] hover:bg-[#1E3A5F] h-12 text-base"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          <Save className="w-5 h-5 mr-2" />
          {saveMutation.isPending ? '保存中...' : '設定を保存する'}
        </Button>
      </div>
    </div>
  );
}