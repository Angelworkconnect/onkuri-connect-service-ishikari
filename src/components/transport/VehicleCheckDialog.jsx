import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

const today = format(new Date(), 'yyyy-MM-dd');
const fuelLabels = { FULL: 'FULL', '3_4': '3/4', HALF: '1/2', '1_4': '1/4', LOW: '少（要給油）' };

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
    { key: 'tireOK', label: 'タイヤ（空気圧・摩耗）' },
    { key: 'lightsOK', label: 'ライト類' },
    { key: 'brakeOK', label: 'ブレーキ' },
    { key: 'exteriorDamageNone', label: '外装に傷・凹みなし' },
    { key: 'interiorOK', label: '車内清潔・備品OK' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>車両使用前点検</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">車両を選択 *</label>
            <div className="grid grid-cols-1 gap-2">
              {vehicles.map(v => (
                <button key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`flex items-center justify-between p-3 border rounded-lg text-left transition-colors ${
                    selectedVehicleId === v.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium">{v.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{v.plateNumber}</span>
                  </div>
                  {checkedVehicleIds.has(v.id)
                    ? <Badge className="bg-green-100 text-green-700 text-xs">点検済</Badge>
                    : <Badge className="bg-amber-100 text-amber-700 text-xs">未点検</Badge>
                  }
                </button>
              ))}
            </div>
          </div>

          {selectedVehicleId && checkedVehicleIds.has(selectedVehicleId) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">この車両は本日点検済みです</span>
            </div>
          )}

          {selectedVehicleId && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-2 block">燃料レベル</label>
                <Select value={form.fuelLevel} onValueChange={v => setForm(f => ({ ...f, fuelLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(fuelLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-700">点検チェック（問題なし ✅）</p>
                {checkItems.map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <Switch
                      checked={form[item.key]}
                      onCheckedChange={v => setForm(f => ({ ...f, [item.key]: v }))}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">その他異常あり</span>
                  <Switch
                    checked={form.otherIssue}
                    onCheckedChange={v => setForm(f => ({ ...f, otherIssue: v }))}
                  />
                </div>
                {form.otherIssue && (
                  <Input placeholder="異常内容を記入" value={form.issueNote}
                    onChange={e => setForm(f => ({ ...f, issueNote: e.target.value }))} />
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!selectedVehicleId || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            点検を記録する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}