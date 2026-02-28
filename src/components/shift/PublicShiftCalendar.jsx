import React from 'react';
import { Card } from '@/components/ui/card';
import { SHIFT_PATTERNS, getShiftPattern } from './shiftPatterns';

export default function PublicShiftCalendar({ entries, requirements, year, month, currentUserEmail, notes, closedDays = [], staff = [] }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  const userEntries = entries.filter(e => e.staff_email === currentUserEmail);
  const dateToEntry = {};
  userEntries.forEach(e => {
    const staffMember = staff.find(s => s.email === e.staff_email);
    if (staffMember && staffMember.display_in_shift_calendar !== false) {
      if (!dateToEntry[e.date]) dateToEntry[e.date] = [];
      dateToEntry[e.date].push({
        staff_name: e.staff_name,
        start_time: e.start_time,
        end_time: e.end_time,
        shift_type: e.shift_type
      });
    }
  });

  const getEntryColor = (patternId) => {
    const pattern = getShiftPattern(parseInt(patternId));
    return pattern?.color || 'bg-gray-100 text-gray-900';
  };

  return (
    <div className="space-y-4">
      {/* 凡例 */}
      <Card className="p-4 border-0 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">シフトパターン凡例</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {SHIFT_PATTERNS.map((pattern) => (
            <div key={pattern.id} className={`p-2 rounded border ${pattern.color} ${pattern.borderColor} text-center text-xs font-medium`}>
              <div className="font-bold">{pattern.label.split(' ')[0]}</div>
              <div className="text-[10px] mt-0.5">{pattern.startTime}</div>
              <div className="text-[10px]">～{pattern.endTime}</div>
            </div>
          ))}
        </div>
        {notes && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-semibold text-slate-600 mb-2">【特記事項】</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{notes}</p>
          </div>
        )}
      </Card>

      {/* カレンダー */}
      <Card className="p-4 border-0 shadow-lg overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(7, minmax(120px, 1fr))` }}>
            {/* 曜日ヘッダー */}
            {dayLabels.map((day, i) => (
              <div key={`day-${i}`} className={`p-2 text-center font-bold text-xs ${
                i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-slate-700'
              }`}>
                {day}
              </div>
            ))}

            {/* 最初の空セル */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2"></div>
            ))}

            {/* 日付セル */}
            {days.map((day) => {
               const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
               const dayOfWeek = new Date(year, month - 1, day).getDay();
               const isClosedDay = closedDays.includes(dayOfWeek);
               const dayEntries = dateToEntry[dateStr] || [];
               const req = requirements.find(r => r.date === dateStr);

               return (
                 <div
                   key={day}
                   className={`p-3 rounded-lg border-2 min-h-[140px] ${
                     isClosedDay ? 'border-slate-300 bg-slate-200 opacity-50' :
                     dayOfWeek === 0 ? 'border-red-300 bg-red-50' :
                     dayOfWeek === 6 ? 'border-blue-300 bg-blue-50' :
                     'border-slate-200 bg-white'
                   }`}
                 >
                   <div className="font-bold text-lg text-slate-800 mb-2">{day}</div>

                   {dayEntries.length > 0 ? (
                     <div className="space-y-1.5">
                       {dayEntries.map((entry, idx) => (
                         <div key={idx} className="p-2 rounded text-xs bg-indigo-100 border border-indigo-300">
                           <div className="font-semibold text-indigo-900">{entry.staff_name}</div>
                           <div className="text-indigo-700 text-[11px] mt-0.5">{entry.start_time}～{entry.end_time}</div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="text-center text-xs text-slate-400 py-6">休</div>
                   )}

                  {req && req.required_total && (
                    <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                      必要人数: {req.required_total}人
                    </div>
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