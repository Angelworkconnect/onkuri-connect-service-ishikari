import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Heart, Calendar } from 'lucide-react';
import ShiftRequestCalendar from '../components/shift/ShiftRequestCalendar';
import ShiftCalendarView from '../components/shift/ShiftCalendarView';
import {
  calcYearlyIncomePrediction, calcSafetyScore, getAnnualLimit,
  getSafetyColor, getSafetyBgColor, TAX_MODE_LABELS
} from '../components/shift/taxUtils';

export default function MyShift() {
  const [user, setUser] = useState(null);
  const now = new Date();
  // デフォルト: 当月（シフト確認優先）
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async u => {
      if (!u) { base44.auth.redirectToLogin(); return; }
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) u.full_name = staffList[0].full_name;
      setUser(u);
    }).catch(() => {
      // ネットワークエラーなどの場合はログインを強制せず静かに失敗
    });
  }, []);

  const { data: allStaff = [] } = useQuery({
    queryKey: ['myshift-staff', user?.email],
    queryFn: () => base44.entities.Staff.filter({ email: user.email }),
    enabled: !!user,
  });
  const myStaff = allStaff[0] || null;

  const { data: shiftMonths = [], isLoading: shiftMonthsLoading } = useQuery({
    queryKey: ['shift-months'],
    queryFn: () => base44.entities.ShiftMonth.list('-created_date', 200),
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 10000,
  });
  const currentShiftMonth = shiftMonths.find(sm => Number(sm.year) === year && Number(sm.month) === month);

  const { data: entries = [] } = useQuery({
    queryKey: ['shift-entries', currentShiftMonth?.id],
    queryFn: () => base44.entities.ShiftEntry.filter({ shift_month_id: currentShiftMonth.id }),
    enabled: !!currentShiftMonth && !!user,
    staleTime: 0,
    refetchInterval: 10000,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-shift-requests', user?.email, year, month],
    queryFn: () => base44.entities.ShiftRequest.filter({ staff_email: user.email, year, month }),
    enabled: !!user,
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ['myshift-attendance', user?.email],
    queryFn: () => base44.entities.Attendance.filter({ user_email: user.email }),
    enabled: !!user,
  });

  const addRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftRequest.create({
      ...data, year, month,
      staff_email: user.email, staff_name: user.full_name,
      shift_month_id: currentShiftMonth?.id || '',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-shift-requests', user?.email, year, month] }),
  });

  const removeRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-shift-requests', user?.email, year, month] }),
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  // 締切チェック: 当月シフトの希望休締切は「前月の指定日」
  // request_deadlineは「YYYY-MM-DD」形式のみ有効、それ以外は前月15日をデフォルト
  const deadlineStr = currentShiftMonth?.request_deadline;
  const isValidDate = deadlineStr && /^\d{4}-\d{2}-\d{2}$/.test(deadlineStr);
  // 前月の同日付を締切とする（例: 3月シフト → 前月(2月)の指定日）
  const deadlinePrevYear = month === 1 ? year - 1 : year;
  const deadlinePrevMonth = month === 1 ? 12 : month - 1;
  const deadlineDate = isValidDate
    ? new Date(deadlineStr + 'T23:59:59')
    : new Date(deadlinePrevYear, deadlinePrevMonth - 1, 15, 23, 59);
  const isDeadlinePassed = new Date() > deadlineDate;

  // 提出可否: 管理者が明示的にfalseにした場合は提出不可
  const isSubmissionEnabled = currentShiftMonth?.request_submission_enabled ?? true;
  // 実質的にロック = 締切済み OR 提出不可
  const isLocked = isDeadlinePassed || !isSubmissionEnabled;

  // 定休曜日
  const closedDays = currentShiftMonth?.closed_days || [];

  // 今月シフト
  const myEntries = user ? entries.filter(e => e.staff_email === user.email) : [];
  const isPublished = currentShiftMonth?.status === 'PUBLISHED';

  // 管理者判定
  const isAdmin = user?.role === 'admin';



  // 勤務時間計算
  const monthHours = myEntries.reduce((sum, e) => {
    if (!e.start_time || !e.end_time) return sum + 8;
    const [sH, sM] = e.start_time.split(':').map(Number);
    const [eH, eM] = e.end_time.split(':').map(Number);
    return sum + ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
  }, 0);

  // 扶養計算
  let safetyScore = 100, predictedIncome = 0, limit = Infinity;
  if (myStaff) {
    const pred = calcYearlyIncomePrediction(myStaff, allAttendance);
    safetyScore = calcSafetyScore(myStaff, pred.predictedYearlyIncome);
    predictedIncome = pred.predictedYearlyIncome;
    limit = getAnnualLimit(myStaff);
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400">読み込み中...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-indigo-700 to-purple-800 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />シフト
          </h1>
          <p className="text-indigo-200 text-sm mt-0.5">希望休の提出・シフト確認</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 月ナビ */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={prevMonth}><ChevronLeft className="w-6 h-6 text-slate-500 hover:text-slate-800" /></button>
          <span className="text-xl font-bold text-slate-800">{year}年{month}月</span>
          <button onClick={nextMonth}><ChevronRight className="w-6 h-6 text-slate-500 hover:text-slate-800" /></button>
        </div>

        {/* サマリーカード */}
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
              <p className="text-xs text-slate-400">{TAX_MODE_LABELS[myStaff.tax_mode]}</p>
            </Card>
          ) : (
            <Card className="p-3 border-0 shadow-sm text-center">
              <p className="text-xs text-slate-400 mb-1">推定月収</p>
              <p className="text-lg font-bold text-slate-700">¥{Math.round(monthHours * ((myStaff?.hourly_wage || 1000))).toLocaleString()}</p>
            </Card>
          )}
        </div>

        {/* 扶養メーター */}
        {myStaff?.tax_mode && myStaff.tax_mode !== 'FULL' && limit < Infinity && (
          <Card className="p-4 border-0 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
              <Heart className="w-4 h-4 text-pink-500" />あなたの扶養状況
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>今年の推定収入: ¥{predictedIncome.toLocaleString()}</span>
                <span>上限: ¥{limit.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getSafetyBgColor(safetyScore)}`}
                  style={{ width: `${Math.min(100, (predictedIncome / limit) * 100)}%` }} />
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
            {!isSubmissionEnabled ? (
              <Badge className="bg-orange-100 text-orange-700">提出停止中</Badge>
            ) : isDeadlinePassed ? (
              <Badge className="bg-red-100 text-red-700">締切済み</Badge>
            ) : (
              <div className="flex flex-col items-end gap-0.5">
                <Badge className="bg-green-100 text-green-700">入力可能</Badge>
                <span className="text-xs text-slate-400">
                  締切: {currentShiftMonth?.request_deadline
                    ? currentShiftMonth.request_deadline
                    : `${year}/${String(month - 1 || 12).padStart(2, '0')}/15`}
                </span>
              </div>
            )}
          </div>
          {!isSubmissionEnabled && (
            <p className="text-xs text-orange-500 mb-3 bg-orange-50 rounded-lg px-3 py-2">
              現在、この月の希望休提出は停止されています。管理者にお問い合わせください。
            </p>
          )}
          {!isLocked && (
            <p className="text-xs text-slate-400 mb-3">タップ：休み登録　長押し：種類選択（午前休/午後休）</p>
          )}
          <ShiftRequestCalendar
            year={year} month={month}
            requests={myRequests}
            onAdd={(date, type) => addRequestMutation.mutate({ date, request_type: type })}
            onRemove={(req) => removeRequestMutation.mutate(req.id)}
            isLocked={false}
            closedDays={closedDays}
          />
          {!isLocked && myRequests.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  queryClient.invalidateQueries(['my-shift-requests']);
                  alert('希望休を提出しました。');
                }}
              >
                希望休を提出する（{myRequests.length}日）
              </Button>
            </div>
          )}
        </Card>

        {/* シフト確定セクション */}
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-800">{month}月のシフト確定</h3>
            {isPublished
              ? <Badge className="bg-green-100 text-green-700">公開済み</Badge>
              : <Badge className="bg-amber-100 text-amber-700">準備中</Badge>
            }
          </div>
          {!isPublished ? (
            <p className="text-sm text-amber-600 text-center py-3">シフトは現在準備中です。公開後にここで確認できます。</p>
          ) : (isAdmin ? entries.length === 0 : myEntries.length === 0) ? (
            <p className="text-slate-400 text-center py-3 text-sm">この月のシフトはまだ割り当てられていません</p>
          ) : (
            <ShiftCalendarView
              year={year}
              month={month}
              entries={isAdmin ? entries : myEntries}
              isAdmin={isAdmin}
              staff={isAdmin ? [] : (myStaff ? [myStaff] : [])}
            />
          )}
        </Card>
      </div>
    </div>
  );
}