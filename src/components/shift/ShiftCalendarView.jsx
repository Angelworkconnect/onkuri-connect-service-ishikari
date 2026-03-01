import React from 'react';
import { Badge } from '@/components/ui/badge';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

// 1ヶ月分のカレンダーセルを生成
function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return { cells, firstDay };
}

export default function ShiftCalendarView({ year, month, entries, isAdmin, staff = [] }) {
  const { cells } = buildCalendarDays(year, month);

  // staff の休み情報をまとめたマップ: date -> [staffName, ...]
  const offDayMap = {};
  staff.forEach(s => {
    // hard_off_days (曜日)
    (s.hard_off_days || []).forEach(dow => {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        if (date.getDay() === dow) {
          const key = d;
          if (!offDayMap[key]) offDayMap[key] = [];
          offDayMap[key].push(s.full_name);
        }
      }
    });
    // custom_off_dates
    (s.custom_off_dates || []).forEach(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const key = d.getDate();
        if (!offDayMap[key]) offDayMap[key] = [];
        if (!offDayMap[key].includes(s.full_name)) offDayMap[key].push(s.full_name);
      }
    });
  });

  // 日付 → エントリのマップ
  const entryMap = {};
  entries.forEach(e => {
    const d = new Date(e.date + 'T00:00:00').getDate();
    if (!entryMap[d]) entryMap[d] = [];
    entryMap[d].push(e);
  });

  return (
    <div className="overflow-x-auto">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d, i) => (
          <div key={d} className={`text-center text-xs font-bold py-1
            ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          const dow = idx % 7;
          const isSun = dow === 0;
          const isSat = dow === 6;
          const dayEntries = day ? (entryMap[day] || []) : [];

          return (
            <div
              key={idx}
              className={`min-h-[72px] p-1 text-xs
                ${!day ? 'bg-slate-50' : isSun ? 'bg-red-50' : isSat ? 'bg-blue-50' : 'bg-white'}`}
            >
              {day && (
                <>
                  <div className={`font-bold mb-1
                    ${isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-slate-700'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                   {dayEntries.map((e, i) => {
                     const shiftColorMap = {
                       FULL: 'bg-indigo-100 text-indigo-800',
                       AM: 'bg-sky-100 text-sky-800',
                       PM: 'bg-violet-100 text-violet-800',
                       NIGHT: 'bg-slate-200 text-slate-800',
                       TRANSPORT: 'bg-green-100 text-green-800',
                       OTHER: 'bg-amber-100 text-amber-800',
                     };
                     const colorClass = shiftColorMap[e.shift_type] || 'bg-indigo-100 text-indigo-800';
                     return (
                       <div
                         key={i}
                         className={`rounded px-1 py-0.5 leading-tight ${colorClass}`}
                         style={{ fontSize: '10px' }}
                       >
                         {isAdmin && (
                           <div className="font-medium truncate">{e.staff_name}</div>
                         )}
                         {e.start_time && e.end_time
                           ? <div>{e.start_time}〜{e.end_time}</div>
                           : <div>シフトあり</div>
                         }
                       </div>
                     );
                   })}
                   {/* 休み表示 */}
                   {isAdmin && (offDayMap[day] || []).length > 0 && (
                     <div className="mt-0.5 space-y-0.5">
                       {(offDayMap[day] || []).map((name, i) => (
                         <div key={i} className="rounded px-1 py-0.5 bg-red-100 text-red-700 leading-tight" style={{ fontSize: '9px' }}>
                           🚫 {name}
                         </div>
                       ))}
                     </div>
                   )}
                   {!isAdmin && (offDayMap[day] || []).length > 0 && (
                     <div className="text-[9px] text-red-400 mt-0.5">🚫 {offDayMap[day].length}名休み</div>
                   )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}