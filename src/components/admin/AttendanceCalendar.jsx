import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

export default function AttendanceCalendar({ attendanceRecords, staff }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAttendanceForDay = (day) => {
    return attendanceRecords.filter(record => 
      isSameDay(new Date(record.date), day)
    );
  };

  const getStaffName = (userEmail) => {
    const staffMember = staff.find(s => s.email === userEmail);
    return staffMember?.full_name || userEmail;
  };

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day Headers */}
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
          <div key={i} className="text-center text-sm font-medium text-slate-600 py-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {daysInMonth.map((day) => {
          const dayAttendance = getAttendanceForDay(day);
          const attendanceCount = dayAttendance.length;
          const isToday = isSameDay(day, new Date());

          return (
            <Card 
              key={day.toString()} 
              className={`min-h-[120px] p-2 ${
                isToday ? 'border-[#2D4A6F] border-2' : 'border-slate-200'
              } ${!isSameMonth(day, currentMonth) ? 'opacity-40' : ''}`}
            >
              <div className="flex flex-col h-full">
                {/* Date */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isToday ? 'text-[#2D4A6F]' : 'text-slate-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {attendanceCount > 0 && (
                    <Badge variant="outline" className="text-xs bg-[#2D4A6F]/10 text-[#2D4A6F] border-[#2D4A6F]/20">
                      <Users className="w-3 h-3 mr-1" />
                      {attendanceCount}
                    </Badge>
                  )}
                </div>

                {/* Attendance List */}
                <div className="space-y-1 overflow-y-auto flex-1">
                  {dayAttendance.map((record) => (
                    <div 
                      key={record.id} 
                      className="text-xs p-1.5 bg-slate-50 rounded border border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="font-medium text-slate-700 truncate">
                        {getStaffName(record.user_email)}
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {record.clock_in || '未'} 〜 {record.clock_out || '未'}
                        </span>
                      </div>
                      <Badge 
                        className={`text-[10px] mt-1 ${
                          record.status === 'working' ? 'bg-[#7CB342]/10 text-[#7CB342]' :
                          record.status === 'approved' ? 'bg-[#2D4A6F]/10 text-[#2D4A6F]' :
                          'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {record.status === 'working' ? '勤務中' : 
                         record.status === 'approved' ? '承認済' : '完了'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card className="p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2D4A6F]" />
            <span className="font-medium">月間出勤延べ人数</span>
          </div>
          <Badge className="bg-[#2D4A6F] text-white text-base px-4 py-1">
            {attendanceRecords.filter(r => 
              isSameMonth(new Date(r.date), currentMonth)
            ).length} 人日
          </Badge>
        </div>
      </Card>
    </div>
  );
}