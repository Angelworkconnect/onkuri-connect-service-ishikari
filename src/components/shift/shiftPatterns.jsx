// シフト時間パターン
export const SHIFT_PATTERNS = [
  // ── 通常フル ──
  { id: 1,  label: '① 8:00〜17:00', startTime: '08:00', endTime: '17:00', color: 'bg-blue-100 text-blue-900',    borderColor: 'border-blue-300',    category: 'フル' },
  { id: 2,  label: '② 8:30〜17:30', startTime: '08:30', endTime: '17:30', color: 'bg-indigo-100 text-indigo-900', borderColor: 'border-indigo-300',  category: 'フル' },
  { id: 3,  label: '③ 8:30〜17:00', startTime: '08:30', endTime: '17:00', color: 'bg-cyan-100 text-cyan-900',    borderColor: 'border-cyan-300',    category: 'フル' },
  { id: 4,  label: '④ 8:30〜16:00', startTime: '08:30', endTime: '16:00', color: 'bg-teal-100 text-teal-900',    borderColor: 'border-teal-300',    category: 'フル' },
  { id: 5,  label: '⑤ 8:30〜16:30', startTime: '08:30', endTime: '16:30', color: 'bg-emerald-100 text-emerald-900', borderColor: 'border-emerald-300', category: 'フル' },
  { id: 6,  label: '⑥ 9:00〜17:30', startTime: '09:00', endTime: '17:30', color: 'bg-green-100 text-green-900',  borderColor: 'border-green-300',   category: 'フル' },
  { id: 7,  label: '⑦ 9:00〜16:00', startTime: '09:00', endTime: '16:00', color: 'bg-lime-100 text-lime-900',    borderColor: 'border-lime-300',    category: 'フル' },
  { id: 8,  label: '⑧ 9:00〜16:30', startTime: '09:00', endTime: '16:30', color: 'bg-yellow-100 text-yellow-900', borderColor: 'border-yellow-300',  category: 'フル' },
  { id: 9,  label: '⑨ 9:00〜17:00', startTime: '09:00', endTime: '17:00', color: 'bg-amber-100 text-amber-900',  borderColor: 'border-amber-300',   category: 'フル' },
  { id: 14, label: '⑭ 9:30〜17:00', startTime: '09:30', endTime: '17:00', color: 'bg-fuchsia-100 text-fuchsia-900', borderColor: 'border-fuchsia-300', category: 'フル' },

  // ── 早番 ──
  { id: 20, label: '早① 7:00〜15:00', startTime: '07:00', endTime: '15:00', color: 'bg-sky-100 text-sky-900',      borderColor: 'border-sky-300',     category: '早番' },
  { id: 21, label: '早② 7:30〜15:30', startTime: '07:30', endTime: '15:30', color: 'bg-sky-200 text-sky-900',      borderColor: 'border-sky-400',     category: '早番' },
  { id: 22, label: '早③ 7:00〜16:00', startTime: '07:00', endTime: '16:00', color: 'bg-blue-50 text-blue-900',     borderColor: 'border-blue-200',    category: '早番' },

  // ── 遅番 ──
  { id: 30, label: '遅① 11:00〜19:00', startTime: '11:00', endTime: '19:00', color: 'bg-violet-100 text-violet-900', borderColor: 'border-violet-300',  category: '遅番' },
  { id: 31, label: '遅② 12:00〜20:00', startTime: '12:00', endTime: '20:00', color: 'bg-purple-100 text-purple-900', borderColor: 'border-purple-300',  category: '遅番' },
  { id: 32, label: '遅③ 13:00〜21:00', startTime: '13:00', endTime: '21:00', color: 'bg-purple-200 text-purple-900', borderColor: 'border-purple-400',  category: '遅番' },

  // ── 午前 ──
  { id: 10, label: '⑩ 8:30〜13:00', startTime: '08:30', endTime: '13:00', color: 'bg-orange-100 text-orange-900', borderColor: 'border-orange-300',  category: '午前' },
  { id: 11, label: '⑪ 9:00〜13:00', startTime: '09:00', endTime: '13:00', color: 'bg-red-100 text-red-900',      borderColor: 'border-red-300',     category: '午前' },
  { id: 12, label: '⑫ 9:15〜13:15', startTime: '09:15', endTime: '13:15', color: 'bg-rose-100 text-rose-900',    borderColor: 'border-rose-300',    category: '午前' },
  { id: 16, label: '⑯ 9:15〜12:30', startTime: '09:15', endTime: '12:30', color: 'bg-violet-100 text-violet-900', borderColor: 'border-violet-300',  category: '午前' },
  { id: 17, label: '⑰ 9:30〜12:30', startTime: '09:30', endTime: '12:30', color: 'bg-slate-100 text-slate-900',  borderColor: 'border-slate-300',   category: '午前' },

  // ── 午後 ──
  { id: 13, label: '⑬ 12:30〜17:00', startTime: '12:30', endTime: '17:00', color: 'bg-pink-100 text-pink-900',    borderColor: 'border-pink-300',    category: '午後' },
  { id: 15, label: '⑮ 9:30〜14:00',  startTime: '09:30', endTime: '14:00', color: 'bg-purple-100 text-purple-900', borderColor: 'border-purple-300',  category: '午後' },
  { id: 18, label: '⑱ 9:00〜14:00',  startTime: '09:00', endTime: '14:00', color: 'bg-gray-100 text-gray-900',    borderColor: 'border-gray-300',    category: '午後' },

  // ── 送迎 ──
  { id: 40, label: '送迎① 8:00〜10:00', startTime: '08:00', endTime: '10:00', color: 'bg-green-200 text-green-900', borderColor: 'border-green-400',  category: '送迎' },
  { id: 41, label: '送迎② 16:00〜18:00', startTime: '16:00', endTime: '18:00', color: 'bg-teal-200 text-teal-900', borderColor: 'border-teal-400',   category: '送迎' },
  { id: 42, label: '送迎③ 8:00〜10:00 / 15:30〜18:00', startTime: '08:00', endTime: '18:00', color: 'bg-emerald-200 text-emerald-900', borderColor: 'border-emerald-400', category: '送迎' },

  // ── 夜間・宿直 ──
  { id: 50, label: '夜① 17:00〜翌9:00',  startTime: '17:00', endTime: '09:00', color: 'bg-slate-700 text-white',    borderColor: 'border-slate-500',   category: '夜間' },
  { id: 51, label: '夜② 21:00〜翌6:00',  startTime: '21:00', endTime: '06:00', color: 'bg-slate-800 text-white',    borderColor: 'border-slate-600',   category: '夜間' },
  { id: 52, label: '宿直 17:00〜翌8:30', startTime: '17:00', endTime: '08:30', color: 'bg-gray-700 text-white',     borderColor: 'border-gray-500',    category: '夜間' },

  // ── 研修・その他 ──
  { id: 60, label: '研修 9:00〜17:00',  startTime: '09:00', endTime: '17:00', color: 'bg-yellow-200 text-yellow-900', borderColor: 'border-yellow-400', category: 'その他' },
  { id: 61, label: '会議 10:00〜12:00', startTime: '10:00', endTime: '12:00', color: 'bg-amber-200 text-amber-900',   borderColor: 'border-amber-400',  category: 'その他' },
];

export const SHIFT_CATEGORIES = ['フル', '早番', '遅番', '午前', '午後', '送迎', '夜間', 'その他'];

export const getShiftPattern = (patternId) => SHIFT_PATTERNS.find(p => p.id === patternId);
export const getShiftColor = (patternId) => getShiftPattern(patternId)?.color || 'bg-gray-100 text-gray-900';
export const getShiftLabel = (patternId) => getShiftPattern(patternId)?.label || '不明';
export const getShiftTime = (patternId) => {
  const p = getShiftPattern(patternId);
  return p ? `${p.startTime}～${p.endTime}` : '';
};