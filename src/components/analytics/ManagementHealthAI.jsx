import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Users, Activity, DollarSign, BarChart3, RefreshCw, Brain,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── スコアリングロジック ──────────────────────────────────────

function computeHealthScore({ settings, dayUsages, staff, attendance, shiftEntries, tips }) {
  const reasons = [];
  const recommendations = [];
  let score = 60; // ベーススコア

  // 1. 稼働率チェック（利用者数 / 定員）
  const capacity = settings?.capacity || 0;
  const recentUsages = dayUsages.slice(0, 30);
  const avgUsers = recentUsages.length > 0
    ? recentUsages.reduce((s, d) => s + (d.user_count || 0), 0) / recentUsages.length
    : 0;
  const occupancyRate = capacity > 0 ? Math.min(100, Math.round((avgUsers / capacity) * 100)) : null;

  if (occupancyRate !== null) {
    if (occupancyRate >= 85) {
      score += 15;
      reasons.push('✅ 稼働率が高く安定しています（' + occupancyRate + '%）');
    } else if (occupancyRate >= 70) {
      score += 5;
      reasons.push('⚠️ 稼働率はやや低めです（' + occupancyRate + '%）');
      recommendations.push('稼働率の低い曜日を確認し、利用者確保策を検討してください');
    } else {
      score -= 15;
      reasons.push('❌ 稼働率が低く、収益に影響しています（' + occupancyRate + '%）');
      recommendations.push('稼働率が低下しています。利用者獲得や曜日別対策を早急に検討してください');
    }
  } else {
    reasons.push('ℹ️ 稼働率データが設定されていません');
    recommendations.push('経営設定から定員・単価を設定してください');
  }

  // 2. 売上・利益チェック
  const unitPrice = settings?.unit_price || 0;
  const fixedCost = settings?.fixed_cost || 0;
  const monthlyDays = settings?.monthly_business_days || 22;
  const estimatedRevenue = unitPrice * avgUsers * monthlyDays;
  const estimatedProfit = estimatedRevenue - fixedCost;
  const profitMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : null;

  if (profitMargin !== null) {
    if (profitMargin >= 20) {
      score += 10;
      reasons.push('✅ 利益率が良好です（推定' + Math.round(profitMargin) + '%）');
    } else if (profitMargin >= 5) {
      reasons.push('⚠️ 利益率に改善余地があります（推定' + Math.round(profitMargin) + '%）');
      recommendations.push('固定費の見直しや稼働率向上で利益改善が期待できます');
    } else if (profitMargin < 5) {
      score -= 15;
      reasons.push('❌ 利益率が低い状態です（推定' + Math.round(profitMargin) + '%）');
      recommendations.push('利益率が低下しています。コスト削減または稼働率向上が必要です');
    }
  }

  // 3. 人件費率チェック（職員数 × 給与推定 / 売上）
  const activeStaff = staff.filter(s => s.status === 'active');
  const staffCount = activeStaff.length;
  const avgWage = activeStaff.reduce((s, st) => s + (st.hourly_wage || 1000), 0) / Math.max(1, staffCount);
  // 月160h × 平均時給 × 職員数 で人件費推定
  const estimatedLaborCost = avgWage * 160 * staffCount;
  const laborRate = estimatedRevenue > 0 ? (estimatedLaborCost / estimatedRevenue) * 100 : null;

  if (laborRate !== null) {
    if (laborRate <= 60) {
      score += 10;
      reasons.push('✅ 人件費率は適正範囲内です（推定' + Math.round(laborRate) + '%）');
    } else if (laborRate <= 75) {
      score -= 5;
      reasons.push('⚠️ 人件費率がやや高めです（推定' + Math.round(laborRate) + '%）');
      recommendations.push('人件費率が高めです。シフトバランスや残業状況を確認してください');
    } else {
      score -= 15;
      reasons.push('❌ 人件費率が高く、収益を圧迫しています（推定' + Math.round(laborRate) + '%）');
      recommendations.push('人件費率が高すぎます。人員配置の最適化と残業削減を優先してください');
    }
  }

  // 4. 利用者数傾向チェック（曜日別）
  const weekdayGroups = {};
  dayUsages.forEach(d => {
    const dow = d.day_of_week;
    if (dow !== undefined) {
      if (!weekdayGroups[dow]) weekdayGroups[dow] = [];
      weekdayGroups[dow].push(d.user_count || 0);
    }
  });
  const lowDays = Object.entries(weekdayGroups)
    .filter(([, counts]) => {
      const avg = counts.reduce((s, v) => s + v, 0) / counts.length;
      return capacity > 0 && avg / capacity < 0.6;
    });
  if (lowDays.length >= 2) {
    score -= 5;
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const names = lowDays.map(([d]) => dayNames[d]).join('・');
    reasons.push('⚠️ 稼働率の低い曜日があります（' + names + '）');
    recommendations.push('稼働率の低い曜日（' + names + '）の利用者確保を検討してください');
  }

  // 5. 職員数と利用者のバランス
  if (staffCount > 0 && avgUsers > 0) {
    const ratio = avgUsers / staffCount;
    if (ratio < 2) {
      score -= 5;
      reasons.push('⚠️ 職員数に対して利用者数が少ない可能性があります');
      recommendations.push('利用者数の増加またはシフト最適化で職員一人当たりの効率を高めてください');
    } else if (ratio > 6) {
      score -= 5;
      reasons.push('⚠️ 利用者数に対して職員が少ない可能性があります');
      recommendations.push('職員の増員またはシフト見直しで適正な配置を確保してください');
    } else {
      score += 5;
      reasons.push('✅ 職員数と利用者数のバランスが良好です');
    }
  }

  // 6. 離職傾向（tips減少 = エンゲージメント低下の代替指標）
  const recentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const tipsThisMonth = tips.filter(t => t.date?.startsWith(recentMonth) && !t.is_deleted).length;
  const tipsPrevMonth = tips.filter(t => t.date?.startsWith(prevMonth) && !t.is_deleted).length;
  if (staffCount > 0 && tipsPrevMonth > 0 && tipsThisMonth < tipsPrevMonth * 0.5) {
    score -= 5;
    reasons.push('⚠️ サンクス活動が減少しており、離職傾向に注意が必要です');
    recommendations.push('スタッフのエンゲージメントが低下しています。スタッフ分析AIを確認してください');
  }

  // スコア範囲制限
  score = Math.min(100, Math.max(0, score));

  // 判定
  let verdict, verdictColor, verdictBg;
  if (score >= 80) {
    verdict = '良好';
    verdictColor = 'text-green-700';
    verdictBg = 'bg-green-100 border-green-300';
  } else if (score >= 60) {
    verdict = '注意';
    verdictColor = 'text-amber-700';
    verdictBg = 'bg-amber-100 border-amber-300';
  } else {
    verdict = '要改善';
    verdictColor = 'text-red-700';
    verdictBg = 'bg-red-100 border-red-300';
  }

  return {
    score,
    verdict,
    verdictColor,
    verdictBg,
    reasons,
    recommendations,
    occupancyRate,
    estimatedRevenue,
    estimatedProfit,
    profitMargin,
    laborRate,
    staffCount,
    avgUsers: Math.round(avgUsers),
    estimatedLaborCost,
  };
}

