import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Sparkles, Shield, TrendingDown, Heart, Zap } from 'lucide-react';
import { canPlaceStaff, calcYearlyIncomePrediction, calcSafetyScore, getAnnualLimit } from './taxUtils';

const AI_MODES = [
  { id: 'STABLE', label: '安定', icon: Shield, color: 'bg-blue-100 text-blue-700 border-blue-300', desc: '公平重視' },
  { id: 'FIELD', label: '現場重視', icon: Zap, color: 'bg-orange-100 text-orange-700 border-orange-300', desc: 'ベテラン優先' },
  { id: 'COST', label: '人件費最適', icon: TrendingDown, color: 'bg-slate-100 text-slate-700 border-slate-300', desc: '最小コスト' },
  { id: 'FUYOU', label: '扶養保護', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-300', desc: 'ONKURI専用' },
];

function generateShifts({ staff, requests, requirements, entries, mode, year, month }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const newEntries = [];
  const warnings = [];

  const offDates = {};
  requests.forEach(r => {
    if (!offDates[r.staff_email]) offDates[r.staff_email] = new Set();
    if (r.request_type === 'OFF') offDates[r.staff_email].add(r.date);
  });

  const activeStaff = staff.filter(s => s.status === 'active' && s.approval_status === 'approved');

  // 既存のエントリと新生成エントリを合算してチェック
  const allEntries = [...entries];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const req = requirements.find(r => r.date === date);
    const required = req?.required_total || 3;
    const existing = allEntries.filter(e => e.date === date);
    if (existing.length >= required) continue;

    // 候補スタッフをフィルタ・ソート
    let candidates = activeStaff.filter(s => {
      if (offDates[s.email]?.has(date)) return false;
      const { canPlace } = canPlaceStaff(s, date, allEntries, []);
      if (!canPlace) return false;

      // 扶養チェック
      if (mode === 'FUYOU' && s.tax_mode !== 'FULL') {
        const limit = getAnnualLimit(s);
        if (limit < Infinity) {
          const monthHours = allEntries.filter(e => e.staff_id === s.id).length * 8;
          const estIncome = monthHours * (s.hourly_wage || 1000);
          if (estIncome >= limit * 0.95) return false;
        }
      }
      return true;
    });

    if (mode === 'FIELD') {
      candidates = candidates.sort((a, b) => {
        const aFull = a.employment_type === 'full_time' ? 0 : 1;
        const bFull = b.employment_type === 'full_time' ? 0 : 1;
        return aFull - bFull;
      });
    } else if (mode === 'COST') {
      candidates = candidates.sort((a, b) => (a.hourly_wage || 1000) - (b.hourly_wage || 1000));
    } else {
      // 今月配置の少ない順（公平）
      candidates = candidates.sort((a, b) => {
        const aCount = allEntries.filter(e => e.staff_id === a.id).length;
        const bCount = allEntries.filter(e => e.staff_id === b.id).length;
        return aCount - bCount;
      });
    }

    const need = required - existing.length;
    candidates.slice(0, need).forEach(s => {
      const entry = {
        date,
        staff_id: s.id,
        staff_email: s.email,
        staff_name: s.full_name,
        start_time: '09:00',
        end_time: '18:00',
        shift_type: 'FULL',
        auto_generated: true,
      };
      newEntries.push(entry);
      allEntries.push(entry);
    });

    const placed = allEntries.filter(e => e.date === date).length;
    if (placed < required) {
      warnings.push(`${month}/${d}: 必要人数${required}人に対し${placed}人のみ確保`);
    }
  }

  return { newEntries, warnings };
}

export default function AIShiftGenerator({ staff, requests, requirements, existingEntries, year, month, onGenerate }) {
  const [mode, setMode] = useState('STABLE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastWarnings, setLastWarnings] = useState([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLastWarnings([]);
    await new Promise(r => setTimeout(r, 800)); // 演出

    const { newEntries, warnings } = generateShifts({
      staff, requests, requirements,
      entries: existingEntries,
      mode, year, month,
    });

    setLastWarnings(warnings);
    onGenerate(newEntries, warnings);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {AI_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`border-2 rounded-xl p-2 text-center transition-all ${mode === m.id ? m.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            <m.icon className="w-4 h-4 mx-auto mb-0.5" />
            <div className="text-xs font-bold">{m.label}</div>
            <div className="text-[10px] opacity-70">{m.desc}</div>
          </button>
        ))}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12 text-base font-bold shadow-lg"
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AI生成中...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AIシフト生成
          </div>
        )}
      </Button>

      {lastWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-bold text-amber-700">⚠ 警告 ({lastWarnings.length}件)</p>
          {lastWarnings.slice(0, 3).map((w, i) => (
            <p key={i} className="text-xs text-amber-600">{w}</p>
          ))}
          {lastWarnings.length > 3 && <p className="text-xs text-amber-500">他 {lastWarnings.length - 3} 件</p>}
        </div>
      )}
    </div>
  );
}