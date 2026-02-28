import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, CheckCircle2 } from 'lucide-react';
import { getAnnualLimit, calcYearlyIncomePrediction, calcSafetyScore } from './taxUtils';

export default function FuyouOptimizeButton({ entries, staff, requirements, year, month, attendanceByEmail, onRemoveEntry, onDropStaff }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleOptimize = async () => {
    setRunning(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 600));

    let removed = 0;
    // 扶養超過リスクのある職員の配置を後ろから削除
    const riskStaff = staff.filter(s => {
      if (!s.tax_mode || s.tax_mode === 'FULL') return false;
      const att = (attendanceByEmail || {})[s.email] || [];
      const pred = calcYearlyIncomePrediction(s, att);
      const score = calcSafetyScore(s, pred.predictedYearlyIncome);
      return score < 30;
    });

    // 月末から順に削除（必要人数を割らない範囲で）
    const sortedDangerEntries = entries
      .filter(e => riskStaff.some(s => s.id === e.staff_id))
      .sort((a, b) => b.date.localeCompare(a.date)); // 月末優先削除

    for (const entry of sortedDangerEntries) {
      const dayEntries = entries.filter(e => e.date === entry.date);
      const req = requirements.find(r => r.date === entry.date)?.required_total || 3;
      if (dayEntries.length > req) {
        // 余裕があれば削除
        onRemoveEntry(entry);
        removed++;
        if (removed >= 5) break; // 一度に最大5件
      }
    }

    setResult(removed > 0
      ? `${removed}件の配置を最適化しました`
      : '現状で最適な配置です'
    );
    setRunning(false);
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleOptimize}
        disabled={running}
        variant="outline"
        className="w-full border-pink-300 text-pink-700 hover:bg-pink-50"
      >
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />最適化中...</>
        ) : (
          <><Heart className="w-4 h-4 mr-2" />扶養最適化</>
        )}
      </Button>
      {result && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {result}
        </div>
      )}
    </div>
  );
}