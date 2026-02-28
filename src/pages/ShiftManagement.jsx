import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, ChevronRight, Sparkles, Users, Calendar,
  CheckCircle2, AlertTriangle, Send, RotateCcw, Heart
} from 'lucide-react';
import { format } from 'date-fns';
import ShiftMonthGrid from '../components/shift/ShiftMonthGrid';
import StaffPiece from '../components/shift/StaffPiece';
import AIShiftGenerator from '../components/shift/AIShiftGenerator';
import HeatmapRow from '../components/shift/HeatmapRow';
import StaffTaxBadge from '../components/shift/StaffTaxBadge';
import ShiftRequestCalendarComponent from '../components/shift/ShiftRequestCalendar';
import {
  canPlaceStaff, calcYearlyIncomePrediction, calcSafetyScore,
  getAnnualLimit, getSafetyColor, getSafetyBgColor, TAX_MODE_LABELS
} from '../components/shift/taxUtils';
import ShiftWarningPanel from '../components/shift/ShiftWarningPanel';
import FuyouOptimizeButton from '../components/shift/FuyouOptimizeButton';

export default function ShiftManagement() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2);
  const [draggingStaff, setDraggingStaff] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async u => {
      if (!u) return;
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        if (staffList[0].role === 'admin') setIsAdmin(true);
      }
      if (u.role === 'admin') setIsAdmin(true);
      setUser(u);
    }).catch(() => {});
  }, []);

  // データフェッチ
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

  // ミューテーション
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

  const bulkCreateEntriesMutation = useMutation({
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
    if (!currentShiftMonth) {
      await createMonthMutation.mutateAsync();
    }
    await deleteAllAutoMutation.mutateAsync();
    await bulkCreateEntriesMutation.mutateAsync(newEntries);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isPublished = currentShiftMonth?.status === 'PUBLISHED';
  const isDeadlinePassed = new Date() > new Date(year, month - 2, 15, 23, 59);

  const getStaffSafety = (staff) => {
    const thisYearAttendance = allAttendance.filter(r => r.date?.startsWith(`${year}`));
    const pred = calcYearlyIncomePrediction(staff, thisYearAttendance);
    const score = calcSafetyScore(staff, pred.predictedYearlyIncome);
    const limit = getAnnualLimit(staff);
    return { score, ...pred, limit };
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">読み込み中...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-indigo-700 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                シフト管理
              </h1>
              <p className="text-indigo-200 text-sm mt-0.5">ONKURI SHIFT AI</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}>
                <ChevronLeft className="w-6 h-6 text-white/70 hover:text-white" />
              </button>
              <span className="text-xl font-bold min-w-[120px] text-center">{year}年{month}月</span>
              <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}>
                <ChevronRight className="w-6 h-6 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>

          {/* ステータス */}
          <div className="flex items-center gap-3 mt-4">
            <Badge className={isPublished ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}>
              {isPublished ? '公開済み' : '下書き'}
            </Badge>
            <span className="text-sm text-indigo-200">{entries.length}件のシフト</span>
            {isAdmin && !isPublished && currentShiftMonth && (
              <Button
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white ml-auto"
                onClick={() => publishMutation.mutate()}
              >
                <Send className="w-4 h-4 mr-1" />
                シフト公開
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-2">
        {isAdmin ? (
          <AdminView
            year={year} month={month} days={days}
            allStaff={allStaff} entries={entries} requests={requests}
            requirements={requirements} currentShiftMonth={currentShiftMonth}
            isPublished={isPublished}
            onDropStaff={handleDropStaff}
            onRemoveEntry={(e) => deleteEntryMutation.mutate(e.id)}
            onAIGenerate={handleAIGenerate}
            onCreateMonth={() => createMonthMutation.mutate()}
            getStaffSafety={getStaffSafety}
            draggingStaff={draggingStaff}
            setDraggingStaff={setDraggingStaff}
          />
        ) : (
          <StaffView
            user={user} year={year} month={month}
            entries={entries} requests={requests}
            currentShiftMonth={currentShiftMonth}
            isDeadlinePassed={isDeadlinePassed}
            allAttendance={allAttendance}
            allStaff={allStaff}
          />
        )}
      </div>
    </div>
  );
}

// ========== 管理者ビュー ==========
function AdminView({ year, month, days, allStaff, entries, requests, requirements, currentShiftMonth,
  isPublished, onDropStaff, onRemoveEntry, onAIGenerate, onCreateMonth, getStaffSafety, draggingStaff, setDraggingStaff }) {

  return (
    <div className="space-y-4 py-4">
      {!currentShiftMonth && (
        <Card className="p-6 text-center border-dashed border-2 border-indigo-200">
          <p className="text-slate-500 mb-3">この月のシフトはまだ作成されていません</p>
          <Button onClick={onCreateMonth} className="bg-indigo-600">
            <Calendar className="w-4 h-4 mr-2" />
            シフト月を作成
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

          {/* シフト表 */}
          <TabsContent value="grid">
            <Card className="p-3 sm:p-4 border-0 shadow-lg space-y-3">
              <HeatmapRow days={days} year={year} month={month} entries={entries} requirements={requirements} />
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-200 rounded inline-block" />充足</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-200 rounded inline-block" />注意</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded inline-block" />不足</span>
                <span className="text-indigo-500 ml-auto text-[11px]">🔵 不足日タップで補充候補を表示</span>
              </div>
              <ShiftWarningPanel
                entries={entries} staff={allStaff} requirements={requirements}
                year={year} month={month}
              />
              <ShiftMonthGrid
                year={year} month={month}
                entries={entries} requirements={requirements}
                staff={allStaff} requests={requests}
                onDropStaff={onDropStaff}
                onRemoveEntry={onRemoveEntry}
                isPublished={isPublished}
              />
            </Card>
          </TabsContent>

          {/* AI生成 */}
          <TabsContent value="ai">
            <Card className="p-4 sm:p-6 border-0 shadow-lg">
              <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AIシフト自動生成
              </h2>
              <p className="text-sm text-slate-500 mb-4">希望休を考慮して最適なシフトを自動生成します</p>
              <AIShiftGenerator
                staff={allStaff} requests={requests} requirements={requirements}
                existingEntries={entries} year={year} month={month}
                onGenerate={onAIGenerate}
              />
            </Card>
          </TabsContent>

          {/* 職員駒 */}
          <TabsContent value="staff">
            <Card className="p-4 border-0 shadow-lg">
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                職員駒リスト
                <span className="text-xs text-slate-400 font-normal">カレンダーにドラッグして配置</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {allStaff.map(staff => {
                  const safety = getStaffSafety(staff);
                  const monthEntries = entries.filter(e => e.staff_id === staff.id);
                  const { canPlace, warnings } = canPlaceStaff(staff, new Date().toISOString().split('T')[0], entries, []);
                  return (
                    <StaffPiece
                      key={staff.id}
                      staff={staff}
                      safetyScore={safety.score}
                      canPlace={canPlace}
                      warnings={warnings}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('staff_id', staff.id);
                      }}
                    />
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

          {/* 扶養管理 */}
          <TabsContent value="fuyou">
            <FuyouDashboard
              allStaff={allStaff} getStaffSafety={getStaffSafety}
              entries={entries} requirements={requirements}
              year={year} month={month}
              onRemoveEntry={onRemoveEntry} onDropStaff={onDropStaff}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ========== 扶養ダッシュボード ==========
function FuyouDashboard({ allStaff, getStaffSafety, entries, requirements, year, month, onRemoveEntry, onDropStaff }) {
  const managedStaff = allStaff.filter(s => s.tax_mode && s.tax_mode !== 'FULL');

  return (
    <div className="space-y-4 py-2">
      <Card className="p-4 border-0 shadow-lg">
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" />
          扶養・税制管理ダッシュボード
        </h2>

        <div className="mb-3">
          <FuyouOptimizeButton
            entries={entries} staff={allStaff} requirements={requirements}
            year={year} month={month}
            onRemoveEntry={onRemoveEntry} onDropStaff={onDropStaff}
          />
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
                    <div className={`text-lg font-bold ${getSafetyColor(safety.score)}`}>
                      {safety.score}%
                    </div>
                  </div>

                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getSafetyBgColor(safety.score)}`}
                      style={{ width: `${Math.min(100, (safety.predictedYearlyIncome / safety.limit) * 100)}%` }}
                    />
                  </div>

                  {safety.limit < Infinity && (
                    <div className="text-xs text-slate-500 mt-1">
                      あと ¥{remaining.toLocaleString()} まで働けます
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 全スタッフ概要 */}
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

// ========== 職員ビュー ==========
function StaffView({ user, year, month, entries, requests, currentShiftMonth, isDeadlinePassed, allAttendance, allStaff }) {
  const queryClient = useQueryClient();
  const myStaff = allStaff.find(s => s.email === user.email);

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-shift-requests', user.email, year, month],
    queryFn: () => base44.entities.ShiftRequest.filter({ staff_email: user.email, year, month }),
    enabled: !!user,
  });

  const addRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftRequest.create({
      ...data, year, month,
      staff_email: user.email, staff_name: user.full_name,
      shift_month_id: currentShiftMonth?.id || '',
    }),
    onSuccess: () => queryClient.invalidateQueries(['my-shift-requests']),
  });

  const removeRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['my-shift-requests']),
  });

  const myEntries = entries.filter(e => e.staff_email === user.email);
  const thisYearAttendance = allAttendance.filter(r => r.date?.startsWith(`${year}`));

  let safetyScore = 100, predictedIncome = 0, limit = Infinity;
  if (myStaff) {
    const pred = calcYearlyIncomePrediction(myStaff, thisYearAttendance);
    safetyScore = calcSafetyScore(myStaff, pred.predictedYearlyIncome);
    predictedIncome = pred.predictedYearlyIncome;
    limit = getAnnualLimit(myStaff);
  }

  // 今月の勤務時間
  const thisMonthEntries = myEntries;
  const monthHours = thisMonthEntries.reduce((sum, e) => {
    if (!e.start_time || !e.end_time) return sum + 8;
    const [sH, sM] = e.start_time.split(':').map(Number);
    const [eH, eM] = e.end_time.split(':').map(Number);
    return sum + ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
  }, 0);

  return (
    <div className="space-y-4 py-4">
      {/* 自分の状況カード */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border-0 shadow-sm text-center">
          <p className="text-xs text-slate-400 mb-1">今月の勤務</p>
          <p className="text-xl font-bold text-indigo-600">{myEntries.length}日</p>
          <p className="text-xs text-slate-400">{Math.round(monthHours)}時間</p>
        </Card>
        <Card className="p-3 border-0 shadow-sm text-center">
          <p className="text-xs text-slate-400 mb-1">希望休</p>
          <p className="text-xl font-bold text-orange-500">{myRequests.length}日</p>
        </Card>
        {myStaff?.tax_mode && myStaff.tax_mode !== 'FULL' ? (
          <Card className="p-3 border-0 shadow-sm text-center">
            <p className="text-xs text-slate-400 mb-1">扶養安全度</p>
            <p className={`text-xl font-bold ${getSafetyColor(safetyScore)}`}>{safetyScore}%</p>
            <p className="text-xs text-slate-400">{myStaff ? TAX_MODE_LABELS[myStaff.tax_mode] : ''}</p>
          </Card>
        ) : (
          <Card className="p-3 border-0 shadow-sm text-center">
            <p className="text-xs text-slate-400 mb-1">推定月収</p>
            <p className="text-lg font-bold text-slate-700">¥{Math.round(monthHours * ((myStaff?.hourly_wage || 1000))).toLocaleString()}</p>
          </Card>
        )}
      </div>

      {/* 扶養メーター（対象者のみ） */}
      {myStaff?.tax_mode && myStaff.tax_mode !== 'FULL' && limit < Infinity && (
        <Card className="p-4 border-0 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
            <Heart className="w-4 h-4 text-pink-500" />
            あなたの扶養状況
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>今年の推定収入: ¥{predictedIncome.toLocaleString()}</span>
              <span>上限: ¥{limit.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getSafetyBgColor(safetyScore)}`}
                style={{ width: `${Math.min(100, (predictedIncome / limit) * 100)}%` }}
              />
            </div>
            <p className={`text-sm font-medium ${getSafetyColor(safetyScore)}`}>
              あと ¥{Math.max(0, limit - predictedIncome).toLocaleString()} まで働けます
            </p>
          </div>
        </Card>
      )}

      {/* 希望休入力 */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800">希望休入力</h3>
          {isDeadlinePassed ? (
            <Badge className="bg-red-100 text-red-700">締切済み</Badge>
          ) : (
            <Badge className="bg-green-100 text-green-700">入力可</Badge>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-3">タップ：休み登録　長押し：種類選択</p>

        <ShiftRequestCalendarLazy
          year={year} month={month}
          requests={myRequests}
          onAdd={(date, type) => addRequestMutation.mutate({ date, request_type: type })}
          onRemove={(req) => removeRequestMutation.mutate(req.id)}
          isLocked={isDeadlinePassed}
        />
      </Card>

      {/* 自分のシフト確認 */}
      {myEntries.length > 0 && (
        <Card className="p-4 border-0 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-3">
            {month}月のシフト（{myEntries.length}日）
          </h3>
          <div className="space-y-1.5">
            {myEntries.sort((a, b) => a.date.localeCompare(b.date)).map((entry, i) => {
              const d = new Date(entry.date);
              const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${isWeekend ? 'bg-blue-50' : 'bg-slate-50'}`}>
                  <span className={`text-sm font-bold w-14 ${d.getDay() === 0 ? 'text-red-600' : d.getDay() === 6 ? 'text-blue-600' : 'text-slate-600'}`}>
                    {month}/{d.getDate()}({dow})
                  </span>
                  <span className="text-sm text-slate-600">{entry.start_time}〜{entry.end_time}</span>
                  {entry.auto_generated && <Badge className="text-[10px] bg-purple-100 text-purple-600 ml-auto">AI</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// 直接インポートに変更（上部にインポートを追加する必要があります）
function ShiftRequestCalendarLazy(props) {
  return <ShiftRequestCalendarComponent {...props} />;
}