import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import AttendanceStats from "@/components/attendance/AttendanceStats";

const statusConfig = {
  working: { label: '勤務中', color: 'bg-[#7CB342]/10 text-[#7CB342]' },
  completed: { label: '完了', color: 'bg-slate-100 text-slate-600' },
  approved: { label: '承認済', color: 'bg-[#2D4A6F]/10 text-[#2D4A6F]' },
};

export default function Attendance() {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');
  const [mainTab, setMainTab] = useState('my');
  const [allCurrentMonth, setAllCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        u.approval_status = staffList[0].approval_status || 'pending';
        setStaff(staffList[0]);
      }
      setUser(u);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance', user?.email],
    queryFn: () => user ? base44.entities.Attendance.filter({ user_email: user.email }, '-date') : [],
    enabled: !!user,
  });

  const { data: allAttendanceRecords = [] } = useQuery({
    queryKey: ['attendance-all'],
    queryFn: () => base44.entities.Attendance.list('-date'),
    enabled: !!user,
  });

  const { data: allShiftEntries = [] } = useQuery({
    queryKey: ['shift-entries-all'],
    queryFn: () => base44.entities.ShiftEntry.list('-date'),
    enabled: !!user,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff-all'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: !!user,
  });

  const { data: siteSettings = {} } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const list = await base44.entities.SiteSettings.list();
      return list.length > 0 ? list[0] : {};
    },
    enabled: !!user,
  });

  const isAdmin = user?.role === 'admin';

  const todayAttendance = attendanceRecords.find(record => record.date === today);

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const now = format(new Date(), 'HH:mm');
      return base44.entities.Attendance.update(todayAttendance.id, {
        clock_out: now,
        status: 'completed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAttendanceForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return attendanceRecords.find(record => record.date === dateStr);
  };

  const calculateHours = (record) => {
    if (!record.clock_in || !record.clock_out) return null;
    const [inH, inM] = record.clock_in.split(':').map(Number);
    const [outH, outM] = record.clock_out.split(':').map(Number);
    const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };

  const calculateMonthlyStats = () => {
    const monthRecords = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    let totalMinutes = 0;
    monthRecords.forEach(record => {
      if (record.clock_in && record.clock_out) {
        const [inH, inM] = record.clock_in.split(':').map(Number);
        const [outH, outM] = record.clock_out.split(':').map(Number);
        const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0);
        totalMinutes += minutes;
      }
    });

    return {
      days: monthRecords.length,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  };

  const stats = calculateMonthlyStats();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">読み込み中...</div>
      </div>
    );
  }

  if (user.approval_status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-medium text-slate-800 mb-2">承認が必要です</h2>
          <p className="text-slate-600 mb-6">
            この機能を利用するには、管理者による承認が必要です。
          </p>
          <Button
            className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
            onClick={() => window.location.href = '/Home'}
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
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">勤怠履歴</h1>
          <p className="text-white/70">あなたの勤務記録を確認できます</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        {/* Manual Clock Out */}
        {todayAttendance && !todayAttendance.clock_out && (
          <Card className="bg-white border-0 shadow-lg mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-[#7CB342] animate-pulse" />
                    <h3 className="text-lg font-medium text-slate-800">現在勤務中</h3>
                  </div>
                  <p className="text-slate-600">
                    出勤時刻: {todayAttendance.clock_in}
                  </p>
                </div>
                <Button
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  className="bg-[#E8A4B8] hover:bg-[#D88FA3] h-12 px-8"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  {clockOutMutation.isPending ? '処理中...' : '退勤する'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* メインタブ */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="mb-4">
          <TabsList className="bg-white shadow rounded-xl p-1 h-auto mb-4">
            <TabsTrigger value="my" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white px-5 py-2 rounded-lg">
              <Clock className="w-4 h-4 mr-1" />自分の勤怠
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white px-5 py-2 rounded-lg">
              <Users className="w-4 h-4 mr-1" />全体カレンダー
            </TabsTrigger>
          </TabsList>

          {/* 自分の勤怠タブ */}
          <TabsContent value="my">
            {/* 詳細統計・扶養ライン */}
            <div className="mb-6">
              <AttendanceStats
                attendanceRecords={attendanceRecords}
                currentMonth={currentMonth}
                staff={staff}
              />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-white border-0 shadow-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#2D4A6F]/10">
                    <Calendar className="w-6 h-6 text-[#2D4A6F]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">今月の勤務日数</p>
                    <p className="text-2xl font-light text-slate-800">{stats.days}日</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-0 shadow-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#7CB342]/10">
                    <Clock className="w-6 h-6 text-[#7CB342]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">今月の勤務時間</p>
                    <p className="text-2xl font-light text-slate-800">
                      {stats.hours}時間{stats.minutes > 0 ? `${stats.minutes}分` : ''}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="bg-white border-0 shadow-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[#E8A4B8]/10">
                    <Clock className="w-6 h-6 text-[#E8A4B8]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">平均勤務時間/日</p>
                    <p className="text-2xl font-light text-slate-800">
                      {stats.days > 0 ? Math.round((stats.hours * 60 + stats.minutes) / stats.days / 60 * 10) / 10 : 0}時間
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Month Navigation & View Toggle */}
            <Card className="bg-white border-0 shadow-lg mb-6">
              <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-medium text-slate-800 min-w-32 text-center">
                    {format(currentMonth, 'yyyy年M月')}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendar">カレンダー</SelectItem>
                    <SelectItem value="list">リスト</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <Card className="bg-white border-0 shadow-lg overflow-hidden">
                <div className="grid grid-cols-7 border-b">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                    <div
                      key={day}
                      className={`p-4 text-center text-sm font-medium ${
                        i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {Array(monthStart.getDay()).fill(null).map((_, i) => (
                    <div key={`empty-${i}`} className="p-4 border-b border-r border-slate-100 min-h-24" />
                  ))}
                  {daysInMonth.map((day) => {
                    const attendance = getAttendanceForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const dayOfWeek = day.getDay();
                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-3 border-b border-r border-slate-100 min-h-24 ${isToday ? 'bg-[#2D4A6F]/5' : ''}`}
                      >
                        <div className={`text-sm mb-2 ${
                          dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-slate-600'
                        } ${isToday ? 'font-bold' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        {attendance && (
                          <div className="space-y-1">
                            <div className="text-xs text-slate-600">
                              {attendance.clock_in} - {attendance.clock_out || '勤務中'}
                            </div>
                            {attendance.clock_out && (
                              <Badge className={statusConfig[attendance.status]?.color || 'bg-slate-100'}>
                                {calculateHours(attendance)}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <Card className="bg-white border-0 shadow-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>日付</TableHead>
                      <TableHead>出勤</TableHead>
                      <TableHead>退勤</TableHead>
                      <TableHead>休憩</TableHead>
                      <TableHead>勤務時間</TableHead>
                      <TableHead>状態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords
                      .filter(record => {
                        const recordDate = new Date(record.date);
                        return recordDate >= monthStart && recordDate <= monthEnd;
                      })
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {format(new Date(record.date), 'M月d日')}
                          </TableCell>
                          <TableCell>{record.clock_in}</TableCell>
                          <TableCell>{record.clock_out || '-'}</TableCell>
                          <TableCell>{record.break_minutes ? `${record.break_minutes}分` : '-'}</TableCell>
                          <TableCell className="font-medium">
                            {calculateHours(record) || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[record.status]?.color || 'bg-slate-100'}>
                              {statusConfig[record.status]?.label || record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {attendanceRecords.filter(record => {
                  const recordDate = new Date(record.date);
                  return recordDate >= monthStart && recordDate <= monthEnd;
                }).length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    この月の勤怠記録はありません
                  </div>
                )}
              </Card>
            )}
          </TabsContent>

          {/* 全体カレンダータブ */}
          <TabsContent value="all">
            <Card className="bg-white border-0 shadow-lg p-4">
              {/* 月ナビ */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-800">全スタッフ勤怠一覧</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setAllCurrentMonth(m => subMonths(m, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-base font-semibold text-slate-700 min-w-[90px] text-center">
                    {format(allCurrentMonth, 'yyyy年M月')}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setAllCurrentMonth(m => addMonths(m, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* スタッフ×日付 テーブル */}
              {(() => {
                const ms = startOfMonth(allCurrentMonth);
                const me = endOfMonth(allCurrentMonth);
                const days = eachDayOfInterval({ start: ms, end: me });
                const yearMonth = format(allCurrentMonth, 'yyyy-MM');
                const monthRecords = allShiftEntries.filter(r => r.date?.startsWith(yearMonth));

                // 当月にシフトがあるスタッフを抽出
                const activeEmails = [...new Set(monthRecords.map(r => r.staff_email))];
                const activeStaff = allStaff.filter(s => activeEmails.includes(s.email));
                const unknownEmails = activeEmails.filter(e => !allStaff.find(s => s.email === e));
                const allActiveStaff = [
                  ...activeStaff,
                  ...unknownEmails.map(e => ({ email: e, full_name: e }))
                ];

                if (allActiveStaff.length === 0) {
                  return <div className="text-center py-12 text-slate-400">この月の勤怠記録はありません</div>;
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse w-full">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left min-w-[80px] text-slate-600 font-semibold">氏名</th>
                          {days.map(day => {
                            const dow = getDay(day);
                            const isToday = isSameDay(day, new Date());
                            return (
                              <th key={format(day, 'd')} className={`border border-slate-200 px-1 py-1.5 text-center min-w-[28px] font-semibold ${
                                isToday ? 'bg-[#2D4A6F] text-white' :
                                dow === 0 ? 'bg-red-50 text-red-500' :
                                dow === 6 ? 'bg-blue-50 text-blue-500' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <div>{format(day, 'd')}</div>
                                <div className="font-normal text-[9px]">{'日月火水木金土'[dow]}</div>
                              </th>
                            );
                          })}
                          <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 text-slate-600 font-semibold min-w-[36px]">日数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allActiveStaff.map(s => {
                          const staffRecords = monthRecords.filter(r => r.staff_email === s.email);
                          return (
                            <tr key={s.email} className="hover:bg-slate-50">
                              <td className="sticky left-0 z-10 bg-white border border-slate-200 px-2 py-1 font-medium text-slate-800 whitespace-nowrap">
                                {s.full_name || s.email}
                              </td>
                              {days.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const rec = staffRecords.find(r => r.date === dateStr);
                                const dow = getDay(day);
                                return (
                                  <td key={dateStr} className={`border border-slate-200 text-center align-middle w-7 h-7 relative group ${
                                   dow === 0 ? 'bg-red-50/40' : dow === 6 ? 'bg-blue-50/40' : ''
                                  }`}>
                                    {rec ? (
                                      <>
                                        <span className="text-green-600 font-bold text-sm cursor-default">●</span>
                                        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block pointer-events-none">
                                          <div className="bg-slate-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                            <div className="font-semibold">{s.full_name || s.email}</div>
                                            {rec.start_time && rec.end_time && (
                                              <div className="text-slate-300">{rec.start_time} 〜 {rec.end_time}</div>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-slate-200 text-sm">·</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="border border-slate-200 px-2 py-1 text-center font-bold text-[#2D4A6F]">
                                {staffRecords.length}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* 月間サマリー */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                <Users className="w-5 h-5 text-[#2D4A6F]" />
                <span className="text-sm font-medium text-slate-700">月間出勤延べ人数：</span>
                <span className="text-lg font-bold text-[#2D4A6F]">
                  {allShiftEntries.filter(r => r.date?.startsWith(format(allCurrentMonth, 'yyyy-MM'))).length} 人日
                </span>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}