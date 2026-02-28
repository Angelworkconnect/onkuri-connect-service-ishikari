import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const REQUEST_TYPES = {
  OFF: { label: '休み', color: 'bg-red-100 text-red-700 border-red-300' },
  AM_OFF: { label: '午前休', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  PM_OFF: { label: '午後休', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
};

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export default function ShiftRequestCalendar({ year, month, requests, onAdd, onRemove, isLocked }) {
  const [longPressDate, setLongPressDate] = useState(null);
  const [lpTimer, setLpTimer] = useState(null);
  const [confirmDay, setConfirmDay] = useState(null); // タップ確認用

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();

  const getRequest = (day) => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return requests.find(r => r.date === date);
  };

  const handleTap = (day) => {
    if (isLocked) return;
    const existing = getRequest(day);
    if (existing) {
      // 登録済み → 削除確認モーダル表示
      setConfirmDay(day);
    } else {
      // 未登録 → 即時 OFF 登録
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onAdd(date, 'OFF');
    }
  };

  const handleLongPressStart = (day) => {
    if (isLocked) return;
    const t = setTimeout(() => {
      setLongPressDate(day);
    }, 500);
    setLpTimer(t);
  };

  const handleLongPressEnd = () => {
    if (lpTimer) clearTimeout(lpTimer);
  };

  const selectType = (type) => {
    if (!longPressDate) return;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(longPressDate).padStart(2, '0')}`;
    const existing = getRequest(longPressDate);
    if (existing) onRemove(existing);
    onAdd(date, type);
    setLongPressDate(null);
  };

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="select-none">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d, i) => (
          <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const req = getRequest(day);
          const dow = (firstDow + day - 1) % 7;
          const isWeekend = dow === 0 || dow === 6;

          return (
            <button
              key={day}
              className={`
                relative aspect-square rounded-lg border text-sm font-medium transition-all active:scale-95
                ${req ? REQUEST_TYPES[req.request_type]?.color || 'bg-red-100 text-red-700 border-red-300' : 
                  isWeekend ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-700'}
                ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
              `}
              onClick={() => handleTap(day)}
              onMouseDown={() => handleLongPressStart(day)}
              onMouseUp={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(day)}
              onTouchEnd={handleLongPressEnd}
            >
              <span className="text-xs">{day}</span>
              {req && (
                <div className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] leading-tight">
                  {REQUEST_TYPES[req.request_type]?.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 長押しメニュー */}
      {longPressDate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setLongPressDate(null)}>
          <div className="bg-white rounded-2xl p-5 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-center font-bold text-slate-800 mb-4">{month}/{longPressDate} の希望</p>
            <div className="space-y-2">
              {Object.entries(REQUEST_TYPES).map(([type, info]) => (
                <button
                  key={type}
                  className={`w-full py-3 rounded-xl border-2 font-medium ${info.color}`}
                  onClick={() => selectType(type)}
                >
                  {info.label}
                </button>
              ))}
            </div>
            <button className="w-full mt-3 py-2 text-slate-400 text-sm" onClick={() => setLongPressDate(null)}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 凡例 */}
      <div className="flex gap-3 mt-3 flex-wrap">
        {Object.entries(REQUEST_TYPES).map(([type, info]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded border ${info.color}`} />
            <span className="text-xs text-slate-500">{info.label}</span>
          </div>
        ))}
        {isLocked && <Badge className="bg-red-100 text-red-700 text-xs">締切済み・編集不可</Badge>}
      </div>
    </div>
  );
}