// ── サブコンポーネント ──────────────────────────────────────

function ScoreGauge({ score, verdict, verdictColor, verdictBg }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            className={score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-amber-400' : 'stroke-red-500'}
            strokeWidth="3.5"
            strokeDasharray={`${score} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${verdictColor}`}>{score}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <div className={`px-4 py-1.5 rounded-full border text-sm font-bold ${verdictBg} ${verdictColor}`}>
        経営健全度：{verdict}
      </div>
    </div>
  );
}

function MetricItem({ label, value, sub, icon: Icon, color = 'text-[#2D4A6F]', bg = 'bg-[#2D4A6F]/5' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── メインコンポーネント ────────────────────────────────────

export default function ManagementHealthAI() {
  const [expanded, setExpanded] = useState(true);

  const { data: settingsList = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['mgmt-health-settings'],
    queryFn: () => base44.entities.CareBusinessSettings.list(),
    staleTime: 60000,
  });

  const { data: dayUsages = [], isLoading: loadingUsages } = useQuery({
    queryKey: ['mgmt-health-usages'],
    queryFn: () => base44.entities.CareDayUsage.list('-year_month', 100),
    staleTime: 60000,
  });

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['mgmt-health-staff'],
    queryFn: () => base44.entities.Staff.list(),
    staleTime: 60000,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['mgmt-health-attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 200),
    staleTime: 60000,
  });

  const { data: shiftEntries = [] } = useQuery({
    queryKey: ['mgmt-health-shifts'],
    queryFn: () => base44.entities.ShiftEntry.list('-date', 200),
    staleTime: 60000,
  });

  const { data: tips = [] } = useQuery({
    queryKey: ['mgmt-health-tips'],
    queryFn: () => base44.entities.TipRecord.list('-date', 200),
    staleTime: 60000,
  });

  const isLoading = loadingSettings || loadingUsages || loadingStaff;
  const settings = settingsList[0] || null;
  const facilityName = settings?.facility_name || '事業所';

  const result = useMemo(() => {
    if (!settings && !staff.length) return null;
    return computeHealthScore({ settings, dayUsages, staff, attendance, shiftEntries, tips });
  }, [settings, dayUsages, staff, attendance, shiftEntries, tips]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />データを読み込み中...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-700">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-medium">データが不足しています</p>
        <p className="text-sm mt-1">経営設定・スタッフ情報を入力してください</p>
      </div>
    );
  }

  const fmt = (n) => n != null ? n.toLocaleString('ja-JP') : '-';

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D4A6F] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-6 h-6 text-[#E8A4B8]" />
          <h2 className="text-xl font-bold">経営健全度AI</h2>
        </div>
        <p className="text-white/60 text-sm">事業所の経営状態をスコアで可視化します</p>
        <p className="text-white/40 text-xs mt-1">対象：{facilityName}</p>
      </div>

      {/* スコア + 主要指標 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          {/* ゲージ */}
          <div className="shrink-0">
            <ScoreGauge
              score={result.score}
              verdict={result.verdict}
              verdictColor={result.verdictColor}
              verdictBg={result.verdictBg}
            />
          </div>

          {/* 主要指標 */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-2 gap-3 w-full">
            <MetricItem
              label="稼働率（推定）"
              value={result.occupancyRate != null ? `${result.occupancyRate}%` : '未設定'}
              sub="定員比"
              icon={Activity}
              color={result.occupancyRate >= 85 ? 'text-green-600' : result.occupancyRate >= 70 ? 'text-amber-600' : 'text-red-600'}
              bg={result.occupancyRate >= 85 ? 'bg-green-50' : result.occupancyRate >= 70 ? 'bg-amber-50' : 'bg-red-50'}
            />
            <MetricItem
              label="推定月次売上"
              value={result.estimatedRevenue > 0 ? `¥${fmt(Math.round(result.estimatedRevenue))}` : '未設定'}
              sub="単価×利用者×営業日"
              icon={DollarSign}
              color="text-indigo-600"
              bg="bg-indigo-50"
            />
            <MetricItem
              label="推定月次利益"
              value={result.estimatedProfit != null && result.estimatedRevenue > 0
                ? `¥${fmt(Math.round(result.estimatedProfit))}` : '未設定'}
              sub={result.profitMargin != null ? `利益率 ${Math.round(result.profitMargin)}%` : ''}
              icon={TrendingUp}
              color={result.profitMargin >= 20 ? 'text-green-600' : result.profitMargin >= 5 ? 'text-amber-600' : 'text-red-600'}
              bg={result.profitMargin >= 20 ? 'bg-green-50' : result.profitMargin >= 5 ? 'bg-amber-50' : 'bg-red-50'}
            />
            <MetricItem
              label="人件費率（推定）"
              value={result.laborRate != null ? `${Math.round(result.laborRate)}%` : '未設定'}
              sub={`在籍職員 ${result.staffCount}名`}
              icon={Users}
              color={result.laborRate <= 60 ? 'text-green-600' : result.laborRate <= 75 ? 'text-amber-600' : 'text-red-600'}
              bg={result.laborRate <= 60 ? 'bg-green-50' : result.laborRate <= 75 ? 'bg-amber-50' : 'bg-red-50'}
            />
          </div>
        </div>
      </div>

      {/* 利用者数・職員数 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">平均利用者数 / 日</p>
          <p className="text-3xl font-bold text-[#2D4A6F]">{result.avgUsers}<span className="text-sm text-slate-400 ml-1">名</span></p>
          <p className="text-xs text-slate-400 mt-0.5">定員 {settings?.capacity || '-'} 名</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">在籍職員数</p>
          <p className="text-3xl font-bold text-[#2D4A6F]">{result.staffCount}<span className="text-sm text-slate-400 ml-1">名</span></p>
          <p className="text-xs text-slate-400 mt-0.5">稼働中スタッフ</p>
        </div>
      </div>

      {/* 判定理由 */}
      <Card className="border-0 shadow-sm">
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <BarChart3 className="w-5 h-5 text-[#2D4A6F]" />
            判定理由
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-2">
            {result.reasons.map((r, i) => (
              <div key={i} className="text-sm text-slate-700 flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="mt-0.5 shrink-0">{r.startsWith('✅') ? '' : r.startsWith('❌') ? '' : r.startsWith('⚠️') ? '' : ''}</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 推奨対応 */}
      {result.recommendations.length > 0 && (
        <Card className="border-0 shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              推奨対応
            </div>
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                  <span className="text-sm text-emerald-800">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* フッター注記 */}
      <p className="text-xs text-slate-400 text-center pb-2">
        ※ スコアは稼働率・人件費・利益・職員数などの既存データから自動算出されます。設定データが充実するほど精度が上がります。
      </p>
    </div>
  );
}