import React from 'react';
import { AlertTriangle, Heart, Users, Car, Moon } from 'lucide-react';
import { canPlaceStaff, getAnnualLimit, calcYearlyIncomePrediction, calcSafetyScore } from './taxUtils';

function getShiftWarnings({ entries, staff, requirements, year, month, attendanceByEmail }) {
  const warnings = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEntries = entries.filter(e => e.date === date);
    const req = requirements.find(r => r.date === date);

    // 人員不足
    const required = req?.required_total || 3;
    if (dayEntries.length < required) {
      warnings.push({ type: 'short', icon: Users, color: 'text-red-600', bg: 'bg-red-50 border-red-200',
        message: `${month}/${d} — 人員不足 (${dayEntries.length}/${required}人)` });
    }

    // 看護師不足
    if (req?.required_nurse > 0) {
      const nurses = dayEntries.filter(e => {
        const s = staff.find(st => st.id === e.staff_id);
        return s?.skill_tags?.includes('看護師') || s?.role === 'nurse';
      }).length;
      if (nurses < req.required_nurse) {
        warnings.push({ type: 'nurse', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200',
          message: `${month}/${d} — 看護師不足 (${nurses}/${req.required_nurse}人)` });
      }
    }

    // 送迎不足
    if (req?.required_driver > 0) {
      const drivers = dayEntries.filter(e => {
        const s = staff.find(st => st.id === e.staff_id);
        return s?.skill_tags?.includes('送迎可') || e.shift_type === 'TRANSPORT';
      }).length;
      if (drivers < req.required_driver) {
        warnings.push({ type: 'driver', icon: Car, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200',
          message: `${month}/${d} — 送迎担当不足` });
      }
    }
  }

  // 連勤警告
  staff.forEach(s => {
    const maxDays = s.max_consecutive_days || 5;
    let streak = 0, maxStreak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (entries.some(e => e.staff_id === s.id && e.date === date)) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else streak = 0;
    }
    if (maxStreak > maxDays) {
      warnings.push({ type: 'consecutive', icon: Moon, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200',
        message: `${s.full_name} — ${maxStreak}連勤 (上限${maxDays}日)` });
    }
  });

  // 扶養危険
  staff.filter(s => s.tax_mode && s.tax_mode !== 'FULL').forEach(s => {
    const att = (attendanceByEmail || {})[s.email] || [];
    const pred = calcYearlyIncomePrediction(s, att);
    const score = calcSafetyScore(s, pred.predictedYearlyIncome);
    if (score < 20) {
      warnings.push({ type: 'fuyou', icon: Heart, color: 'text-red-600', bg: 'bg-red-50 border-red-200',
        message: `${s.full_name} — 扶養超過危険！ (安全度${score}%)` });
    } else if (score < 40) {
      warnings.push({ type: 'fuyou', icon: Heart, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200',
        message: `${s.full_name} — 扶養注意 (安全度${score}%)` });
    }
  });

  return warnings;
}

export default function ShiftWarningPanel({ entries, staff, requirements, year, month, attendanceByEmail }) {
  const warnings = getShiftWarnings({ entries, staff, requirements, year, month, attendanceByEmail });

  if (warnings.length === 0) return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
      <span className="text-green-500">✓</span> 問題なし — シフトは良好です
    </div>
  );

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        警告 {warnings.length}件
      </p>
      {warnings.slice(0, 5).map((w, i) => {
        const Icon = w.icon;
        return (
          <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${w.bg}`}>
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${w.color}`} />
            <span className={w.color}>{w.message}</span>
          </div>
        );
      })}
      {warnings.length > 5 && (
        <p className="text-xs text-slate-400 pl-2">他 {warnings.length - 5} 件の警告</p>
      )}
    </div>
  );
}