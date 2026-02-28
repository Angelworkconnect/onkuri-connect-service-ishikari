import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StaffPiece from './StaffPiece';
import ShiftEditorDialog from './ShiftEditorDialog';
import { Edit2 } from 'lucide-react';
import { SHIFT_PATTERNS, getShiftPattern, getShiftColor, getShiftLabel } from './shiftPatterns';
import { canPlaceStaff } from './taxUtils';

// 介護系加算資格
const CARE_QUALIFICATIONS = [
  '介護福祉士', '社会福祉士', '精神保健福祉士', '看護師', '准看護師',
  '理学療法士', 'PT', '作業療法士', 'OT', '言語聴覚士', 'ST',
  'ケアマネージャー', '介護支援専門員',
  'ホームヘルパー1級', 'ホームヘルパー2級', 'ホームヘルパー3級',
  '初任者研修', '実務者研修', '生活援助従事者研修',
  '喀痰吸引等研修', '認知症介護基礎研修', '認知症介護実践者研修',
  '福祉用具専門相談員', '相談支援専門員', '保育士', '社会福祉主事',
];

function hasCareQual(staff) {
  return (staff.qualifications || []).some(q => q && CARE_QUALIFICATIONS.some(cq => q.includes(cq)));
}

function getCandidateStyle(staff) {
  if (hasCareQual(staff)) {
    return {
      className: 'w-full text-left text-[11px] px-2 py-1 rounded-lg font-bold border-2',
      style: {
        background: 'linear-gradient(135deg, #ffd6e0 0%, #ffeaa7 33%, #d4f5a0 66%, #a0e4f5 100%)',
        borderColor: '#cc5de8',
        color: '#333',
      },
      label: '🌈',
    };
  }
  if (staff.gender === 'female') {
    return { className: 'w-full text-left text-[11px] px-2 py-1 rounded-lg font-medium bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-300', style: {}, label: '' };
  }
  if (staff.gender === 'male') {
    return { className: 'w-full text-left text-[11px] px-2 py-1 rounded-lg font-medium bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300', style: {}, label: '' };
  }
  return { className: 'w-full text-left text-[11px] px-2 py-1 rounded-lg font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200', style: {}, label: '' };
}

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
  onDropStaff, onRemoveEntry, onUpdateEntry, isPublished, onUpdateRequirement, closedDays = [],
}) {
  const [dragOver, setDragOver] = useState(null);
  const [draggingStaff, setDraggingStaff] = useState(null);
  const [quickFillDay, setQuickFillDay] = useState(null);
  const [editingReqDay, setEditingReqDay] = useState(null);
  const [editingReqValue, setEditingReqValue] = useState('');
  const [showOffRequests, setShowOffRequests] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);

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

  const isClosedDay = (day) => {
    const dow = new Date(year, month - 1, day).getDay();
    return closedDays.includes(dow);
  };

  const handleDragOver = (e, day) => {
    if (!isClosedDay(day)) { e.preventDefault(); setDragOver(day); }
  };
  const handleDrop = (e, day) => {
    e.preventDefault(); setDragOver(null);
    if (draggingStaff && !isClosedDay(day)) { onDropStaff(draggingStaff, dateStr(day)); setDraggingStaff(null); }
  };

  // ワンタップ不足補充: 不足日クリックで候補スタッフ表示
  const getQuickFillCandidates = (day) => {
    if (isClosedDay(day)) return [];
    const date = dateStr(day);
    const dayEntries = getDayEntries(day);
    const alreadyIds = new Set(dayEntries.map(e => e.staff_id));
    // 希望休チェック（showOffRequests が false の場合のみ除外、ただし AM_OFF/PM_OFF は常に表示対象）
    const offEmails = !showOffRequests ? new Set(requests.filter(r => r.date === date && r.request_type === 'OFF').map(r => r.staff_email)) : new Set();
    return staff.filter(s => {
      if (alreadyIds.has(s.id)) return false;
      if (offEmails.has(s.email)) return false;
      const { canPlace } = canPlaceStaff(s, date, entries, []);
      return canPlace;
    });
  };

  const handleReqClick = (e, day) => {
    if (isPublished) return;
    e.stopPropagation();
    const req = getDayRequirement(day);
    setEditingReqDay(day);
    setEditingReqValue(String(req));
  };

  const handleReqSave = (day) => {
    const val = parseInt(editingReqValue, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateRequirement(dateStr(day), val);
    }
    setEditingReqDay(null);
  };

  const handleDayCellClick = (day) => {
    if (isClosedDay(day)) return;
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
                    className={`min-h-20 rounded-lg border-2 p-1 transition-all ${isClosedDay(day) ? 'bg-slate-200 opacity-50 border-slate-300' : statusStyles[status]} ${dragOver === day ? 'ring-2 ring-indigo-400 scale-105' : ''} ${status !== 'ok' && !isPublished && !isClosedDay(day) ? 'cursor-pointer' : ''}`}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => handleDrop(e, day)}
                    onClick={() => handleDayCellClick(day)}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[11px] font-bold ${dow === 0 ? 'text-red-600' : dow === 6 ? 'text-blue-600' : 'text-slate-600'}`}>
                        {day}<span className="text-[9px] ml-0.5 opacity-60">{DOW[dow]}</span>
                      </span>
                      {editingReqDay === day ? (
                        <input
                          type="number"
                          className="w-10 text-[10px] border border-indigo-400 rounded px-0.5 text-center font-bold bg-white z-10"
                          value={editingReqValue}
                          min={0}
                          autoFocus
                          onChange={e => setEditingReqValue(e.target.value)}
                          onBlur={() => handleReqSave(day)}
                          onKeyDown={e => { if (e.key === 'Enter') handleReqSave(day); if (e.key === 'Escape') setEditingReqDay(null); }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={`text-[9px] font-bold cursor-pointer px-0.5 rounded hover:bg-white/70 ${status === 'ok' ? 'text-green-600' : status === 'warn' ? 'text-yellow-600' : 'text-red-600'}`}
                          title="クリックで必要人数を変更"
                          onClick={(e) => handleReqClick(e, day)}
                        >
                          {dayEntries.length}/{req}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {dayEntries.map((entry, i) => {
                        const pattern = getShiftPattern(parseInt(entry.shift_type));
                        return (
                          <div
                            key={i}
                            className={`text-[10px] px-1 py-0.5 rounded flex items-center justify-between group font-bold ${pattern?.color || 'bg-slate-100 text-slate-600'}`}
                          >
                            <div className="truncate flex-1">
                              <div className="text-[9px]">{entry.staff_name?.split(' ').pop() || entry.staff_name}</div>
                              {pattern && <div className="text-[8px] opacity-80">{pattern.startTime}～{pattern.endTime}</div>}
                            </div>
                            {!isPublished && (
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 ml-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className="text-blue-600 hover:text-blue-800"
                                  onClick={(e) => { e.stopPropagation(); setEditingEntry(entry); }}
                                  title="編集"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  className="text-red-500 hover:text-red-700"
                                  onClick={(e) => { e.stopPropagation(); onRemoveEntry(entry); }}
                                  title="削除"
                                  type="button"
                                >×</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-indigo-700">{month}/{day} に入れる人</p>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showOffRequests}
                            onChange={(e) => setShowOffRequests(e.target.checked)}
                            className="w-3 h-3"
                          />
                          <span className="text-[9px] text-slate-600">希望休も表示</span>
                        </label>
                      </div>
                      {candidates.length === 0 ? (
                        <p className="text-[10px] text-slate-400">候補なし</p>
                      ) : (
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {candidates.map(s => {
                            const { className, style, label } = getCandidateStyle(s);
                            return (
                              <button
                                key={s.id}
                                className={className}
                                style={style}
                                onClick={() => { onDropStaff(s, dateStr(day)); setQuickFillDay(null); }}
                              >
                                {label}{s.full_name}
                              </button>
                            );
                          })}
                          <div className="flex gap-2 flex-wrap mt-1 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-0.5 text-[9px] text-pink-600">●女性</span>
                            <span className="flex items-center gap-0.5 text-[9px] text-sky-600">●男性</span>
                            <span className="flex items-center gap-0.5 text-[9px] text-purple-600">🌈資格者</span>
                          </div>
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

      {/* シフト編集ダイアログ */}
       {editingEntry && (
         <ShiftEditorDialog
           entry={editingEntry}
           isOpen={!!editingEntry}
           onClose={() => setEditingEntry(null)}
           onSave={(data) => {
             onUpdateEntry(editingEntry.id, data);
             setEditingEntry(null);
           }}
           onDelete={() => {
             onRemoveEntry(editingEntry);
             setEditingEntry(null);
           }}
         />
       )}
    </div>
  );
}