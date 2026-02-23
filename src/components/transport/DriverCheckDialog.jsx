import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
          <DialogHeader>
            <DialogTitle>運転者健康確認</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="bg-emerald-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-slate-800">本日の確認は完了しています</p>
            <p className="text-sm text-slate-500 mt-2">
              健康状態：{todayCheck.fitForDuty === 'OK' ? '✅ 問題なし' : '⚠️ 要配慮'}
            </p>
            <p className="text-sm text-slate-500">
              アルコール確認：{todayCheck.alcoholCheck ? '✅ 実施済み' : '⚠️ 未記録'}
            </p>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={onClose}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">👤</span> 運転者健康確認（本日）
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* 健康状態 */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-600">健康状態・就業可否 *</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, fitForDuty: 'OK' }))}
                className={`rounded-2xl p-4 border-2 text-center transition-all ${
                  form.fitForDuty === 'OK'
                    ? 'border-emerald-400 bg-emerald-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-3xl mb-1">😊</p>
                <p className="text-sm font-bold text-emerald-700">問題なし</p>
                <p className="text-xs text-slate-500">就業可</p>
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, fitForDuty: 'CAUTION' }))}
                className={`rounded-2xl p-4 border-2 text-center transition-all ${
                  form.fitForDuty === 'CAUTION'
                    ? 'border-amber-400 bg-amber-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-3xl mb-1">😟</p>
                <p className="text-sm font-bold text-amber-700">要配慮</p>
                <p className="text-xs text-slate-500">管理者に報告</p>
              </button>
            </div>
          </div>

          {/* アルコール確認 */}
          <div className={`flex items-center justify-between rounded-2xl p-4 border-2 transition-all ${
            form.alcoholCheck ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
          }`}>
            <div>
              <p className="font-bold text-sm text-slate-800">🍺 アルコールチェック</p>
              <p className="text-xs text-slate-500">実施した場合はONにしてください</p>
            </div>
            <Switch
              checked={form.alcoholCheck}
              onCheckedChange={v => setForm(f => ({ ...f, alcoholCheck: v }))}
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">備考（任意）</label>
            <Input
              placeholder="特記事項があれば記入（体調不良の詳細など）"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? '記録中...' : '確認を記録する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}