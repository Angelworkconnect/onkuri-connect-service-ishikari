import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SHIFT_PATTERNS } from './shiftPatterns';
import { Trash2, Save } from 'lucide-react';

export default function ShiftEditorDialog({ entry, onSave, onDelete, onClose, isOpen }) {
  const [data, setData] = useState(entry || {});

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(data);
  };

  const handleDelete = () => {
    if (window.confirm('このシフトを削除しますか？')) {
      onDelete();
    }
  };

  const patternId = data.shift_type ? parseInt(data.shift_type) : null;
  const pattern = patternId ? SHIFT_PATTERNS.find(p => p.id === patternId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>シフト編集</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">日付</label>
            <Input
              type="date"
              value={data.date || ''}
              onChange={(e) => setData({ ...data, date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">スタッフ</label>
            <Input
              type="text"
              value={data.staff_name || ''}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">シフトパターン</label>
            <Select value={data.shift_type ? String(data.shift_type) : ''} onValueChange={(value) => {
              const pattern = SHIFT_PATTERNS.find(p => p.id === parseInt(value));
              const updatedData = {
                ...data,
                shift_type: value,
                start_time: pattern?.startTime,
                end_time: pattern?.endTime,
              };
              setData(updatedData);
              onSave(updatedData);
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="パターンを選択" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {SHIFT_PATTERNS.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pattern && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-900">
                {pattern.startTime}～{pattern.endTime}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">備考</label>
            <Textarea
              value={data.notes || ''}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              className="mt-1 h-20"
              placeholder="特記事項があれば記入"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="mr-auto"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            削除
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600">
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}