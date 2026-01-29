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
  ChevronRight, Bell, CheckCircle2, Megaphone
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import StatsCard from "@/components/dashboard/StatsCard";
import AnnouncementCard from "@/components/dashboard/AnnouncementCard";
import ShiftCard from "@/components/shifts/ShiftCard";
import ClockInOut from "@/components/attendance/ClockInOut";
import QRScanner from "@/components/attendance/QRScanner";
import InfoSection from "@/components/dashboard/InfoSection";
import TipBenefitSection from "@/components/dashboard/TipBenefitSection";
import DiceGameCard from "@/components/dashboard/DiceGameCard";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      // Staffエンティティから名前と承認状態を取得
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        u.approval_status = staffList[0].approval_status || 'pending';
        u.staff_role = staffList[0].role;
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
    queryFn: () => base44.entities.Announcement.list('-created_date', 5),
  });

  const { data: openShifts = [] } = useQuery({
    queryKey: ['shifts-open'],
    queryFn: () => base44.entities.Shift.filter({ status: 'open', is_visible: true }, 'date', 10),
    refetchInterval: 3000,
    staleTime: 0,
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
      const startOfMonth = format(new Date(), 'yyyy-MM-01');
      return base44.entities.Attendance.filter({
        user_email: user.email,
      });
    },
    enabled: !!user,
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
    let totalMinutes = 0;
    monthlyAttendance.forEach(record => {
      if (record.clock_in && record.clock_out) {
        const [inH, inM] = record.clock_in.split(':').map(Number);
        const [outH, outM] = record.clock_out.split(':').map(Number);
        const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0);
        totalMinutes += minutes;
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}時間${mins > 0 ? mins + '分' : ''}`;
  };

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
              <div className="p-4 space-y-3">
                {announcements.length > 0 ? (
                  announcements.slice(0, 3).map((announcement) => (
                    <AnnouncementCard key={announcement.id} announcement={announcement} />
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">お知らせはありません</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}