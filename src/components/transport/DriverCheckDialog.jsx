import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CheckCircle } from 'lucide-react';

const today = format(new Date(), 'yyyy-MM-dd');

export default function DriverCheckDialog({ open, onClose, user, todayCheck, onSuccess }) {
  const [form, setForm] = useState({ fitForDuty: 'OK', alcoholCheck: false, notes: '' });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.DriverDailyCheck.create({
      date: today,
      driverEmail: user?.email || '',
      driverName: user?.full_name || user?.email || '',
      fitForDuty: form.fitForDuty,
      alcoholCheck: form.alcoholCheck,
      notes: form.notes,
      createdAtUtcMs: Date.now(),
    }),
    onSuccess: () => { onSuccess?.(); onClose(); },
  });

  if (todayCheck) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>運転者健康確認</DialogTitle></DialogHeader>
          <div className="py-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-medium text-slate-800">本日の確認は済んでいます</p>
            <p className="text-sm text-slate-500 mt-1">
              状態：{todayCheck.fitForDuty === 'OK' ? '✅ 問題なし' : '⚠️ 要配慮'}
            </p>
          </div>
          <DialogFooter><Button onClick={onClose}>閉じる</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>運転者健康確認（本日）</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">健康状態・就業可否 *</label>
            <Select value={form.fitForDuty} onValueChange={v => setForm(f => ({ ...f, fitForDuty: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OK">✅ 問題なし（就業可）</SelectItem>
                <SelectItem value="CAUTION">⚠️ 要配慮（管理者に報告）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.alcoholCheck} onCheckedChange={v => setForm(f => ({ ...f, alcoholCheck: v }))} />
            <span className="text-sm text-slate-700">アルコールチェック実施済み</span>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">備考（任意）</label>
            <Input placeholder="特記事項があれば記入" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button className="bg-green-600 hover:bg-green-700" disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}>
            確認を記録する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}