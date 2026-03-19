import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ja } from "date-fns/locale";

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function AttendanceCalendar({ attendanceRecords, staff, shiftEntries = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);

  const getAttendanceForDay = (day) => {
    return attendanceRecords.filter(record =>
      isSameDay(new Date(record.date + 'T00:00:00'), day)
    );
  };

  const getShiftsForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return shiftEntries.filter(e => e.date === dateStr);
  };

  const getStaffName = (email) => {
    const s = staff.find(m => m.email === email);
    return s?.full_name || email;
  };

  // 同姓の場合は「姓＋名1文字」で表示するための表示名を取得
  const getDisplayName = (email) => {
    const s = staff.find(m => m.email === email);
    if (!s?.full_name) return email;
    const parts = s.full_name.split(/\s+/);
    const lastName = parts[0] || '';
    const firstName = parts[1] || '';
    // 同じ姓を持つスタッフが他にいるか確認
    const hasSameLastName = staff.some(
      other => other.email !== email && other.full_name?.split(/\s+/)[0] === lastName
    );
    if (hasSameLastName && firstName) {
      return `${lastName} ${firstName[0]}`;
    }
    return lastName || s.full_name;
  };

  const monthAttendanceRecords = attendanceRecords.filter(r => {
    const d = new Date(r.date + 'T00:00:00');
    return isSameMonth(d, currentMonth);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block" />勤怠（出勤済）</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300 inline-block" />シフト予定</span>
      </div>

      {/* Grid Calendar */}
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className={`text-center text-xs font-bold py-2 rounded ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50 rounded-lg opacity-40" />
          ))}

          {daysInMonth.map((day) => {
            const dayAttendance = getAttendanceForDay(day);
            const dayShifts = getShiftsForDay(day);
            const isToday = isSameDay(day, new Date());
            const dow = getDay(day);
            const totalCount = dayAttendance.length + dayShifts.length;

            return (
              <div
                key={day.toString()}
                className={`min-h-[100px] p-1.5 rounded-lg border text-xs flex flex-col ${
                  isToday ? 'border-[#2D4A6F] border-2 bg-[#2D4A6F]/5' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`font-bold mb-1 flex items-center gap-1 ${isToday ? 'text-[#2D4A6F]' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                  {totalCount > 0 && (
                    <span className="text-[10px] bg-[#2D4A6F] text-white rounded-full px-1.5 py-0.5">
                      {totalCount}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 overflow-y-auto flex-1 max-h-[90px]">
                  {/* 勤怠レコード */}
                  {dayAttendance.map((record) => (
                    <div key={`att-${record.id}`} className={`rounded px-1 py-0.5 border ${
                      record.status === 'working'
                        ? 'bg-green-50 border-green-300'
                        : record.status === 'approved'
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="font-medium truncate text-[10px] text-green-800">{getDisplayName(record.user_email)}</div>
                      <div className="text-green-600 text-[9px]">{record.clock_in || '未'} 〜 {record.clock_out || '勤務中'}</div>
                    </div>
                  ))}
                  {/* シフト予定 */}
                  {dayShifts.map((entry) => {
                    const alreadyAttended = dayAttendance.some(r => r.user_email === entry.staff_email);
                    if (alreadyAttended) return null;
                    return (
                      <div key={`shift-${entry.id}`} className="rounded px-1 py-0.5 border bg-purple-50 border-purple-200">
                        <div className="font-medium truncate text-[10px] text-purple-800">{entry.staff_name || getStaffName(entry.staff_email)}</div>
                        <div className="text-purple-500 text-[9px]">{entry.start_time || ''} 〜 {entry.end_time || ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2D4A6F]" />
            <span className="font-medium text-sm">月間出勤延べ人数</span>
          </div>
          <Badge className="bg-[#2D4A6F] text-white text-base px-4 py-1">
            {monthAttendanceRecords.length} 人日
          </Badge>
        </div>
      </Card>
    </div>
  );
}