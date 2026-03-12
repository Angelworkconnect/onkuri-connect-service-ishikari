import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, Clock } from "lucide-react";

export default function AttendanceEditDialog({ record, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    clock_in: '',
    clock_out: '',
    break_minutes: 0,
    notes: '',
    correction_reason: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && record) {
      setForm({
        clock_in: record.clock_in || '',
        clock_out: record.clock_out || '',
        break_minutes: record.break_minutes || 0,
        notes: record.notes || '',
        correction_reason: '',
      });
    }
  }, [open, record?.id]);

  const calcWorkTime = () => {
    if (!form.clock_in || !form.clock_out) return null;
    const [inH, inM] = form.clock_in.split(':').map(Number);
    const [outH, outM] = form.clock_out.split(':').map(Number);
    const minutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM) - (Number(form.break_minutes) || 0));
    return `${Math.floor(minutes / 60)}時間${minutes % 60 > 0 ? (minutes % 60) + '分' : ''}`;
  };

  const handleSave = async () => {
    if (!form.correction_reason.trim()) {
      alert('修正理由を入力してください');
      return;
    }
    setSaving(true);
    await base44.entities.Attendance.update(record.id, {
      clock_in: form.clock_in,
      clock_out: form.clock_out,
      break_minutes: Number(form.break_minutes) || 0,
      notes: form.notes,
      correction_reason: form.correction_reason,
      status: form.clock_out ? 'completed' : 'working',
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const workTime = calcWorkTime();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2D4A6F]" />
            勤怠編集
          </DialogTitle>
          {record && (
            <p className="text-sm text-slate-500 mt-1">
              {record.user_name || record.user_email} ／ {record.date}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>出勤時刻</Label>
              <Input
                type="time"
                value={form.clock_in}
                onChange={e => setForm(f => ({ ...f, clock_in: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>退勤時刻</Label>
              <Input
                type="time"
                value={form.clock_out}
                onChange={e => setForm(f => ({ ...f, clock_out: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>休憩時間（分）</Label>
            <Input
              type="number"
              min="0"
              value={form.break_minutes}
              onChange={e => setForm(f => ({ ...f, break_minutes: e.target.value }))}
            />
          </div>

          {workTime && (
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">実働時間（計算結果）</p>
              <p className="text-xl font-medium text-[#2D4A6F]">{workTime}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>備考</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="任意"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-red-600">修正理由 <span className="text-xs">（必須）</span></Label>
            <Textarea
              value={form.correction_reason}
              onChange={e => setForm(f => ({ ...f, correction_reason: e.target.value }))}
              rows={2}
              placeholder="例：本人からの申告により修正、システム誤打刻"
              className="border-red-200 focus-visible:ring-red-300"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}