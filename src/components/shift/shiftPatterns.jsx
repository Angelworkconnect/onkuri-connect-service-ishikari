// シフト時間パターン（1～18）
export const SHIFT_PATTERNS = [
  { id: 1, label: '① 8:00～17:00', startTime: '08:00', endTime: '17:00', color: 'bg-blue-100 text-blue-900', borderColor: 'border-blue-300' },
  { id: 2, label: '② 8:30～17:30', startTime: '08:30', endTime: '17:30', color: 'bg-indigo-100 text-indigo-900', borderColor: 'border-indigo-300' },
  { id: 3, label: '③ 8:30～17:00', startTime: '08:30', endTime: '17:00', color: 'bg-cyan-100 text-cyan-900', borderColor: 'border-cyan-300' },
  { id: 4, label: '④ 8:30～16:00', startTime: '08:30', endTime: '16:00', color: 'bg-teal-100 text-teal-900', borderColor: 'border-teal-300' },
  { id: 5, label: '⑤ 8:30～16:30', startTime: '08:30', endTime: '16:30', color: 'bg-emerald-100 text-emerald-900', borderColor: 'border-emerald-300' },
  { id: 6, label: '⑥ 9:00～17:30', startTime: '09:00', endTime: '17:30', color: 'bg-green-100 text-green-900', borderColor: 'border-green-300' },
  { id: 7, label: '⑦ 9:00～16:00', startTime: '09:00', endTime: '16:00', color: 'bg-lime-100 text-lime-900', borderColor: 'border-lime-300' },
  { id: 8, label: '⑧ 9:00～16:30', startTime: '09:00', endTime: '16:30', color: 'bg-yellow-100 text-yellow-900', borderColor: 'border-yellow-300' },
  { id: 9, label: '⑨ 9:00～17:00', startTime: '09:00', endTime: '17:00', color: 'bg-amber-100 text-amber-900', borderColor: 'border-amber-300' },
  { id: 10, label: '⑩ 8:30～13:00', startTime: '08:30', endTime: '13:00', color: 'bg-orange-100 text-orange-900', borderColor: 'border-orange-300' },
  { id: 11, label: '⑪ 9:00～13:00', startTime: '09:00', endTime: '13:00', color: 'bg-red-100 text-red-900', borderColor: 'border-red-300' },
  { id: 12, label: '⑫ 9:15～13:15', startTime: '09:15', endTime: '13:15', color: 'bg-rose-100 text-rose-900', borderColor: 'border-rose-300' },
  { id: 13, label: '⑬ 12:30～17:00', startTime: '12:30', endTime: '17:00', color: 'bg-pink-100 text-pink-900', borderColor: 'border-pink-300' },
  { id: 14, label: '⑭ 9:30～17:00', startTime: '09:30', endTime: '17:00', color: 'bg-fuchsia-100 text-fuchsia-900', borderColor: 'border-fuchsia-300' },
  { id: 15, label: '⑮ 9:30～14:00', startTime: '09:30', endTime: '14:00', color: 'bg-purple-100 text-purple-900', borderColor: 'border-purple-300' },
  { id: 16, label: '⑯ 9:15～12:30', startTime: '09:15', endTime: '12:30', color: 'bg-violet-100 text-violet-900', borderColor: 'border-violet-300' },
  { id: 17, label: '⑰ 9:30～12:30', startTime: '09:30', endTime: '12:30', color: 'bg-slate-100 text-slate-900', borderColor: 'border-slate-300' },
  { id: 18, label: '⑱ 9:00～14:00', startTime: '09:00', endTime: '14:00', color: 'bg-gray-100 text-gray-900', borderColor: 'border-gray-300' },
];

export const getShiftPattern = (patternId) => {
  return SHIFT_PATTERNS.find(p => p.id === patternId);
};

export const getShiftColor = (patternId) => {
  const pattern = getShiftPattern(patternId);
  return pattern?.color || 'bg-gray-100 text-gray-900';
};

export const getShiftLabel = (patternId) => {
  const pattern = getShiftPattern(patternId);
  return pattern?.label || '不明';
};

export const getShiftTime = (patternId) => {
  const pattern = getShiftPattern(patternId);
  return pattern ? `${pattern.startTime}～${pattern.endTime}` : '';
};