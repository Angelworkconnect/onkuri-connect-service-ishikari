import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { Save, ArrowLeft, Settings } from 'lucide-react';
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
};

export default function CareSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [existingId, setExistingId] = useState(null);

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
            <div>
              <Label className="text-sm font-medium">固定費（月額・円）</Label>
              <Input className="mt-1" type="number" value={form.fixed_cost} onChange={e => setForm({ ...form, fixed_cost: Number(e.target.value) })} />
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

          <Button
            className="w-full bg-[#2D4A6F] hover:bg-[#1E3A5F] h-12 text-base"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            <Save className="w-5 h-5 mr-2" />
            {saveMutation.isPending ? '保存中...' : '設定を保存する'}
          </Button>
        </Card>
      </div>
    </div>
  );
}