import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ja } from "date-fns/locale";

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

export default function AttendanceCalendar({ attendanceRecords, staff }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState({});

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 月初の曜日オフセット（日=0）
  const startOffset = getDay(monthStart);

  const getAttendanceForDay = (day) => {
    return attendanceRecords.filter(record =>
      isSameDay(new Date(record.date + 'T00:00:00'), day)
    );
  };

  const getStaffName = (userEmail) => {
    const staffMember = staff.find(s => s.email === userEmail);
    return staffMember?.full_name || userEmail;
  };

  const getRoleLabel = (email) => {
    const s = staff.find(m => m.email === email);
    if (!s) return '';
    const map = { admin: '管理者', full_time: '正社員', part_time: 'パート', temporary: '単発' };
    return map[s.role] || '';
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const toggleDay = (dateStr) => {
    setExpandedDays(prev => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const monthRecords = attendanceRecords.filter(r => {
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
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop: Grid Calendar */}
      <div>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className={`text-center text-xs font-bold py-2 rounded ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before month start */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[90px] bg-slate-50 rounded-lg opacity-40" />
          ))}

          {daysInMonth.map((day) => {
            const dayAttendance = getAttendanceForDay(day);
            const isToday = isSameDay(day, new Date());
            const dow = getDay(day);

            return (
              <div
                key={day.toString()}
                className={`min-h-[90px] p-1.5 rounded-lg border text-xs flex flex-col ${
                  isToday ? 'border-[#2D4A6F] border-2 bg-[#2D4A6F]/5' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`font-bold mb-1 ${isToday ? 'text-[#2D4A6F]' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                  {dayAttendance.length > 0 && (
                    <span className="ml-1 text-[10px] bg-[#2D4A6F] text-white rounded-full px-1.5 py-0.5">
                      {dayAttendance.length}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 overflow-y-auto flex-1 max-h-[80px]">
                  {dayAttendance.map((record) => (
                    <div key={record.id} className={`rounded px-1 py-0.5 border ${
                      record.status === 'working'
                        ? 'bg-green-50 border-green-200'
                        : record.status === 'approved'
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`font-medium truncate text-[10px] ${record.status === 'working' ? 'text-green-700' : 'text-slate-700'}`}>{getStaffName(record.user_email)}</div>
                      <div className="text-slate-400 text-[9px]">{record.clock_in || '未'} 〜 {record.clock_out || '未'}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: List View */}
      <div className="hidden space-y-2">
        {daysInMonth.map((day) => {
          const dayAttendance = getAttendanceForDay(day);
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          const isExpanded = expandedDays[dateStr];
          const dow = getDay(day);

          if (dayAttendance.length === 0 && !isToday) return null;

          return (
            <Card
              key={dateStr}
              className={`border-0 shadow-sm overflow-hidden ${isToday ? 'ring-2 ring-[#2D4A6F]' : ''}`}
            >
              <button
                className="w-full text-left"
                onClick={() => toggleDay(dateStr)}
              >
                <div className={`flex items-center justify-between px-4 py-3 ${isToday ? 'bg-[#2D4A6F] text-white' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold w-8 text-center ${!isToday && (dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : '')}`}>
                      {format(day, 'd')}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-white/80' : 'text-slate-500'}`}>
                      {DAY_NAMES[dow]}曜日
                    </div>
                    {dayAttendance.length > 0 && (
                      <Badge className={`text-xs ${isToday ? 'bg-white/20 text-white border-white/30' : 'bg-[#2D4A6F]/10 text-[#2D4A6F] border-[#2D4A6F]/20'}`} variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {dayAttendance.length}名
                      </Badge>
                    )}
                    {isToday && <span className="text-xs text-white/70">今日</span>}
                  </div>
                  {dayAttendance.length > 0 && (
                    isExpanded
                      ? <ChevronUp className={`w-4 h-4 ${isToday ? 'text-white' : 'text-slate-400'}`} />
                      : <ChevronDown className={`w-4 h-4 ${isToday ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </div>
              </button>

              {isExpanded && dayAttendance.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {dayAttendance.map((record) => {
                    let hours = null;
                    if (record.clock_in && record.clock_out) {
                      const [inH, inM] = record.clock_in.split(':').map(Number);
                      const [outH, outM] = record.clock_out.split(':').map(Number);
                      const mins = (outH * 60 + outM) - (inH * 60 + inM);
                      hours = (mins / 60).toFixed(1);
                    }
                    return (
                      <div key={record.id} className="px-4 py-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{getStaffName(record.user_email)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{getRoleLabel(record.user_email)}</p>
                          </div>
                          <Badge className={
                            record.status === 'working' ? 'bg-green-100 text-green-700' :
                            record.status === 'approved' ? 'bg-[#2D4A6F]/10 text-[#2D4A6F]' :
                            'bg-slate-100 text-slate-500'
                          }>
                            {record.status === 'working' ? '勤務中' : record.status === 'approved' ? '承認済' : '完了'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{record.clock_in || '--:--'}</span>
                            <span className="text-slate-400">〜</span>
                            <span className="font-mono">{record.clock_out || '--:--'}</span>
                          </div>
                          {hours && (
                            <span className="text-[#2D4A6F] font-semibold">{hours}h</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}

        {monthRecords.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">この月の勤怠記録はありません</p>
          </div>
        )}
      </div>

      {/* Summary */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2D4A6F]" />
            <span className="font-medium text-sm">月間出勤延べ人数</span>
          </div>
          <Badge className="bg-[#2D4A6F] text-white text-base px-4 py-1">
            {monthRecords.length} 人日
          </Badge>
        </div>
      </Card>
    </div>
  );
}