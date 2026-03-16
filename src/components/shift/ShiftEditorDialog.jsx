import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SHIFT_PATTERNS, SHIFT_CATEGORIES } from './shiftPatterns';
import { Trash2, Save, Clock, LayoutGrid } from 'lucide-react';

export default function ShiftEditorDialog({ entry, onSave, onDelete, onClose, isOpen }) {
  const [data, setData] = useState(entry || {});
  const [inputMode, setInputMode] = useState('pattern'); // 'pattern' | 'manual'
  const [selectedCategory, setSelectedCategory] = useState('フル');

  if (!isOpen) return null;

  const handlePatternSelect = (pattern) => {
    setData({ ...data, shift_pattern_id: pattern.id, start_time: pattern.startTime, end_time: pattern.endTime });
  };

  const handleDelete = () => {
    onDelete();
  };

  const handleSave = () => {
    onSave(data);
  };

  const filteredPatterns = SHIFT_PATTERNS.filter(p => p.category === selectedCategory);
  const selectedPattern = SHIFT_PATTERNS.find(p => p.id === data.shift_pattern_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            シフト編集
            <span className="text-sm font-normal text-slate-500">{data.staff_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 日付 */}
          <div>
            <label className="text-sm font-medium text-slate-600">日付</label>
            <Input
              type="date"
              value={data.date || ''}
              onChange={(e) => setData({ ...data, date: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* 入力モード切替 */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('pattern')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${inputMode === 'pattern' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              <LayoutGrid className="w-4 h-4" />パターン選択
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${inputMode === 'manual' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              <Clock className="w-4 h-4" />手動入力
            </button>
          </div>

          {inputMode === 'pattern' ? (
            <div className="space-y-3">
              {/* カテゴリタブ */}
              <div className="flex flex-wrap gap-1">
                {SHIFT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* パターン一覧 */}
              <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-1">
                {filteredPatterns.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePatternSelect(p)}
                    className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${data.shift_pattern_id === p.id ? `${p.color} ${p.borderColor} ring-2 ring-indigo-400 ring-offset-1` : `${p.color} ${p.borderColor} hover:ring-1 hover:ring-indigo-300`}`}
                  >
                    <span>{p.label}</span>
                    <span className="ml-2 text-xs opacity-60">{p.startTime}〜{p.endTime}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 手動入力 */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-600">開始時刻</label>
                <Input
                  type="time"
                  value={data.start_time || ''}
                  onChange={(e) => setData({ ...data, start_time: e.target.value, shift_pattern_id: null })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">終了時刻</label>
                <Input
                  type="time"
                  value={data.end_time || ''}
                  onChange={(e) => setData({ ...data, end_time: e.target.value, shift_pattern_id: null })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* 現在の時間表示 */}
          {(data.start_time || data.end_time) && (
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${selectedPattern ? `${selectedPattern.color} border ${selectedPattern.borderColor}` : 'bg-slate-100 text-slate-800 border border-slate-300'}`}>
              🕐 {data.start_time || '--:--'} 〜 {data.end_time || '--:--'}
              {selectedPattern && <span className="ml-2 text-xs opacity-70">({selectedPattern.label})</span>}
            </div>
          )}

          {/* 備考 */}
          <div>
            <label className="text-sm font-medium text-slate-600">備考</label>
            <Textarea
              value={data.notes || ''}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              className="mt-1 h-16"
              placeholder="特記事項があれば記入"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between mt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="mr-auto gap-1"
          >
            <Trash2 className="w-4 h-4" />
            完全削除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 gap-1">
              <Save className="w-4 h-4" />
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}