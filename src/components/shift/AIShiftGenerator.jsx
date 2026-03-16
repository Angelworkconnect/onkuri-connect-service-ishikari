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

const ROLE_OPTIONS = [
  { value: 'all', label: '全員' },
  { value: 'admin', label: '管理者' },
  { value: 'full_time', label: '正社員' },
  { value: 'part_time', label: 'パート' },
  { value: 'temporary', label: '単発' },
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

  const activeStaff = staff.filter(s =>
    s.status === 'active' &&
    s.approval_status === 'approved' &&
    s.display_in_shift_calendar !== false
  );

  const allEntries = [...entries];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const req = requirements.find(r => r.date === date);
    const required = req?.required_total || 3;
    const existing = allEntries.filter(e => e.date === date);
    if (existing.length >= required) continue;

    let candidates = activeStaff.filter(s => {
      if (offDates[s.email]?.has(date)) return false;
      const { canPlace } = canPlaceStaff(s, date, allEntries, []);
      if (!canPlace) return false;

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
  const [selectedRoles, setSelectedRoles] = useState(['all']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastWarnings, setLastWarnings] = useState([]);

  const toggleRole = (role) => {
    if (role === 'all') {
      setSelectedRoles(['all']);
      return;
    }
    setSelectedRoles(prev => {
      const withoutAll = prev.filter(r => r !== 'all');
      if (withoutAll.includes(role)) {
        const next = withoutAll.filter(r => r !== role);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, role];
      }
    });
  };

  const filteredStaff = selectedRoles.includes('all')
    ? staff
    : staff.filter(s => selectedRoles.includes(s.role));

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLastWarnings([]);
    await new Promise(r => setTimeout(r, 800));

    const { newEntries, warnings } = generateShifts({
      staff: filteredStaff, requests, requirements,
      entries: existingEntries,
      mode, year, month,
    });

    setLastWarnings(warnings);
    onGenerate(newEntries, warnings);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* AIモード選択 */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">AIモード</p>
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
      </div>

      {/* カテゴリー（役職）フィルター */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">対象カテゴリー（複数選択可）</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(opt => {
            const isSelected = selectedRoles.includes(opt.value);
            const count = opt.value === 'all'
              ? staff.filter(s => s.status === 'active' && s.approval_status === 'approved').length
              : staff.filter(s => s.role === opt.value && s.status === 'active' && s.approval_status === 'approved').length;
            return (
              <button
                key={opt.value}
                onClick={() => toggleRole(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {opt.label}
                <span className={`text-[11px] px-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          対象: {filteredStaff.filter(s => s.status === 'active' && s.approval_status === 'approved').length}名
        </p>
      </div>

      {/* 希望休マッチング状況 */}
      {requests.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-xs font-bold text-orange-700 mb-1">📅 希望休マッチング</p>
          <p className="text-xs text-orange-600">
            {requests.filter(r => r.request_type === 'OFF').length}件の希望休を考慮してシフトを生成します
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {[...new Set(requests.filter(r => r.request_type === 'OFF').map(r => r.staff_name))].slice(0, 6).map(name => (
              <span key={name} className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">{name}</span>
            ))}
            {[...new Set(requests.filter(r => r.request_type === 'OFF').map(r => r.staff_name))].length > 6 && (
              <span className="text-[10px] text-orange-500">他...</span>
            )}
          </div>
        </div>
      )}

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