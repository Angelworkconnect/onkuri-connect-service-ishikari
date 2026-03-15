import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Save, ArrowLeft, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function CareDayUsageSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inputs, setInputs] = useState({});
  const [notes, setNotes] = useState({});

  const { data: settingsList = [] } = useQuery({
    queryKey: ['care-biz-settings'],
    queryFn: () => base44.entities.CareBusinessSettings.list(),
  });

  const { data: dayUsageList = [] } = useQuery({
    queryKey: ['care-day-usage'],
    queryFn: () => base44.entities.CareDayUsage.list(),
  });

  const settings = settingsList[0] || { capacity: 18, business_days_of_week: [1,2,3,4,5,6] };
  const bizDays = settings.business_days_of_week || [1,2,3,4,5,6];
  const capacity = settings.capacity || 18;

  useEffect(() => {
    const inputMap = {};
    const noteMap = {};
    dayUsageList.forEach(d => {
      inputMap[d.day_of_week] = d.user_count || 0;
      noteMap[d.day_of_week] = d.note || '';
    });
    setInputs(inputMap);
    setNotes(noteMap);
  }, [dayUsageList.length]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingMap = {};
      dayUsageList.forEach(d => { existingMap[d.day_of_week] = d.id; });

      for (const dow of DAY_ORDER) {
        const count = Number(inputs[dow] || 0);
        const note = notes[dow] || '';
        const data = { day_of_week: dow, user_count: count, note };
        if (existingMap[dow]) {
          await base44.entities.CareDayUsage.update(existingMap[dow], data);
        } else {
          await base44.entities.CareDayUsage.create(data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['care-day-usage']);
      toast({ title: '保存しました' });
    },
  });

  const weeklyTotal = bizDays.reduce((s, d) => s + (Number(inputs[d]) || 0), 0);
  const weeklyMax = capacity * bizDays.length;
  const weeklyAvg = bizDays.length > 0 ? (weeklyTotal / bizDays.length).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/CareBusinessDashboard" className="flex items-center gap-2 text-white/70 hover:text-white mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" />ダッシュボードへ戻る
          </Link>
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7 text-[#E8A4B8]" />
            <h1 className="text-2xl font-bold">曜日別稼働設定</h1>
          </div>
          <p className="text-white/60 text-sm mt-1">各曜日の利用人数を入力してください</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* サマリー */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '週合計枠', value: `${weeklyTotal}枠`, sub: `最大 ${weeklyMax}枠` },
            { label: '稼働率', value: `${weeklyMax > 0 ? ((weeklyTotal/weeklyMax)*100).toFixed(1) : 0}%` },
            { label: '1日平均', value: `${weeklyAvg}人` },
          ].map(({ label, value, sub }) => (
            <Card key={label} className="border-0 shadow-sm p-4 text-center">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-[#2D4A6F]">{value}</p>
              {sub && <p className="text-xs text-slate-400">{sub}</p>}
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-md overflow-hidden">
          <div className="divide-y">
            {DAY_ORDER.map(dow => {
              const isOpen = bizDays.includes(dow);
              const count = Number(inputs[dow] || 0);
              const overCapacity = count > capacity;
              return (
                <div key={dow} className={`p-4 flex items-center gap-4 ${!isOpen ? 'bg-slate-50' : ''}`}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${
                    !isOpen ? 'bg-slate-200 text-slate-400' : 'bg-[#2D4A6F] text-white'
                  }`}>
                    {DAY_LABELS[dow]}
                  </div>
                  <div className="flex-1 space-y-2">
                    {!isOpen ? (
                      <span className="text-slate-400 text-sm">定休日</span>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min="0"
                            max={capacity}
                            value={inputs[dow] ?? ''}
                            onChange={e => setInputs({ ...inputs, [dow]: e.target.value })}
                            className={`w-24 text-lg font-bold h-11 ${overCapacity ? 'border-red-400 bg-red-50' : ''}`}
                            placeholder="0"
                          />
                          <span className="text-sm text-slate-400">/ {capacity}名</span>
                          {overCapacity && <span className="text-xs text-red-500 font-medium">定員超過</span>}
                        </div>
                        {isOpen && count > 0 && (
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${count / capacity >= 0.9 ? 'bg-red-400' : count / capacity >= 0.75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(100, (count / capacity) * 100)}%` }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {isOpen && (
                    <div className="w-24">
                      <Input
                        placeholder="備考"
                        value={notes[dow] || ''}
                        onChange={e => setNotes({ ...notes, [dow]: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Button
          className="w-full bg-[#2D4A6F] hover:bg-[#1E3A5F] h-12 text-base"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="w-5 h-5 mr-2" />
          {saveMutation.isPending ? '保存中...' : '保存する'}
        </Button>
      </div>
    </div>
  );
}