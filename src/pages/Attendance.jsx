import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

const statusConfig = {
  working: { label: '勤務中', color: 'bg-[#7CB342]/10 text-[#7CB342]' },
  completed: { label: '完了', color: 'bg-slate-100 text-slate-600' },
  approved: { label: '承認済', color: 'bg-[#2D4A6F]/10 text-[#2D4A6F]' },
};

export default function Attendance() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ['attendance', user?.email],
    queryFn: () => user ? base44.entities.Attendance.filter({ user_email: user.email }, '-date') : [],
    enabled: !!user,
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-medium text-slate-800 min-w-32 text-center">
                {format(currentMonth, 'yyyy年M月', { locale: ja })}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
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
                    className={`p-3 border-b border-r border-slate-100 min-h-24 ${
                      isToday ? 'bg-[#2D4A6F]/5' : ''
                    }`}
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
                        {format(new Date(record.date), 'M月d日(E)', { locale: ja })}
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
      </div>
    </div>
  );
}