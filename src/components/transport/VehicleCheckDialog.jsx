import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

const today = format(new Date(), 'yyyy-MM-dd');
const fuelLabels = { FULL: '満タン', '3_4': '3/4', HALF: '半分', '1_4': '1/4', LOW: '少ない（要給油）' };
const fuelColors = { FULL: 'bg-emerald-500', '3_4': 'bg-emerald-400', HALF: 'bg-yellow-400', '1_4': 'bg-orange-400', LOW: 'bg-red-500' };

export default function VehicleCheckDialog({ open, onClose, user, vehicles, todayChecks, onSuccess }) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [form, setForm] = useState({
    fuelLevel: 'FULL',
    tireOK: true,
    lightsOK: true,
    brakeOK: true,
    exteriorDamageNone: true,
    interiorOK: true,
    otherIssue: false,
    issueNote: '',
  });

  const checkedVehicleIds = new Set(todayChecks.map(c => c.vehicleId));

  const saveMutation = useMutation({
    mutationFn: () => {
      const v = vehicles.find(v => v.id === selectedVehicleId);
      return base44.entities.VehiclePreCheck.create({
        date: today,
        vehicleId: selectedVehicleId,
        vehicleName: v?.name || '',
        checkerEmail: user?.email || '',
        checkerName: user?.full_name || user?.email || '',
        ...form,
        checkedAtUtcMs: Date.now(),
      });
    },
    onSuccess: () => { onSuccess?.(); onClose(); },
  });

  const checkItems = [
    { key: 'tireOK', label: 'タイヤ', desc: '空気圧・摩耗の確認', emoji: '🛞' },
    { key: 'lightsOK', label: 'ライト類', desc: '前後ライト点灯確認', emoji: '💡' },
    { key: 'brakeOK', label: 'ブレーキ', desc: 'ブレーキの効き確認', emoji: '🛑' },
    { key: 'exteriorDamageNone', label: '外装', desc: '傷・凹みがないこと', emoji: '🚗' },
    { key: 'interiorOK', label: '車内', desc: '清潔・備品の確認', emoji: '🪑' },
  ];

  const isAlreadyChecked = selectedVehicleId && checkedVehicleIds.has(selectedVehicleId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🚌</span> 車両使用前点検
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* 車両選択 */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2">使用する車両を選択 *</p>
            <div className="grid grid-cols-1 gap-2">
              {vehicles.map(v => (
                <button key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                    selectedVehicleId === v.id
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm text-slate-800">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.plateNumber}</p>
                  </div>
                  {checkedVehicleIds.has(v.id)
                    ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ 点検済</span>
                    : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">未点検</span>
                  }
                </button>
              ))}
            </div>
          </div>

          {isAlreadyChecked && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-800 text-sm">この車両は本日点検済みです</p>
                <p className="text-emerald-600 text-xs mt-0.5">再度点検する場合は記録できます</p>
              </div>
            </div>
          )}

          {selectedVehicleId && (
            <>
              {/* 燃料レベル */}
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">⛽ 燃料レベル</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(fuelLabels).map(([k, label]) => (
                    <button key={k}
                      onClick={() => setForm(f => ({ ...f, fuelLevel: k }))}
                      className={`rounded-xl py-2 px-1 text-center border-2 transition-all ${
                        form.fuelLevel === k
                          ? `${fuelColors[k]} text-white border-transparent shadow-sm`
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <p className="text-xs font-bold">{label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* チェック項目 */}
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">点検項目（問題ない項目はON）</p>
                <div className="space-y-2">
                  {checkItems.map(item => (
                    <button key={item.key}
                      onClick={() => setForm(f => ({ ...f, [item.key]: !f[item.key] }))}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        form[item.key]
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.emoji}</span>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                        form[item.key] ? 'text-emerald-700' : 'text-red-600'
                      }`}>
                        {form[item.key] ? '✅ OK' : '❌ NG'}
                      </span>
                    </button>
                  ))}

                  {/* その他異常 */}
                  <button
                    onClick={() => setForm(f => ({ ...f, otherIssue: !f.otherIssue }))}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      form.otherIssue ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">その他の異常</p>
                        <p className="text-xs text-slate-500">上記以外の気になる点</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      form.otherIssue ? 'text-red-600' : 'text-slate-400'
                    }`}>
                      {form.otherIssue ? '⚠️ あり' : 'なし'}
                    </span>
                  </button>

                  {form.otherIssue && (
                    <Input
                      placeholder="異常の内容を詳しく記入してください"
                      value={form.issueNote}
                      onChange={e => setForm(f => ({ ...f, issueNote: e.target.value }))}
                      className="border-2 border-red-200 focus:border-red-400"
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold"
            disabled={!selectedVehicleId || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? '記録中...' : '点検を記録する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}