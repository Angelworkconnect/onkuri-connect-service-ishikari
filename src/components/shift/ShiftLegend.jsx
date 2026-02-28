import React from 'react';
import { Card } from '@/components/ui/card';
import { SHIFT_PATTERNS } from './shiftPatterns';

export default function ShiftLegend() {
  return (
    <Card className="p-4 border-0 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-3">シフトパターン凡例</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {SHIFT_PATTERNS.map((pattern) => (
          <div key={pattern.id} className={`p-2 rounded border ${pattern.color} ${pattern.borderColor} text-center text-xs font-medium`}>
            <div className="font-bold">{pattern.label.split(' ')[0]}</div>
            <div className="text-[11px] mt-0.5">{pattern.startTime}～</div>
            <div className="text-[11px]">{pattern.endTime}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}