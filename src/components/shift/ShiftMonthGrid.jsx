import React, { useState } from 'react';
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
  onDropStaff, onRemoveEntry, isPublished, onUpdateRequirement,
}) {
  const [dragOver, setDragOver] = useState(null);
  const [draggingStaff, setDraggingStaff] = useState(null);
  const [quickFillDay, setQuickFillDay] = useState(null); // ワンタップ不足補充
  const [editingReqDay, setEditingReqDay] = useState(null);
  const [editingReqValue, setEditingReqValue] = useState('');

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dateStr = (day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const getDayEntries = (day) => entries.filter(e => e.date === dateStr(day));

  const getDayRequirement = (day) => {
    return requirements.find(r => r.date === dateStr(day))?.required_total || 3;
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

  const handleDragOver = (e, day) => { e.preventDefault(); setDragOver(day); };
  const handleDrop = (e, day) => {
    e.preventDefault(); setDragOver(null);
    if (draggingStaff) { onDropStaff(draggingStaff, dateStr(day)); setDraggingStaff(null); }
  };

  // ワンタップ不足補充: 不足日クリックで候補スタッフ表示
  const getQuickFillCandidates = (day) => {
    const date = dateStr(day);
    const dayEntries = getDayEntries(day);
    const alreadyIds = new Set(dayEntries.map(e => e.staff_id));
    // 希望休チェック
    const offEmails = new Set(requests.filter(r => r.date === date && r.request_type === 'OFF').map(r => r.staff_email));
    return staff.filter(s => {
      if (alreadyIds.has(s.id)) return false;
      if (offEmails.has(s.email)) return false;
      const { canPlace } = canPlaceStaff(s, date, entries, []);
      return canPlace;
    });
  };

  const handleDayCellClick = (day) => {
    if (isPublished) return;
    const status = getDayStatus(day);
    if (status === 'short' || status === 'warn') {
      setQuickFillDay(day === quickFillDay ? null : day);
    }
  };

  return (
    <div className="overflow-x-auto">
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
              const isWeekend = dow === 0 || dow === 6;
              const isQuickFillOpen = quickFillDay === day;
              const candidates = isQuickFillOpen ? getQuickFillCandidates(day) : [];

              return (
                <div key={day} className="relative">
                  <div
                    className={`min-h-20 rounded-lg border-2 p-1 transition-all ${statusStyles[status]} ${dragOver === day ? 'ring-2 ring-indigo-400 scale-105' : ''} ${status !== 'ok' && !isPublished ? 'cursor-pointer' : ''}`}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => handleDrop(e, day)}
                    onClick={() => handleDayCellClick(day)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[11px] font-bold ${dow === 0 ? 'text-red-600' : dow === 6 ? 'text-blue-600' : 'text-slate-600'}`}>
                        {day}<span className="text-[9px] ml-0.5 opacity-60">{DOW[dow]}</span>
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
                              onClick={(e) => { e.stopPropagation(); onRemoveEntry(entry); }}
                            >×</button>
                          )}
                        </div>
                      ))}
                    </div>

                    {status === 'short' && !isPublished && (
                      <div className="text-[9px] text-red-400 text-center mt-1 font-bold">
                        {isQuickFillOpen ? '▲ 閉じる' : '+ 補充'}
                      </div>
                    )}
                    {status === 'warn' && !isPublished && dayEntries.length < req && (
                      <div className="text-[9px] text-yellow-500 text-center mt-1">+ 追加</div>
                    )}
                  </div>

                  {/* ワンタップ補充パネル */}
                  {isQuickFillOpen && (
                    <div
                      className="absolute top-full left-0 z-50 bg-white border-2 border-indigo-300 rounded-xl shadow-2xl p-2 min-w-[140px] mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[10px] font-bold text-indigo-700 mb-1">{month}/{day} に入れる人</p>
                      {candidates.length === 0 ? (
                        <p className="text-[10px] text-slate-400">候補なし</p>
                      ) : (
                        <div className="space-y-1">
                          {candidates.slice(0, 6).map(s => (
                            <button
                              key={s.id}
                              className="w-full text-left text-[11px] px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-medium"
                              onClick={() => { onDropStaff(s, dateStr(day)); setQuickFillDay(null); }}
                            >
                              {s.full_name}
                            </button>
                          ))}
                        </div>
                      )}
                      <button className="text-[10px] text-slate-400 mt-1 w-full text-center" onClick={() => setQuickFillDay(null)}>閉じる</button>
                    </div>
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