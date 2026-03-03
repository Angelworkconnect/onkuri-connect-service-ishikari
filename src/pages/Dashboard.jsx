import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, Clock, Users, FileText, 
  ChevronRight, Bell, CheckCircle2, Megaphone, Pencil, X
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatsCard from "@/components/dashboard/StatsCard";
import PublicShiftCalendar from "@/components/shift/PublicShiftCalendar";
import AnnouncementCard from "@/components/dashboard/AnnouncementCard";
import ShiftCard from "@/components/shifts/ShiftCard";
import ClockInOut from "@/components/attendance/ClockInOut";
import QRScanner from "@/components/attendance/QRScanner";
import InfoSection from "@/components/dashboard/InfoSection";
import TipBenefitSection from "@/components/dashboard/TipBenefitSection";
import DiceGameCard from "@/components/dashboard/DiceGameCard";
import HelpCallSection from "@/components/dashboard/HelpCallSection";

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

function DashboardShiftCalendar({ year, month, entries, showAllStaff = false }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const today = format(new Date(), 'yyyy-MM-dd');

  const entryMap = {};
  entries.forEach(e => {
    const d = new Date(e.date + 'T00:00:00').getDate();
    if (!entryMap[d]) entryMap[d] = [];
    entryMap[d].push(e);
  });

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-0.5">
        {DOW.map((d, i) => (
          <div key={d} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}>{d}</div>
        ))}
      </div>
      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-0 border border-slate-200 rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          const dow = idx % 7;
          const isSun = dow === 0;
          const isSat = dow === 6;
          const dayEntries = day ? (entryMap[day] || []) : [];
          const hasShift = dayEntries.length > 0;
          const dateStr = day ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
          const isToday = dateStr === today;

          return (
            <div
              key={idx}
              className={`min-h-[52px] p-1 flex flex-col items-center border-r border-b border-slate-200 last:border-r-0
                ${idx % 7 === 6 ? 'border-r-0' : 'border-r'} ${Math.floor(idx / 7) === Math.ceil((firstDow + daysInMonth) / 7) - 1 ? 'border-b-0' : 'border-b'}
                ${!day ? 'bg-slate-50' : isSun ? 'bg-red-50' : isSat ? 'bg-blue-50' : hasShift ? 'bg-indigo-50' : 'bg-white'}`}
            >
              {day && (
                <>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-0.5
                    ${isToday ? 'bg-indigo-600 text-white' : isSun ? 'text-red-500' : isSat ? 'text-blue-500' : hasShift ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {day}
                  </div>
                  {dayEntries.map((e, i) => (
                    <div key={i} className="w-full bg-indigo-500 text-white rounded px-0.5 py-0.5 leading-tight mb-0.5 text-center" style={{ fontSize: '9px' }}>
                      {showAllStaff && e.staff_name && <div className="font-semibold truncate">{e.staff_name}</div>}
                      {e.start_time && e.end_time ? `${e.start_time}〜${e.end_time}` : '勤務'}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* 凡例 */}
      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500 inline-block"></span>勤務あり</span>
        <span className="flex items-center gap-1"><span className="w-5 h-5 rounded-full bg-indigo-600 inline-flex items-center justify-center text-white" style={{fontSize:'8px'}}>今</span>今日</span>
      </div>

      {/* 特記事項一覧 */}
      {entries.some(e => e.notes && String(e.notes).trim()) && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-bold text-slate-700 mb-3">📝 特記事項</h4>
          <div className="space-y-2">
            {Object.entries(
              entries.reduce((acc, e) => {
                if (e.notes && String(e.notes).trim()) {
                  const dateStr = e.date;
                  if (!acc[dateStr]) acc[dateStr] = [];
                  acc[dateStr].push(e);
                }
                return acc;
              }, {})
            ).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, dayEntries]) => (
              <div key={date} className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-400">
                <p className="text-xs font-semibold text-slate-700 mb-1">
                  {new Date(date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                </p>
                <div className="text-sm text-slate-700 space-y-1">
                  {dayEntries.map((e, i) => (
                    <div key={i} className="text-xs">
                      {showAllStaff && e.staff_name && <span className="font-medium">{e.staff_name}: </span>}{e.notes}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [myStaff, setMyStaff] = useState(null);
  const [shiftView, setShiftView] = useState('mine'); // 'mine' | 'all'
  const [showWageEdit, setShowWageEdit] = useState(false);
  const [wageInput, setWageInput] = useState('');
  const [monthlySalaryInput, setMonthlySalaryInput] = useState('');
  const [logoChar, setLogoChar] = useState('');
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    base44.entities.SiteSettings.list().then(settings => {
      if (settings.length > 0 && settings[0].logo_char) {
        setLogoChar(settings[0].logo_char);
      }
    }).catch(() => {});

    base44.auth.me().then(async (u) => {
      // Staffエンティティから名前と承認状態を取得
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        const staff = staffList[0];
        u.full_name = staff.full_name;
        u.approval_status = staff.approval_status || 'pending';
        u.staff_role = staff.role;
        u.employment_type = staff.employment_type || 'part_time';
        setMyStaff(staff);
        
        // 管理者の場合はroleもadminに設定
        if (staff.role === 'admin') {
          u.role = 'admin';
        }
      } else {
        // スタッフ登録がない場合は登録ページへリダイレクト
        window.location.href = createPageUrl('StaffRegistration');
        return;
      }
      setUser(u);
    }).catch((error) => {
      console.error('Auth error:', error);
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      return base44.entities.Announcement.list('-created_date', 50);
    },
  });

  const { data: openShifts = [] } = useQuery({
    queryKey: ['shifts-open'],
    queryFn: () => base44.entities.Shift.filter({ status: 'open', is_visible: true }, 'date', 10),
    staleTime: 60000,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['my-applications', user?.email],
    queryFn: () => user ? base44.entities.ShiftApplication.filter({ applicant_email: user.email }) : [],
    enabled: !!user,
  });

  // 本日承認済みシフトがあるかチェック（単発スタッフ用）
  const { data: todayApprovedShifts = [] } = useQuery({
    queryKey: ['today-approved-shifts', user?.email, today],
    queryFn: async () => {
      if (!user || user.staff_role !== 'temporary') return [];
      const allShifts = await base44.entities.Shift.filter({ date: today });
      const shiftIds = allShifts.map(s => s.id);
      if (shiftIds.length === 0) return [];
      
      const approvedApps = await base44.entities.ShiftApplication.filter({ 
        applicant_email: user.email,
        status: 'approved'
      });
      return approvedApps.filter(app => shiftIds.includes(app.shift_id));
    },
    enabled: !!user && user.staff_role === 'temporary',
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance', user?.email, today],
    queryFn: async () => {
      if (!user) return null;
      const records = await base44.entities.Attendance.filter({ 
        user_email: user.email, 
        date: today 
      });
      // 未退勤のレコードを優先、なければ最新のレコード
      const workingRecord = records.find(r => !r.clock_out);
      return workingRecord || records.sort((a, b) => 
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      )[0] || null;
    },
    enabled: !!user,
  });

  const { data: monthlyAttendance = [] } = useQuery({
    queryKey: ['monthly-attendance', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Attendance.filter({ user_email: user.email });
    },
    enabled: !!user,
  });

  const now2 = new Date();
  const currentYear = now2.getFullYear();
  const currentMonth = now2.getMonth() + 1;

  const { data: shiftMonths = [] } = useQuery({
    queryKey: ['dashboard-shift-months'],
    queryFn: () => base44.entities.ShiftMonth.list('-created_date', 50),
    enabled: !!user,
    staleTime: 60000,
  });

  const currentShiftMonth = shiftMonths.find(
    sm => Number(sm.year) === currentYear && Number(sm.month) === currentMonth && sm.status === 'PUBLISHED'
  );

  const { data: myShiftEntries = [] } = useQuery({
    queryKey: ['dashboard-shift-entries', user?.email, currentYear, currentMonth],
    queryFn: () => base44.entities.ShiftEntry.filter({ shift_month_id: currentShiftMonth.id, staff_email: user.email }),
    enabled: !!currentShiftMonth && !!user,
    staleTime: 60000,
  });

  const { data: allShiftEntries = [] } = useQuery({
    queryKey: ['dashboard-all-shift-entries', currentShiftMonth?.id],
    queryFn: async () => {
      const entries = await base44.entities.ShiftEntry.filter({ shift_month_id: currentShiftMonth.id });
      // display_in_shift_calendar が true のスタッフのシフトのみを取得
      const allStaffData = await base44.entities.Staff.list('-created_date', 500);
      const visibleStaffEmails = new Set(allStaffData
        .filter(s => s.display_in_shift_calendar !== false)
        .map(s => s.email));
      return entries.filter(e => visibleStaffEmails.has(e.staff_email));
    },
    enabled: !!currentShiftMonth && !!user,
    staleTime: 60000,
  });

  const updateWageMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.update(myStaff.id, data),
    onSuccess: (updated) => {
      setMyStaff(updated);
      setShowWageEdit(false);
    },
  });



  const clockInMutation = useMutation({
    mutationFn: async () => {
      const now = format(new Date(), 'HH:mm');
      return base44.entities.Attendance.create({
        user_email: user.email,
        user_name: user.full_name,
        date: today,
        clock_in: now,
        status: 'working',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['today-attendance']);
      queryClient.invalidateQueries(['monthly-attendance']);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const now = format(new Date(), 'HH:mm');
      return base44.entities.Attendance.update(todayAttendance.id, {
        clock_out: now,
        status: 'completed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['today-attendance']);
      queryClient.invalidateQueries(['monthly-attendance']);
    },
  });

  const calculateMonthlyHours = () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const thisMonthRecords = monthlyAttendance.filter(record => 
      record.date && record.date.startsWith(currentMonth)
    );
    
    let totalMinutes = 0;
    thisMonthRecords.forEach(record => {
      if (record.clock_in && record.clock_out) {
        const [inH, inM] = record.clock_in.split(':').map(Number);
        const [outH, outM] = record.clock_out.split(':').map(Number);
        const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0);
        totalMinutes += minutes;
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return totalMinutes > 0 ? `${hours}時間${mins > 0 ? mins + '分' : ''}` : '0時間';
  };

  // 推定月収計算
  const calcEstimatedIncome = () => {
    if (!myStaff) return null;
    const isFullTime = myStaff.employment_type === 'full_time';
    if (isFullTime) {
      return myStaff.monthly_salary ? `¥${myStaff.monthly_salary.toLocaleString()}` : null;
    }
    // パート・時給制: シフトエントリの合計時間 × 時給
    const wage = myStaff.hourly_wage;
    if (!wage) return null;
    const totalHours = myShiftEntries.reduce((sum, e) => {
      if (!e.start_time || !e.end_time) return sum + 8;
      const [sH, sM] = e.start_time.split(':').map(Number);
      const [eH, eM] = e.end_time.split(':').map(Number);
      return sum + ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    }, 0);
    return `¥${Math.round(totalHours * wage).toLocaleString()}`;
  };
  const estimatedIncome = calcEstimatedIncome();
  const isFullTime = myStaff?.employment_type === 'full_time';

  // 出勤可否の判定（単発スタッフ以外は常に可能、単発は本日の承認済みシフトが必要）
  const canClockIn = user?.staff_role === 'temporary' 
    ? (todayApprovedShifts && todayApprovedShifts.length > 0)
    : true;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">読み込み中...</div>
      </div>
    );
  }

  // 承認済みでない場合はアクセス不可
  if (user.approval_status !== 'approved') {
    // 承認待ちの場合
    if (user.approval_status === 'pending') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-medium text-slate-800 mb-2">承認待ち</h2>
            <p className="text-slate-600 mb-6">
              スタッフ登録の承認待ちです。<br />
              管理者の承認後にダッシュボードをご利用いただけます。
            </p>
            <Button 
              className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
              onClick={() => window.location.href = createPageUrl('Home')}
            >
              ホームへ戻る
            </Button>
          </Card>
        </div>
      );
    }

    // 却下された場合
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-medium text-slate-800 mb-2">承認されませんでした</h2>
          <p className="text-slate-600 mb-6">
            スタッフ登録申請が承認されませんでした。<br />
            詳細については管理者にお問い合わせください。
          </p>
          <Button 
            className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
            onClick={() => window.location.href = createPageUrl('Home')}
          >
            ホームへ戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-3 md:hidden">
            {logoChar && (
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-medium text-lg">{logoChar}</span>
              </div>
            )}
          </div>
          <p className="text-white/70 mb-1">
            {format(new Date(), 'yyyy年M月d日')}
          </p>
          <h1 className="text-2xl font-light">
            おかえりなさい、<span className="text-[#E8A4B8]">{user.full_name}</span>さん
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* QR Scanner */}
            <QRScanner
              user={user}
              todayAttendance={todayAttendance}
              canClockIn={canClockIn}
            />

            {/* Clock In/Out (従来の方法も残す) */}
            <ClockInOut
              currentAttendance={todayAttendance}
              onClockIn={() => clockInMutation.mutate()}
              onClockOut={() => clockOutMutation.mutate()}
              isLoading={clockInMutation.isPending || clockOutMutation.isPending}
              canClockIn={canClockIn}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatsCard
                title="今月の勤務"
                value={calculateMonthlyHours() || '0時間'}
                icon={Clock}
              />
              <StatsCard
                title="応募中"
                value={myApplications.filter(a => a.status === 'pending').length}
                icon={FileText}
              />
              <StatsCard
                title="承認済み"
                value={myApplications.filter(a => a.status === 'approved').length}
                icon={CheckCircle2}
              />
            </div>

            {/* 今月のシフト */}
            {currentShiftMonth && (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-medium text-slate-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {currentYear}年{currentMonth}月のシフト確定
                    </h2>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">公開済み</span>
                  </div>
                  {/* タブ切り替え */}
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 w-full sm:w-fit">
                    <button
                      className={`flex-1 sm:flex-none text-xs px-3 py-1 rounded-md font-medium transition-all ${shiftView === 'mine' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                      onClick={() => setShiftView('mine')}
                    >自分のシフト</button>
                    <button
                      className={`flex-1 sm:flex-none text-xs px-3 py-1 rounded-md font-medium transition-all ${shiftView === 'all' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                      onClick={() => setShiftView('all')}
                    >全体カレンダー</button>
                  </div>
                </div>

                {/* 推定収入（パート・アルバイト のみ） */}
                {myStaff && !isFullTime && (
                  <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-indigo-600 font-medium">
                        推定月収（{myShiftEntries.length}日 × 時給）
                      </span>
                      <span className="ml-2 text-base font-bold text-indigo-700">
                        {estimatedIncome || '未設定'}
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded-md px-2 py-1"
                      onClick={() => {
                        setWageInput(String(myStaff.hourly_wage || ''));
                        setShowWageEdit(true);
                      }}
                    >
                      <Pencil className="w-3 h-3" />編集
                    </button>
                  </div>
                )}

                <div className="p-4">
                   {shiftView === 'mine' ? (
                     myShiftEntries.length > 0 ? (
                       <DashboardShiftCalendar year={currentYear} month={currentMonth} entries={myShiftEntries} />
                     ) : (
                       <p className="text-sm text-slate-400 text-center py-4">この月のシフトはまだ割り当てられていません</p>
                     )
                   ) : allShiftEntries.length > 0 ? (
                     <DashboardShiftCalendar year={currentYear} month={currentMonth} entries={allShiftEntries} showAllStaff={true} />
                   ) : (
                     <p className="text-sm text-slate-400 text-center py-4">この月のシフトはまだ割り当てられていません</p>
                   )}
                 </div>
              </Card>
            )}

            {/* 給与設定ダイアログ */}
            <Dialog open={showWageEdit} onOpenChange={setShowWageEdit}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>給与設定</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {isFullTime ? (
                    <div className="space-y-1">
                      <Label>月給（円）</Label>
                      <Input
                        type="number"
                        placeholder="例: 250000"
                        value={monthlySalaryInput}
                        onChange={e => setMonthlySalaryInput(e.target.value)}
                      />
                      <p className="text-xs text-slate-400">正社員の月給を設定します</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label>時給（円）</Label>
                      <Input
                        type="number"
                        placeholder="例: 1100"
                        value={wageInput}
                        onChange={e => setWageInput(e.target.value)}
                      />
                      <p className="text-xs text-slate-400">パート・アルバイトの時給を設定します。推定月収に反映されます。</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setShowWageEdit(false)}>キャンセル</Button>
                    <Button
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => {
                        if (isFullTime) {
                          updateWageMutation.mutate({ monthly_salary: Number(monthlySalaryInput) });
                        } else {
                          updateWageMutation.mutate({ hourly_wage: Number(wageInput) });
                        }
                      }}
                      disabled={updateWageMutation.isPending}
                    >
                      保存
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Dice Game */}
            <DiceGameCard user={user} />

            {/* Available Shifts */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-800">募集中のシフト</h2>
                  <Link to={createPageUrl('Shifts')}>
                    <Button variant="ghost" size="sm" className="text-[#2D4A6F]">
                      すべて見る
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {openShifts.length > 0 ? (
                  <div className="grid gap-4">
                    {openShifts.slice(0, 3).map((shift) => (
                      <ShiftCard key={shift.id} shift={shift} showApplyButton={false} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>現在募集中のシフトはありません</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Help Call Section */}
            <HelpCallSection user={user} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Info Section */}
            <InfoSection />

            {/* Tip & Benefits */}
            <TipBenefitSection user={user} />

            {/* Quick Links */}
            <Card className="border-0 shadow-sm p-6">
              <h3 className="font-medium text-slate-800 mb-4">クイックアクセス</h3>
              <div className="space-y-2">
                <Link to={createPageUrl('Shifts')}>
                  <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-[#2D4A6F] hover:bg-[#2D4A6F]/5">
                    <Calendar className="w-4 h-4 mr-3" />
                    シフト一覧
                  </Button>
                </Link>
                <Link to={createPageUrl('Attendance')}>
                  <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-[#2D4A6F] hover:bg-[#2D4A6F]/5">
                    <Clock className="w-4 h-4 mr-3" />
                    勤怠履歴
                  </Button>
                </Link>
                <Link to={createPageUrl('MyApplications')}>
                  <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-[#2D4A6F] hover:bg-[#2D4A6F]/5">
                    <FileText className="w-4 h-4 mr-3" />
                    応募履歴
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link to={createPageUrl('AdminPanel')}>
                    <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-[#2D4A6F] hover:bg-[#2D4A6F]/5">
                      <Users className="w-4 h-4 mr-3" />
                      管理画面
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Announcements */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#E8A4B8]" />
                  <h3 className="font-medium text-slate-800">お知らせ</h3>
                </div>
              </div>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                  <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent">
                    すべて
                  </TabsTrigger>
                  <TabsTrigger value="urgent" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent">
                    緊急
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                      <AnnouncementCard key={announcement.id} announcement={announcement} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">お知らせはありません</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="urgent" className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  {announcements.filter(a => a.category === 'urgent').length > 0 ? (
                    announcements.filter(a => a.category === 'urgent').map((announcement) => (
                      <AnnouncementCard key={announcement.id} announcement={announcement} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">緊急のお知らせはありません</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}