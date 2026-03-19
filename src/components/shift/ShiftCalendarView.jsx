import React from 'react';
import { Badge } from '@/components/ui/badge';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

// シフト時刻→色マップ（shiftPatternsの18種と対応）
const SHIFT_PATTERN_COLORS = [
  { startTime: '08:00', endTime: '17:00', bg: 'bg-blue-100',     text: 'text-blue-900' },
  { startTime: '08:30', endTime: '17:30', bg: 'bg-indigo-100',   text: 'text-indigo-900' },
  { startTime: '08:30', endTime: '17:00', bg: 'bg-cyan-100',     text: 'text-cyan-900' },
  { startTime: '08:30', endTime: '16:00', bg: 'bg-teal-100',     text: 'text-teal-900' },
  { startTime: '08:30', endTime: '16:30', bg: 'bg-emerald-100',  text: 'text-emerald-900' },
  { startTime: '09:00', endTime: '17:30', bg: 'bg-green-100',    text: 'text-green-900' },
  { startTime: '09:00', endTime: '16:00', bg: 'bg-lime-100',     text: 'text-lime-900' },
  { startTime: '09:00', endTime: '16:30', bg: 'bg-yellow-100',   text: 'text-yellow-900' },
  { startTime: '09:00', endTime: '17:00', bg: 'bg-amber-100',    text: 'text-amber-900' },
  { startTime: '08:30', endTime: '13:00', bg: 'bg-orange-100',   text: 'text-orange-900' },
  { startTime: '09:00', endTime: '13:00', bg: 'bg-red-100',      text: 'text-red-900' },
  { startTime: '09:15', endTime: '13:15', bg: 'bg-rose-100',     text: 'text-rose-900' },
  { startTime: '12:30', endTime: '17:00', bg: 'bg-pink-100',     text: 'text-pink-900' },
  { startTime: '09:30', endTime: '17:00', bg: 'bg-fuchsia-100',  text: 'text-fuchsia-900' },
  { startTime: '09:30', endTime: '14:00', bg: 'bg-purple-100',   text: 'text-purple-900' },
  { startTime: '09:15', endTime: '12:30', bg: 'bg-violet-100',   text: 'text-violet-900' },
  { startTime: '09:30', endTime: '12:30', bg: 'bg-slate-100',    text: 'text-slate-900' },
  { startTime: '09:00', endTime: '14:00', bg: 'bg-gray-200',     text: 'text-gray-900' },
];

function getShiftEntryColor(e) {
  const match = SHIFT_PATTERN_COLORS.find(p => p.startTime === e.start_time && p.endTime === e.end_time);
  return match || { bg: 'bg-slate-100', text: 'text-slate-800' };
}

// 1ヶ月分のカレンダーセルを生成
function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return { cells, firstDay };
}

function getDisplayName(staffName, staff) {
  if (!staffName) return '';
  const s = staff.find(m => m.full_name === staffName);
  if (!s) return staffName;
  const parts = staffName.split(/\s+/);
  const lastName = parts[0] || '';
  const firstName = parts[1] || '';
  const hasSameLastName = staff.some(
    other => other.id !== s.id && other.full_name?.split(/\s+/)[0] === lastName
  );
  if (hasSameLastName && firstName) {
    return `${lastName} ${firstName[0]}`;
  }
  return lastName || staffName;
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
                     const sc = getShiftEntryColor(e);
                     return (
                       <div
                         key={i}
                         className={`rounded px-1 py-0.5 leading-tight ${sc.bg} ${sc.text}`}
                         style={{ fontSize: '10px' }}
                       >
                         {isAdmin && (
                           <div className="font-medium truncate">{getDisplayName(e.staff_name, staff)}</div>
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

      {/* 特記事項一覧（表の下） */}
      {entries.some(e => e.notes) && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-bold text-slate-700 mb-3">📝 特記事項</h4>
          <div className="space-y-2">
            {Object.entries(
              entries.reduce((acc, e) => {
                if (e.notes) {
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
                      <span className="font-medium">{e.staff_name}:</span> {e.notes}
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