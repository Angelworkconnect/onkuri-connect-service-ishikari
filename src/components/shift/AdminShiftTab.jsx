import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Sparkles, Users, Calendar, Send, Heart, Settings, Bell } from 'lucide-react';
import ShiftMonthGrid from './ShiftMonthGrid';
import StaffPiece from './StaffPiece';
import AIShiftGenerator from './AIShiftGenerator';
import HeatmapRow from './HeatmapRow';
import ShiftWarningPanel from './ShiftWarningPanel';
import FuyouOptimizeButton from './FuyouOptimizeButton';
import StaffTaxBadge from './StaffTaxBadge';
import {
  canPlaceStaff, calcYearlyIncomePrediction, calcSafetyScore,
  getAnnualLimit, getSafetyColor, getSafetyBgColor, TAX_MODE_LABELS
} from './taxUtils';

export default function AdminShiftTab({ user }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2);
  const queryClient = useQueryClient();

  const { data: allStaff = [] } = useQuery({
    queryKey: ['shift-staff'],
    queryFn: () => base44.entities.Staff.filter({ approval_status: 'approved' }),
    enabled: !!user,
  });

  const { data: shiftMonths = [] } = useQuery({
    queryKey: ['shift-months'],
    queryFn: () => base44.entities.ShiftMonth.list('-year'),
    enabled: !!user,
  });

  const currentShiftMonth = shiftMonths.find(sm => sm.year === year && sm.month === month);

  const { data: entries = [] } = useQuery({
    queryKey: ['shift-entries', year, month],
    queryFn: () => base44.entities.ShiftEntry.filter({ shift_month_id: currentShiftMonth?.id }),
    enabled: !!currentShiftMonth,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['shift-requests', year, month],
    queryFn: () => base44.entities.ShiftRequest.filter({ year, month }),
    enabled: !!user,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['shift-requirements', year, month],
    queryFn: () => currentShiftMonth
      ? base44.entities.DayRequirement.filter({ shift_month_id: currentShiftMonth.id })
      : [],
    enabled: !!currentShiftMonth,
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ['shift-attendance-year', user?.email, year],
    queryFn: () => base44.entities.Attendance.filter({ user_email: user.email }),
    enabled: !!user,
  });

  const updateMonthMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftMonth.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['shift-months']),
  });

  const createMonthMutation = useMutation({
    mutationFn: () => base44.entities.ShiftMonth.create({ year, month, status: 'DRAFT' }),
    onSuccess: () => queryClient.invalidateQueries(['shift-months']),
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftEntry.create({ ...data, shift_month_id: currentShiftMonth.id }),
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (newEntries) => {
      for (const e of newEntries) {
        await base44.entities.ShiftEntry.create({ ...e, shift_month_id: currentShiftMonth.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const deleteAllAutoMutation = useMutation({
    mutationFn: async () => {
      const autoEntries = entries.filter(e => e.auto_generated);
      for (const e of autoEntries) await base44.entities.ShiftEntry.delete(e.id);
    },
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const publishMutation = useMutation({
    mutationFn: () => base44.entities.ShiftMonth.update(currentShiftMonth.id, {
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: user.email,
    }),
    onSuccess: () => queryClient.invalidateQueries(['shift-months']),
  });

  const handleDropStaff = (staff, date) => {
    if (!currentShiftMonth) return;
    const already = entries.some(e => e.date === date && e.staff_id === staff.id);
    if (already) return;
    createEntryMutation.mutate({
      date, staff_id: staff.id, staff_email: staff.email,
      staff_name: staff.full_name, start_time: '09:00', end_time: '18:00',
      shift_type: 'FULL', auto_generated: false,
    });
  };

  const handleAIGenerate = async (newEntries) => {
    if (!currentShiftMonth) await createMonthMutation.mutateAsync();
    await deleteAllAutoMutation.mutateAsync();
    await bulkCreateMutation.mutateAsync(newEntries);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isPublished = currentShiftMonth?.status === 'PUBLISHED';

  const getStaffSafety = (staff) => {
    const thisYearAttendance = allAttendance.filter(r => r.date?.startsWith(`${year}`));
    const pred = calcYearlyIncomePrediction(staff, thisYearAttendance);
    const score = calcSafetyScore(staff, pred.predictedYearlyIncome);
    const limit = getAnnualLimit(staff);
    return { score, ...pred, limit };
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-4">
      {/* 月ナビゲーション */}
      <Card className="p-3 border-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth}><ChevronLeft className="w-5 h-5 text-slate-500 hover:text-slate-800" /></button>
            <span className="text-lg font-bold text-slate-800 min-w-[100px] text-center">{year}年{month}月</span>
            <button onClick={nextMonth}><ChevronRight className="w-5 h-5 text-slate-500 hover:text-slate-800" /></button>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={isPublished ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}>
              {isPublished ? '公開済み' : '下書き'}
            </Badge>
            <span className="text-sm text-slate-400">{entries.length}件</span>
            {!isPublished && currentShiftMonth && (
              <Button size="sm" className="bg-indigo-600" onClick={() => publishMutation.mutate()}>
                <Send className="w-3.5 h-3.5 mr-1" />シフト公開
              </Button>
            )}
          </div>
        </div>
      </Card>

      {!currentShiftMonth && (
        <Card className="p-6 text-center border-dashed border-2 border-indigo-200">
          <p className="text-slate-500 mb-3">この月のシフトはまだ作成されていません</p>
          <Button onClick={() => createMonthMutation.mutate()} className="bg-indigo-600">
            <Calendar className="w-4 h-4 mr-2" />シフト月を作成
          </Button>
        </Card>
      )}

      {currentShiftMonth && (
        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="bg-white shadow mb-4 h-auto p-1 flex-wrap">
            <TabsTrigger value="grid" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">📅 シフト表</TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">✨ AI生成</TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">👥 職員駒</TabsTrigger>
            <TabsTrigger value="fuyou" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">💕 扶養管理</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            <Card className="p-3 sm:p-4 border-0 shadow-lg space-y-3">
              <HeatmapRow days={days} year={year} month={month} entries={entries} requirements={requirements} />
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-200 rounded inline-block" />充足</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-200 rounded inline-block" />注意</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded inline-block" />不足</span>
                <span className="text-indigo-500 ml-auto text-[11px]">🔵 不足日タップで補充候補を表示</span>
              </div>
              <ShiftWarningPanel entries={entries} staff={allStaff} requirements={requirements} year={year} month={month} />
              <ShiftMonthGrid
                year={year} month={month}
                entries={entries} requirements={requirements}
                staff={allStaff} requests={requests}
                onDropStaff={handleDropStaff}
                onRemoveEntry={(e) => deleteEntryMutation.mutate(e.id)}
                isPublished={isPublished}
              />
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card className="p-4 sm:p-6 border-0 shadow-lg">
              <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />AIシフト自動生成
              </h2>
              <p className="text-sm text-slate-500 mb-4">希望休を考慮して最適なシフトを自動生成します</p>
              <AIShiftGenerator
                staff={allStaff} requests={requests} requirements={requirements}
                existingEntries={entries} year={year} month={month}
                onGenerate={handleAIGenerate}
              />
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card className="p-4 border-0 shadow-lg">
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />職員駒リスト
                <span className="text-xs text-slate-400 font-normal">カレンダーにドラッグして配置</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {allStaff.map(staff => {
                  const safety = getStaffSafety(staff);
                  const { canPlace, warnings } = canPlaceStaff(staff, new Date().toISOString().split('T')[0], entries, []);
                  return (
                    <StaffPiece key={staff.id} staff={staff} safetyScore={safety.score}
                      canPlace={canPlace} warnings={warnings} draggable={true}
                      onDragStart={(e) => e.dataTransfer.setData('staff_id', staff.id)} />
                  );
                })}
              </div>
              <div className="mt-4 flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded inline-block" />余裕</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border-2 border-yellow-400 rounded inline-block" />注意</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border-2 border-red-400 rounded inline-block" />配置不可</span>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="fuyou">
            <FuyouTab allStaff={allStaff} getStaffSafety={getStaffSafety}
              entries={entries} requirements={requirements} year={year} month={month}
              onRemoveEntry={(e) => deleteEntryMutation.mutate(e.id)}
              onDropStaff={handleDropStaff} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FuyouTab({ allStaff, getStaffSafety, entries, requirements, year, month, onRemoveEntry, onDropStaff }) {
  const managedStaff = allStaff.filter(s => s.tax_mode && s.tax_mode !== 'FULL');

  return (
    <div className="space-y-4">
      <Card className="p-4 border-0 shadow-lg">
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" />扶養・税制管理ダッシュボード
        </h2>
        <div className="mb-3">
          <FuyouOptimizeButton entries={entries} staff={allStaff} requirements={requirements}
            year={year} month={month} onRemoveEntry={onRemoveEntry} onDropStaff={onDropStaff} />
        </div>
        {managedStaff.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">扶養制限のある職員はいません</p>
        ) : (
          <div className="space-y-3">
            {managedStaff.map(staff => {
              const safety = getStaffSafety(staff);
              const remaining = Math.max(0, safety.limit - safety.predictedYearlyIncome);
              return (
                <div key={staff.id} className="bg-white rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-sm font-bold">
                        {staff.full_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-slate-800">{staff.full_name}</span>
                          <StaffTaxBadge taxMode={staff.tax_mode} />
                        </div>
                        <div className="text-xs text-slate-400">
                          予測年収 ¥{safety.predictedYearlyIncome.toLocaleString()} / 上限 ¥{safety.limit === Infinity ? '無制限' : safety.limit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${getSafetyColor(safety.score)}`}>{safety.score}%</div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${getSafetyBgColor(safety.score)}`}
                      style={{ width: `${Math.min(100, (safety.predictedYearlyIncome / safety.limit) * 100)}%` }} />
                  </div>
                  {safety.limit < Infinity && (
                    <div className="text-xs text-slate-500 mt-1">あと ¥{remaining.toLocaleString()} まで働けます</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <h3 className="text-sm font-bold text-slate-600 mb-2">全スタッフ一覧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allStaff.map(staff => {
              const safety = getStaffSafety(staff);
              return (
                <div key={staff.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                  <span className="text-sm font-medium text-slate-700 flex-1 truncate">{staff.full_name}</span>
                  <StaffTaxBadge taxMode={staff.tax_mode} />
                  {staff.tax_mode !== 'FULL' && (
                    <span className={`text-xs font-bold ${getSafetyColor(safety.score)}`}>{safety.score}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}