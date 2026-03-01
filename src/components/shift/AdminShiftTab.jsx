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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, Sparkles, Users, Calendar, Send, Heart, Settings, Bell, Clock, FileText } from 'lucide-react';
import ShiftMonthGrid from './ShiftMonthGrid';
import StaffPiece from './StaffPiece';
import AIShiftGenerator from './AIShiftGenerator';
import HeatmapRow from './HeatmapRow';
import ShiftWarningPanel from './ShiftWarningPanel';
import FuyouOptimizeButton from './FuyouOptimizeButton';
import StaffTaxBadge from './StaffTaxBadge';
import ShiftLegend from './ShiftLegend';
import StaffOffDaysPanel from './StaffOffDaysPanel';
import PublicShiftCalendar from './PublicShiftCalendar';
import {
  canPlaceStaff, calcYearlyIncomePrediction, calcSafetyScore,
  getAnnualLimit, getSafetyColor, getSafetyBgColor, TAX_MODE_LABELS
} from './taxUtils';

export default function AdminShiftTab({ user }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2);
  // deadline表示: YYYY-MM-DD形式で保存、入力はDD（日のみ）で受け付け前月の日付に変換
  const [deadlineInput, setDeadlineInput] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [previewStaffEmail, setPreviewStaffEmail] = useState('');
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [previewSheetStaff, setPreviewSheetStaff] = useState(null);
  const queryClient = useQueryClient();

  const { data: allStaff = [] } = useQuery({
    queryKey: ['shift-staff'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: !!user,
    staleTime: 60000,
  });

  const { data: shiftMonths = [] } = useQuery({
    queryKey: ['shift-months'],
    queryFn: () => base44.entities.ShiftMonth.list('-year'),
    enabled: !!user,
    staleTime: 30000,
  });

  const currentShiftMonth = shiftMonths.find(sm => sm.year === year && sm.month === month);

  const { data: entries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['shift-entries', year, month],
    queryFn: () => base44.entities.ShiftEntry.filter({ shift_month_id: currentShiftMonth?.id }),
    enabled: !!currentShiftMonth,
    staleTime: 0,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['shift-requests', year, month],
    queryFn: () => base44.entities.ShiftRequest.filter({ year, month }),
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['shift-requirements', year, month],
    queryFn: () => currentShiftMonth
      ? base44.entities.DayRequirement.filter({ shift_month_id: currentShiftMonth.id })
      : [],
    enabled: !!currentShiftMonth,
    staleTime: 10000,
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ['shift-attendance-year', user?.email, year],
    queryFn: () => base44.entities.Attendance.filter({ user_email: user.email }),
    enabled: !!user,
    staleTime: 120000,
  });

  const updateMonthMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftMonth.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-months'] });
      queryClient.refetchQueries({ queryKey: ['shift-months'] });
    },
  });

  const createMonthMutation = useMutation({
    mutationFn: () => base44.entities.ShiftMonth.create({ year, month, status: 'DRAFT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-months'] }),
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftEntry.create({ ...data, shift_month_id: currentShiftMonth.id }),
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftEntry.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-entries', year, month] }),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (newEntries) => {
      for (const e of newEntries) {
        await base44.entities.ShiftEntry.create({ ...e, shift_month_id: currentShiftMonth.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const upsertRequirementMutation = useMutation({
    mutationFn: async ({ date, required_total }) => {
      const existing = requirements.find(r => r.date === date);
      if (existing) {
        return base44.entities.DayRequirement.update(existing.id, { required_total });
      } else {
        return base44.entities.DayRequirement.create({ shift_month_id: currentShiftMonth.id, date, required_total });
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['shift-requirements', year, month]),
  });

  const deleteAllAutoMutation = useMutation({
    mutationFn: async () => {
      const autoEntries = entries.filter(e => e.auto_generated);
      for (const e of autoEntries) await base44.entities.ShiftEntry.delete(e.id);
    },
    onSuccess: () => queryClient.invalidateQueries(['shift-entries', year, month]),
  });

  const updateStaffOffDaysMutation = useMutation({
    mutationFn: (staffData) => base44.entities.Staff.update(staffData.id, {
      hard_off_days: staffData.hard_off_days,
      custom_off_dates: staffData.custom_off_dates,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-staff'] });
      queryClient.refetchQueries({ queryKey: ['shift-staff'] });
      setSelectedStaff(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => base44.entities.ShiftMonth.update(currentShiftMonth.id, {
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: user.email,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-months'] });
      queryClient.invalidateQueries({ queryKey: ['shift-entries', year, month] });
      queryClient.refetchQueries({ queryKey: ['shift-months'] });
      queryClient.refetchQueries({ queryKey: ['shift-entries', year, month] });
    },
  });

  const handleDropStaff = async (staff, date) => {
    if (!currentShiftMonth) return;
    const already = entries.some(e => e.date === date && e.staff_id === staff.id);
    if (already) return;
    
    // シートが開いている場合は、補充後に即座に表示を更新
    if (previewSheetOpen && previewSheetStaff?.id === staff.id) {
      createEntryMutation.mutate({
        date, staff_id: staff.id, staff_email: staff.email,
        staff_name: staff.full_name, start_time: '09:00', end_time: '18:00',
        shift_type: 'FULL', auto_generated: false,
      }, {
        onSuccess: () => {
          // シートのデータを更新するため、previewSheetStaffを即座に更新
          queryClient.invalidateQueries(['shift-entries', year, month]);
          // 少し待ってからクエリ結果を反映させる
          setTimeout(() => {
            queryClient.refetchQueries(['shift-entries', year, month]);
          }, 50);
        }
      });
    } else {
      createEntryMutation.mutate({
        date, staff_id: staff.id, staff_email: staff.email,
        staff_name: staff.full_name, start_time: '09:00', end_time: '18:00',
        shift_type: 'FULL', auto_generated: false,
      });
    }
  };

  const handleAIGenerate = async (newEntries) => {
    if (!currentShiftMonth) await createMonthMutation.mutateAsync();
    await deleteAllAutoMutation.mutateAsync();
    await bulkCreateMutation.mutateAsync(newEntries);
  };

  const handleOpenNotesDialog = () => {
    setTempNotes(currentShiftMonth?.notes || '');
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (currentShiftMonth?.id) {
      updateMonthMutation.mutate({
        id: currentShiftMonth.id,
        data: { notes: tempNotes }
      });
      setNotesDialogOpen(false);
    }
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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={isPublished ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}>
              {isPublished ? '公開済み' : '下書き'}
            </Badge>
            <span className="text-sm text-slate-400">{entries.length}件</span>
            {currentShiftMonth && (
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-500 whitespace-nowrap">毎月締切日:</Label>
                <Input
                  type="text"
                  className="h-7 text-xs w-24"
                  placeholder="15または15日"
                  value={deadlineInput}
                  onChange={(e) => {
                    setDeadlineInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentShiftMonth?.id && deadlineInput) {
                      const numStr = deadlineInput.replace(/\D/g, '');
                      if (numStr) {
                        const day = parseInt(numStr, 10);
                        if (day >= 1 && day <= 31) {
                          // 前月のYYYY-MM-DD形式で保存
                          const prevY = month === 1 ? year - 1 : year;
                          const prevM = month === 1 ? 12 : month - 1;
                          const dateStr = `${prevY}-${String(prevM).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                          updateMonthMutation.mutate({ id: currentShiftMonth.id, data: { request_deadline: dateStr } });
                        }
                      }
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    if (currentShiftMonth?.id && deadlineInput) {
                      const numStr = deadlineInput.replace(/\D/g, '');
                      if (numStr) {
                        const day = parseInt(numStr, 10);
                        if (day >= 1 && day <= 31) {
                          // 前月のYYYY-MM-DD形式で保存
                          const prevY = month === 1 ? year - 1 : year;
                          const prevM = month === 1 ? 12 : month - 1;
                          const dateStr = `${prevY}-${String(prevM).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                          updateMonthMutation.mutate({ id: currentShiftMonth.id, data: { request_deadline: dateStr } });
                        }
                      }
                    }
                  }}
                  disabled={updateMonthMutation.isPending}
                >
                  {updateMonthMutation.isPending ? '保存中...' : '保存'}
                </Button>
              </div>
            )}
            {currentShiftMonth && (
              <button
                onClick={() => updateMonthMutation.mutate({
                  id: currentShiftMonth.id,
                  data: { request_submission_enabled: !(currentShiftMonth.request_submission_enabled ?? true) }
                })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  (currentShiftMonth.request_submission_enabled ?? true)
                    ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 border-red-400 text-red-700 hover:bg-red-200'
                }`}
                title="希望休提出の可否を切り替え"
              >
                <span>{(currentShiftMonth.request_submission_enabled ?? true) ? '✅' : '🚫'}</span>
                提出{(currentShiftMonth.request_submission_enabled ?? true) ? '可能' : '不可'}
              </button>
            )}
            {currentShiftMonth && (
              <button
                onClick={() => {
                  const dowLabels = ['日', '月', '火', '水', '木', '金', '土'];
                  const newClosedDays = [...(currentShiftMonth.closed_days || [])];
                  const dowToToggle = parseInt(prompt(`定休日を設定します (0=日曜, 1=月曜, 2=火曜, 3=水曜, 4=木曜, 5=金曜, 6=土曜)\n現在の定休日: ${newClosedDays.map(d => dowLabels[d]).join(', ') || 'なし'}\n\n変更する曜日番号を入力してください:`));
                  if (!isNaN(dowToToggle) && dowToToggle >= 0 && dowToToggle <= 6) {
                    const idx = newClosedDays.indexOf(dowToToggle);
                    if (idx >= 0) {
                      newClosedDays.splice(idx, 1);
                    } else {
                      newClosedDays.push(dowToToggle);
                    }
                    updateMonthMutation.mutate({ id: currentShiftMonth.id, data: { closed_days: newClosedDays } });
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                title="事業所全体の定休日を設定"
              >
                🏪 定休日設定
              </button>
            )}
            {currentShiftMonth && (
              <Button size="sm" variant="outline" onClick={handleOpenNotesDialog}>
                <FileText className="w-3.5 h-3.5 mr-1" />特記事項
              </Button>
            )}
            {!isPublished && currentShiftMonth && (
              <Button size="sm" className="bg-indigo-600" onClick={() => setPublishConfirmOpen(true)}>
                <Send className="w-3.5 h-3.5 mr-1" />シフト公開
              </Button>
            )}
            {isPublished && currentShiftMonth && (
              <Button size="sm" variant="outline" onClick={() => updateMonthMutation.mutate({ id: currentShiftMonth.id, data: { status: 'DRAFT' } })}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />下書きに戻す
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
            <TabsTrigger value="preview" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">👁️ プレビュー</TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">🗓️ 希望休</TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">✨ AI生成</TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">👥 職員駒</TabsTrigger>
            <TabsTrigger value="offdays" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">🚫 休み設定</TabsTrigger>
            <TabsTrigger value="fuyou" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">💕 扶養管理</TabsTrigger>
            <TabsTrigger value="legend" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">📋 凡例</TabsTrigger>
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
              <ShiftMonthGrid
                year={year} month={month}
                entries={entries} requirements={requirements}
                staff={allStaff} requests={requests}
                onDropStaff={handleDropStaff}
                onRemoveEntry={(e) => deleteEntryMutation.mutate(e.id)}
                onUpdateEntry={(id, data) => updateEntryMutation.mutate({ id, data })}
                isPublished={isPublished}
                onUpdateRequirement={(date, required_total) => upsertRequirementMutation.mutate({ date, required_total })}
                closedDays={currentShiftMonth?.closed_days || []}
              />
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card className="p-4 border-0 shadow-lg space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-4">👁️ 職員ビュー プレビュー</h2>
                <p className="text-sm text-slate-600 mb-4">職員をクリックして詳細を確認</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-6">
                  {allStaff.map(staff => (
                    <button
                      key={staff.id}
                      onClick={() => {
                        setPreviewSheetStaff(staff);
                        setPreviewStaffEmail(staff.email);
                        setPreviewSheetOpen(true);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        previewStaffEmail === staff.email
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-800 truncate">{staff.full_name}</div>
                    </button>
                  ))}
                </div>
                {previewStaffEmail && (
                  <PublicShiftCalendar
                    entries={entries}
                    requirements={requirements}
                    year={year}
                    month={month}
                    currentUserEmail={previewStaffEmail}
                    notes={currentShiftMonth?.notes || ''}
                    closedDays={currentShiftMonth?.closed_days || []}
                    staff={allStaff}
                  />
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="p-4 border-0 shadow-lg">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />希望休一覧
                <span className="text-xs text-slate-400 font-normal">({requests.length}件)</span>
              </h2>
              {requests.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">希望休の申請がありません</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((req) => {
                    const requestDate = new Date(req.date);
                    const dow = ['日','月','火','水','木','金','土'][requestDate.getDay()];
                    const typeLabel = {
                      'OFF': '全日',
                      'AM_OFF': '午前',
                      'PM_OFF': '午後',
                      'PREFER_WORK': '希望勤務'
                    }[req.request_type];
                    const typeBgColor = {
                      'OFF': 'bg-red-100 text-red-800',
                      'AM_OFF': 'bg-amber-100 text-amber-800',
                      'PM_OFF': 'bg-blue-100 text-blue-800',
                      'PREFER_WORK': 'bg-green-100 text-green-800'
                    }[req.request_type];
                    return (
                      <div key={req.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-800">{req.staff_name}</span>
                            <span className="text-xs text-slate-500">({req.staff_email})</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600">{req.date} ({dow})</span>
                            <Badge className={`text-xs ${typeBgColor}`}>{typeLabel}</Badge>
                          </div>
                          {req.reason && (
                            <div className="text-xs text-slate-500 mt-1">理由: {req.reason}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

          <TabsContent value="offdays">
            <Card className="p-4 border-0 shadow-lg">
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                🚫 職員の休み日設定
              </h2>
              {selectedStaff ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">{selectedStaff.full_name}</h3>
                    <Button size="sm" variant="outline" onClick={() => setSelectedStaff(null)}>戻る</Button>
                  </div>
                  <StaffOffDaysPanel
                    staff={selectedStaff}
                    onUpdate={(updated) => setSelectedStaff(updated)}
                  />
                  <div className="text-xs text-slate-500 mb-2">
                    選択後、「保存」ボタンを押してください
                  </div>
                  <Button 
                    className="w-full bg-rose-600 hover:bg-rose-700"
                    onClick={() => {
                      updateStaffOffDaysMutation.mutate(selectedStaff);
                    }}
                    disabled={updateStaffOffDaysMutation.isPending}
                  >
                    {updateStaffOffDaysMutation.isPending ? '保存中...' : '休み設定を保存'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {allStaff.map(staff => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className="text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-800 truncate">{staff.full_name}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {(staff.hard_off_days || []).length > 0 && (
                          <div>固定休: {['日','月','火','水','木','金','土'].filter((_, i) => (staff.hard_off_days || []).includes(i)).join('・')}</div>
                        )}
                        {(staff.custom_off_dates || []).length > 0 && (
                          <div>カスタム: {(staff.custom_off_dates || []).length}件</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="fuyou">
            <FuyouTab allStaff={allStaff} getStaffSafety={getStaffSafety}
              entries={entries} requirements={requirements} year={year} month={month}
              onRemoveEntry={(e) => deleteEntryMutation.mutate(e.id)}
              onDropStaff={handleDropStaff} />
          </TabsContent>

          <TabsContent value="legend">
            <ShiftLegend />
          </TabsContent>
          </Tabs>
          )}

          {/* 公開確認ダイアログ */}
          <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>シフトを公開しますか？</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-slate-600">
              {year}年{month}月のシフトを公開すると、職員に表示されます。公開後は下書き状態に戻すことができます。
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900">公開前のチェックリスト</p>
              <ul className="text-xs text-blue-800 mt-1 space-y-1">
                <li>✓ 全てのシフトが確定しましたか？</li>
                <li>✓ 必要人数が充足していますか？</li>
                <li>✓ 特記事項は入力されていますか？</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={() => { publishMutation.mutate(); setPublishConfirmOpen(false); }} className="bg-green-600 hover:bg-green-700">
              公開する
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>

          {/* プレビュー職員詳細シート */}
          <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
            <SheetContent side="right" className="w-full sm:w-96">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                    {previewSheetStaff?.full_name?.[0]}
                  </div>
                  {previewSheetStaff?.full_name}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-3">シフト予定</p>
                  <div className="space-y-2">
                    {entries
                      .filter(e => e.staff_id === previewSheetStaff?.id)
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((entry) => {
                        const d = new Date(entry.date);
                        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                        const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
                        return (
                          <div key={entry.id} className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                            <div className="font-medium text-indigo-900 text-sm">{dateStr} ({dayLabels[d.getDay()]})</div>
                            <div className="text-xs text-indigo-700 mt-1">{entry.start_time}～{entry.end_time}</div>
                          </div>
                        );
                      })}
                    {entries.filter(e => e.staff_id === previewSheetStaff?.id).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">シフトなし</p>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* 特記事項編集ダイアログ */}
          <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{year}年{month}月 特記事項編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="特記事項を入力（例：3日体験1名、イベント開催など）"
              className="h-32"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveNotes} className="bg-indigo-600">
              保存
            </Button>
          </DialogFooter>
          </DialogContent>
          </Dialog>
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