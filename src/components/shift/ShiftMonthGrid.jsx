import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import StaffPiece from './StaffPiece';
import { canPlaceStaff } from './taxUtils';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const SHIFT_TYPE_COLORS = {
  FULL: 'bg-indigo-100 text-indigo-700',
  AM: 'bg-sky-100 text-sky-700',
  PM: 'bg-violet-100 text-violet-700',
  NIGHT: 'bg-slate-200 text-slate-700',
  TRANSPORT: 'bg-green-100 text-green-700',
  OTHER: 'bg-slate-100 text-slate-500',
};

export default function ShiftMonthGrid({
  year, month, entries, requirements, staff, requests,
  onDropStaff, onRemoveEntry, isPublished,
}) {
  const [dragOver, setDragOver] = useState(null);
  const [draggingStaff, setDraggingStaff] = useState(null);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayEntries = (day) => {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return entries.filter(e => e.date === date);
  };

  const getDayRequirement = (day) => {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return requirements.find(r => r.date === date)?.required_total || 3;
  };

  const getDayStatus = (day) => {
    const count = getDayEntries(day).length;
    const req = getDayRequirement(day);
    if (count >= req) return 'ok';
    if (count >= req * 0.7) return 'warn';
    return 'short';
  };

  const statusStyles = {
    ok: 'border-green-200 bg-green-50',
    warn: 'border-yellow-300 bg-yellow-50',
    short: 'border-red-300 bg-red-50',
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    setDragOver(day);
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    setDragOver(null);
    if (draggingStaff) {
      const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      onDropStaff(draggingStaff, date);
      setDraggingStaff(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      {/* 週単位で表示 */}
      {Array.from({ length: Math.ceil((new Date(year, month - 1, 1).getDay() + daysInMonth) / 7) }, (_, weekIdx) => {
        const startDow = new Date(year, month - 1, 1).getDay();
        const weekDays = Array.from({ length: 7 }, (_, d) => {
          const day = weekIdx * 7 + d - startDow + 1;
          return day >= 1 && day <= daysInMonth ? day : null;
        });

        return (
          <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day, di) => {
              if (!day) return <div key={`e-${di}`} className="h-20 rounded-lg bg-slate-50 opacity-30" />;

              const dow = di;
              const status = getDayStatus(day);
              const dayEntries = getDayEntries(day);
              const req = getDayRequirement(day);
              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isWeekend = dow === 0 || dow === 6;

              return (
                <div
                  key={day}
                  className={`min-h-20 rounded-lg border-2 p-1 transition-all ${statusStyles[status]} ${dragOver === day ? 'ring-2 ring-indigo-400 scale-105' : ''} ${isWeekend ? 'opacity-90' : ''}`}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[11px] font-bold ${dow === 0 ? 'text-red-600' : dow === 6 ? 'text-blue-600' : 'text-slate-600'}`}>
                      {day}
                      <span className="text-[9px] ml-0.5 opacity-60">{DOW[dow]}</span>
                    </span>
                    <span className={`text-[9px] font-bold ${status === 'ok' ? 'text-green-600' : status === 'warn' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {dayEntries.length}/{req}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {dayEntries.map((entry, i) => (
                      <div
                        key={i}
                        className={`text-[10px] px-1 py-0.5 rounded flex items-center justify-between group ${SHIFT_TYPE_COLORS[entry.shift_type] || 'bg-slate-100 text-slate-600'}`}
                      >
                        <span className="truncate font-medium">{entry.staff_name?.split(' ').pop() || entry.staff_name}</span>
                        {!isPublished && (
                          <button
                            className="opacity-0 group-hover:opacity-100 text-red-500 ml-0.5 leading-none"
                            onClick={() => onRemoveEntry(entry)}
                          >×</button>
                        )}
                      </div>
                    ))}
                  </div>

                  {status === 'short' && dayEntries.length === 0 && (
                    <div className="text-[9px] text-red-400 text-center mt-1">未配置</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}