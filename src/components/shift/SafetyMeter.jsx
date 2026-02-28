import React from 'react';
import { getSafetyBgColor, getSafetyColor, getSafetyLabel } from './taxUtils';

export default function SafetyMeter({ score, predictedIncome, limit, compact = false }) {
  const barColor = getSafetyBgColor(score);
  const textColor = getSafetyColor(score);
  const label = getSafetyLabel(score);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, 100 - score))}%` }} />
        </div>
        <span className={`text-xs font-bold ${textColor}`}>{score}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">扶養安全度</span>
        <span className={`font-bold ${textColor}`}>{score}%（{label}）</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, 100 - score))}%` }}
        />
      </div>
      {limit < Infinity && (
        <div className="flex justify-between text-xs text-slate-400">
          <span>予測年収: ¥{predictedIncome?.toLocaleString()}</span>
          <span>上限: ¥{limit?.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}