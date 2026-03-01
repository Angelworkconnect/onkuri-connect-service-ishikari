import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { SHIFT_PATTERNS } from './shiftPatterns';

const COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-900 border-blue-300', label: '青' },
  { value: 'bg-indigo-100 text-indigo-900 border-indigo-300', label: '紺' },
  { value: 'bg-cyan-100 text-cyan-900 border-cyan-300', label: '水' },
  { value: 'bg-teal-100 text-teal-900 border-teal-300', label: '緑青' },
  { value: 'bg-emerald-100 text-emerald-900 border-emerald-300', label: '翠' },
  { value: 'bg-green-100 text-green-900 border-green-300', label: '緑' },
  { value: 'bg-lime-100 text-lime-900 border-lime-300', label: '黄緑' },
  { value: 'bg-yellow-100 text-yellow-900 border-yellow-300', label: '黄' },
  { value: 'bg-amber-100 text-amber-900 border-amber-300', label: '琥珀' },
  { value: 'bg-orange-100 text-orange-900 border-orange-300', label: '橙' },
  { value: 'bg-red-100 text-red-900 border-red-300', label: '赤' },
  { value: 'bg-rose-100 text-rose-900 border-rose-300', label: '薔薇' },
  { value: 'bg-pink-100 text-pink-900 border-pink-300', label: 'ピンク' },
  { value: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300', label: '紫紅' },
  { value: 'bg-purple-100 text-purple-900 border-purple-300', label: '紫' },
  { value: 'bg-violet-100 text-violet-900 border-violet-300', label: '菫' },
  { value: 'bg-slate-100 text-slate-900 border-slate-300', label: 'グレー' },
];

const STORAGE_KEY = 'custom_shift_patterns';

function loadPatterns() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return SHIFT_PATTERNS.map(p => ({ ...p, color: p.color + ' ' + p.borderColor }));
}

function savePatterns(patterns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
}

export default function ShiftLegend() {
  const [patterns, setPatterns] = useState(() => loadPatterns());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ label: '', startTime: '', endTime: '', color: COLOR_OPTIONS[0].value });

  const update = (newPatterns) => {
    setPatterns(newPatterns);
    savePatterns(newPatterns);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ label: p.label, startTime: p.startTime, endTime: p.endTime, color: p.color });
  };

  const saveEdit = (id) => {
    update(patterns.map(p => p.id === id ? { ...p, ...editForm } : p));
    setEditingId(null);
  };

  const deletePattern = (id) => {
    if (window.confirm('この凡例を削除しますか？')) {
      update(patterns.filter(p => p.id !== id));
    }
  };

  const addPattern = () => {
    if (!newForm.label || !newForm.startTime || !newForm.endTime) return;
    const newId = Math.max(0, ...patterns.map(p => p.id)) + 1;
    const colorParts = newForm.color.split(' ');
    update([...patterns, {
      id: newId,
      label: newForm.label,
      startTime: newForm.startTime,
      endTime: newForm.endTime,
      color: colorParts.slice(0, 2).join(' '),
      borderColor: colorParts[2] || 'border-slate-300',
    }]);
    setNewForm({ label: '', startTime: '', endTime: '', color: COLOR_OPTIONS[0].value });
    setAddingNew(false);
  };

  const resetToDefault = () => {
    if (window.confirm('デフォルトに戻しますか？カスタムの変更は失われます。')) {
      const defaults = SHIFT_PATTERNS.map(p => ({ ...p, color: p.color + ' ' + p.borderColor }));
      update(defaults);
    }
  };

  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800">シフトパターン凡例</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={resetToDefault}>
            リセット
          </Button>
          <Button size="sm" className="text-xs h-7 bg-indigo-600" onClick={() => setAddingNew(true)}>
            <Plus className="w-3 h-3 mr-1" />追加
          </Button>
        </div>
      </div>

      {/* 追加フォーム */}
      {addingNew && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
          <p className="text-xs font-bold text-indigo-700">新しいパターンを追加</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">ラベル</label>
              <Input className="h-7 text-xs" value={newForm.label} onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))} placeholder="例: ① 早番" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">色</label>
              <select className="w-full h-7 text-xs border border-slate-300 rounded px-1" value={newForm.color} onChange={e => setNewForm(f => ({ ...f, color: e.target.value }))}>
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">開始時刻</label>
              <Input className="h-7 text-xs" type="time" value={newForm.startTime} onChange={e => setNewForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">終了時刻</label>
              <Input className="h-7 text-xs" type="time" value={newForm.endTime} onChange={e => setNewForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingNew(false)}>キャンセル</Button>
            <Button size="sm" className="h-7 text-xs bg-indigo-600" onClick={addPattern}>追加</Button>
          </div>
        </div>
      )}

      {/* 凡例一覧 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {patterns.map((pattern) => {
          const colorClass = pattern.color.split(' ').slice(0, 2).join(' ');
          const borderClass = pattern.color.split(' ')[2] || pattern.borderColor || 'border-slate-300';
          const isEditing = editingId === pattern.id;
          return (
            <div key={pattern.id} className={`p-2 rounded border ${colorClass} ${borderClass} relative group`}>
              {isEditing ? (
                <div className="space-y-1.5">
                  <Input className="h-6 text-[11px] px-1 bg-white/80" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                  <div className="flex gap-1">
                    <Input className="h-6 text-[11px] px-1 bg-white/80 flex-1" type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} />
                    <span className="text-[10px] self-center">〜</span>
                    <Input className="h-6 text-[11px] px-1 bg-white/80 flex-1" type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} />
                  </div>
                  <select className="w-full h-6 text-[11px] border border-slate-300 rounded px-1 bg-white/80" value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}>
                    {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
                    <button onClick={() => saveEdit(pattern.id)} className="text-green-600 hover:text-green-800"><Check className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs font-bold">{pattern.label}</div>
                  <div className="text-[11px] mt-0.5">{pattern.startTime}〜{pattern.endTime}</div>
                  <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                    <button onClick={() => startEdit(pattern)} className="text-slate-600 hover:text-slate-900 bg-white/80 rounded p-0.5"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => deletePattern(pattern.id)} className="text-red-500 hover:text-red-700 bg-white/80 rounded p-0.5"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-3">※ 凡例の変更はこのブラウザに保存されます</p>
    </Card>
  );
}