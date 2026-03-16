import React, { useMemo, useState } from 'react';
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, TrendingUp, TrendingDown, Heart,
  Users, Flame, Star, Shield, Brain, Activity, 
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import TurnoverAITab from './TurnoverAITab';

// ── ユーティリティ ──────────────────────────────────────────

function getMonthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

function calcWorkMinutes(records) {
  let total = 0;
  records.forEach(r => {
    if (r.clock_in && r.clock_out) {
      const [ih, im] = r.clock_in.split(':').map(Number);
      const [oh, om] = r.clock_out.split(':').map(Number);
      total += Math.max(0, (oh * 60 + om) - (ih * 60 + im));
    }
  });
  return total;
}

// ── スコアリング ────────────────────────────────────────────

function computeStaffScore(staff, allTips, allAttendance, allHelpRequests, allShiftEntries) {
  const email = staff.email;
  const now = new Date();
  const m0 = getMonthsAgo(0); // current month prefix
  const m1 = getMonthsAgo(1);
  const m2 = getMonthsAgo(2);
  const m3 = getMonthsAgo(3);

  const myTips = allTips.filter(t => t.user_email === email && !t.is_deleted);
  const myAttendance = allAttendance.filter(r => r.user_email === email);
  const myHelp = allHelpRequests.filter(h => h.created_by === email || h.helper_email === email);
  const myShifts = allShiftEntries.filter(e => e.staff_email === email);

  // サンクス量（最近3ヶ月）
  const tipsM0 = myTips.filter(t => t.date && t.date.startsWith(m0)).length;
  const tipsM1 = myTips.filter(t => t.date && t.date.startsWith(m1)).length;
  const tipsM2 = myTips.filter(t => t.date && t.date.startsWith(m2)).length;
  const tipsM3 = myTips.filter(t => t.date && t.date.startsWith(m3)).length;
  const tipsTrend = tipsM0 - tipsM3; // 正なら増加

  // 出勤安定度（最近2ヶ月の勤務日数）
  const attendRecent = myAttendance.filter(r => r.date && r.date >= m2 + '-01');
  const attendDays = attendRecent.length;

  // シフト数
  const shiftCount = myShifts.length;

  // ヘルプ貢献
  const helpCount = myHelp.length;

  // 総サンクスポイント
  const totalTipPoints = myTips.reduce((s, t) => s + (t.amount || 0), 0);

  // ─── エンゲージメントスコア (0-100) ───
  const tipScore = Math.min(30, tipsM0 * 5 + myTips.length * 0.5);
  const attendScore = Math.min(30, attendDays * 2);
  const shiftScore = Math.min(20, shiftCount * 1);
  const helpScore = Math.min(10, helpCount * 2);
  const pointScore = Math.min(10, totalTipPoints / 100);
  const engagementScore = Math.round(tipScore + attendScore + shiftScore + helpScore + pointScore);

  // ─── 離職リスク (0-100) ───
  let retentionRisk = 20; // ベースリスク
  // サンクス減少
  if (tipsTrend < -2) retentionRisk += 25;
  else if (tipsTrend < 0) retentionRisk += 10;
  // 出勤減少
  if (attendDays < 3) retentionRisk += 20;
  else if (attendDays < 8) retentionRisk += 10;
  // シフト少ない
  if (shiftCount === 0) retentionRisk += 15;
  // サンクス0が続いている
  if (tipsM0 === 0 && tipsM1 === 0) retentionRisk += 20;
  retentionRisk = Math.min(100, retentionRisk);

  // ─── バーンアウトリスク ───
  const burnoutFlags = [];
  // 長時間勤務（月160h超）
  const recentMinutes = calcWorkMinutes(attendRecent);
  if (recentMinutes > 160 * 60) burnoutFlags.push('長時間勤務');
  // サンクスゼロ継続
  if (tipsM0 === 0 && tipsM1 === 0 && tipsM2 === 0) burnoutFlags.push('サンクスゼロ継続');
  // ヘルプ集中（全ヘルプの30%以上を一人で対応）
  const totalHelp = allHelpRequests.length;
  if (totalHelp > 0 && helpCount / totalHelp > 0.3) burnoutFlags.push('ヘルプ集中');

  return {
    staff,
    email,
    engagementScore: Math.min(100, engagementScore),
    retentionRisk,
    burnoutFlags,
    tipsM0,
    tipsM1,
    tipsTrend,
    attendDays,
    shiftCount,
    helpCount,
    totalTipPoints,
    recentMinutes,
  };
}

// ── サブコンポーネント ───────────────────────────────────────

function RiskBadge({ risk }) {
  if (risk >= 61) return <Badge className="bg-red-100 text-red-700 border-red-200">{risk}% 高リスク</Badge>;
  if (risk >= 31) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{risk}% 中リスク</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-green-200">{risk}% 低リスク</Badge>;
}

function EngagementBar({ score }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8">{score}</span>
    </div>
  );
}

function StarRating({ score }) {
  const stars = Math.round(score / 20);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
      ))}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color = 'text-[#2D4A6F]', bg = 'bg-[#2D4A6F]/5' }) {
  return (
    <Card className="p-5 border-0 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

// ── メインコンポーネント ────────────────────────────────────

export default function AnalyticsTab() {
  const [activeTab, setActiveTab] = useState('engagement'); // 'engagement' | 'turnover'
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [sortBy, setSortBy] = useState('risk'); // 'risk' | 'engagement' | 'name'

  const { data: allStaff = [] } = useQuery({
    queryKey: ['analytics-staff'],
    queryFn: () => base44.entities.Staff.list('-created_date', 200),
    staleTime: 120000,
  });

  const { data: allTips = [] } = useQuery({
    queryKey: ['analytics-tips'],
    queryFn: () => base44.entities.TipRecord.list('-date', 500),
    staleTime: 120000,
  });

  const { data: allAttendance = [] } = useQuery({
    queryKey: ['analytics-attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 1000),
    staleTime: 120000,
  });

  const { data: allHelpRequests = [] } = useQuery({
    queryKey: ['analytics-help'],
    queryFn: () => base44.entities.HelpRequest.list('-created_date', 200),
    staleTime: 120000,
  });

  const { data: allShiftEntries = [] } = useQuery({
    queryKey: ['analytics-shift-entries'],
    queryFn: () => base44.entities.ShiftEntry.list('-date', 500),
    staleTime: 120000,
  });

  const scores = useMemo(() => {
    if (!allStaff.length) return [];
    return allStaff
      .filter(s => s.approval_status === 'approved')
      .map(s => computeStaffScore(s, allTips, allAttendance, allHelpRequests, allShiftEntries));
  }, [allStaff, allTips, allAttendance, allHelpRequests, allShiftEntries]);

  const sorted = useMemo(() => {
    return [...scores].sort((a, b) => {
      if (sortBy === 'risk') return b.retentionRisk - a.retentionRisk;
      if (sortBy === 'engagement') return b.engagementScore - a.engagementScore;
      return a.staff.full_name.localeCompare(b.staff.full_name);
    });
  }, [scores, sortBy]);

  // 組織全体サマリー
  const summary = useMemo(() => {
    if (!scores.length) return null;
    const avgEngagement = Math.round(scores.reduce((s, x) => s + x.engagementScore, 0) / scores.length);
    const avgRisk = Math.round(scores.reduce((s, x) => s + x.retentionRisk, 0) / scores.length);
    const highRisk = scores.filter(x => x.retentionRisk >= 61).length;
    const burnoutCount = scores.filter(x => x.burnoutFlags.length > 0).length;
    const totalTips = allTips.filter(t => !t.is_deleted).length;
    // 幸福度 = エンゲージメント × (1 - リスク/200)
    const happinessScore = Math.round(avgEngagement * (1 - avgRisk / 200));
    // チーム温度 = サンクス密度
    const teamTemperature = Math.min(100, Math.round(totalTips / Math.max(1, scores.length) * 5));
    // 心理安全スコア = バーンアウトなし率
    const psychSafety = Math.round((1 - burnoutCount / Math.max(1, scores.length)) * 100);
    // LEADER INDEX (0-100 → ★1-5)
    const leaderIndex = Math.round((avgEngagement * 0.4 + (100 - avgRisk) * 0.3 + psychSafety * 0.3));

    return { avgEngagement, avgRisk, highRisk, burnoutCount, totalTips, happinessScore, teamTemperature, psychSafety, leaderIndex };
  }, [scores, allTips]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        データを読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D4A6F] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-6 h-6 text-[#E8A4B8]" />
          <h2 className="text-xl font-bold">スタッフ分析 AI</h2>
        </div>
        <p className="text-white/60 text-sm">職員のエンゲージメント・離職リスクを可視化します</p>
      </div>

      {/* 内部タブ切り替え */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('engagement')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'engagement'
              ? 'bg-white text-[#2D4A6F] shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 エンゲージメント分析
        </button>
        <button
          onClick={() => setActiveTab('turnover')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'turnover'
              ? 'bg-white text-red-600 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          🚨 離職リスク予測AI
        </button>
      </div>

      {/* 離職リスクタブ */}
      {activeTab === 'turnover' && <TurnoverAITab />}

      {/* エンゲージメントタブ（以下既存コンテンツ） */}
      {activeTab === 'engagement' && <>

      {/* KPI カード群 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="平均エンゲージメント"
          value={`${summary.avgEngagement}/100`}
          subtitle="ANGEL SCORE"
          icon={Activity}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <MetricCard
          title="高リスク職員"
          value={`${summary.highRisk}名`}
          subtitle="離職リスク61%以上"
          icon={AlertTriangle}
          color="text-red-500"
          bg="bg-red-50"
        />
        <MetricCard
          title="バーンアウト警告"
          value={`${summary.burnoutCount}名`}
          subtitle="BURNOUT GUARD"
          icon={Flame}
          color="text-orange-500"
          bg="bg-orange-50"
        />
        <MetricCard
          title="LEADER INDEX"
          value={`${Math.round(summary.leaderIndex / 20)}★`}
          subtitle={`スコア ${summary.leaderIndex}/100`}
          icon={Shield}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* CARE HAPPINESS MAP */}
      <Card className="border-0 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#E8A4B8]" />
          CARE HAPPINESS MAP
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: '職場幸福度', value: summary.happinessScore, color: 'text-pink-600', bg: 'bg-pink-500' },
            { label: 'チーム温度', value: summary.teamTemperature, color: 'text-orange-600', bg: 'bg-orange-500' },
            { label: '心理安全性', value: summary.psychSafety, color: 'text-teal-600', bg: 'bg-teal-500' },
            { label: 'ありがとう密度', value: Math.min(100, summary.totalTips * 2), color: 'text-purple-600', bg: 'bg-purple-500' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-slate-500 mb-2">{label}</p>
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={bg.replace('bg-', '').includes('500') ? undefined : undefined}
                    className={`${bg.replace('bg-', 'stroke-')} transition-all`}
                    strokeWidth="3"
                    strokeDasharray={`${value} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${color}`}>{value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* LEADER INDEX 詳細 */}
      <Card className="border-0 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" />
          LEADER INDEX
        </h3>
        <p className="text-xs text-slate-400 mb-4">組織全体の管理者力スコア</p>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <StarRating score={summary.leaderIndex} />
            <p className="text-xs text-slate-400 mt-1">{summary.leaderIndex}/100点</p>
          </div>
          <div className="flex-1 space-y-2 min-w-[200px]">
            {[
              { label: '平均エンゲージメント', v: summary.avgEngagement },
              { label: 'シフト安定度', v: Math.min(100, scores.reduce((s,x) => s + Math.min(20, x.shiftCount), 0) / Math.max(1, scores.length) * 5) },
              { label: 'サンクス総量', v: Math.min(100, summary.totalTips * 3) },
              { label: 'ヘルプ分散度', v: summary.psychSafety },
            ].map(({ label, v }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, Math.round(v))}%` }} />
                </div>
                <span className="text-xs text-slate-600 w-8">{Math.min(100, Math.round(v))}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 離職リスク一覧 */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            RETENTION AI — 離職リスク一覧
          </h3>
          <div className="flex gap-2">
            {[['risk','リスク順'], ['engagement','エンゲージメント順'], ['name','名前順']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  sortBy === v ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]' : 'text-slate-500 border-slate-200 hover:border-[#2D4A6F]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y">
          {sorted.map(s => (
            <div key={s.email}>
              <div
                className="px-4 py-3 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedStaff(expandedStaff === s.email ? null : s.email)}
              >
                {/* アバター */}
                <div className="w-9 h-9 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {s.staff.full_name?.[0] || '?'}
                </div>
                {/* 名前 */}
                <div className="min-w-[100px]">
                  <p className="text-sm font-medium text-slate-800">{s.staff.full_name}</p>
                  <p className="text-xs text-slate-400">{s.staff.role === 'full_time' ? '正社員' : s.staff.role === 'part_time' ? 'パート' : s.staff.role === 'admin' ? '管理者' : '単発'}</p>
                </div>
                {/* 離職リスク */}
                <div className="flex-1 min-w-[120px]">
                  <p className="text-xs text-slate-400 mb-1">離職リスク</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.retentionRisk >= 61 ? 'bg-red-500' : s.retentionRisk >= 31 ? 'bg-amber-400' : 'bg-green-500'}`}
                        style={{ width: `${s.retentionRisk}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-8">{s.retentionRisk}%</span>
                  </div>
                </div>
                {/* エンゲージメント */}
                <div className="flex-1 min-w-[120px]">
                  <p className="text-xs text-slate-400 mb-1">エンゲージメント</p>
                  <EngagementBar score={s.engagementScore} />
                </div>
                {/* バーンアウト警告 */}
                {s.burnoutFlags.length > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <Flame className="w-4 h-4" />
                    <span className="text-xs font-medium">要注意</span>
                  </div>
                )}
                {/* 展開アイコン */}
                {expandedStaff === s.email ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
              </div>

              {/* 展開詳細 */}
              {expandedStaff === s.email && (
                <div className="px-4 pb-4 bg-slate-50 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 mb-4">
                    {[
                      { label: '今月サンクス', value: `${s.tipsM0}件`, sub: `先月 ${s.tipsM1}件` },
                      { label: '最近2ヶ月出勤', value: `${s.attendDays}日`, sub: `${Math.round(s.recentMinutes / 60)}h` },
                      { label: '今月シフト', value: `${s.shiftCount}件` },
                      { label: 'ヘルプ貢献', value: `${s.helpCount}件` },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-lg font-bold text-slate-800">{value}</p>
                        {sub && <p className="text-xs text-slate-400">{sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* バーンアウト警告 */}
                  {s.burnoutFlags.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-orange-700 flex items-center gap-2 mb-1">
                        <Flame className="w-4 h-4" /> BURNOUT GUARD — 警告
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {s.burnoutFlags.map(f => (
                          <Badge key={f} className="bg-orange-100 text-orange-700 border-orange-200">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AIアクション提案 */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-indigo-700 flex items-center gap-1 mb-2">
                      <Brain className="w-3.5 h-3.5" /> AI 改善提案
                    </p>
                    <ul className="space-y-1">
                      {s.retentionRisk >= 61 && (
                        <li className="text-xs text-indigo-600 flex items-center gap-1">
                          <span className="text-base">💬</span> 早急な1on1面談を推奨します
                        </li>
                      )}
                      {s.tipsM0 === 0 && (
                        <li className="text-xs text-indigo-600 flex items-center gap-1">
                          <span className="text-base">✨</span> 感謝フィードバックを送りましょう
                        </li>
                      )}
                      {s.burnoutFlags.includes('長時間勤務') && (
                        <li className="text-xs text-indigo-600 flex items-center gap-1">
                          <span className="text-base">📅</span> シフト軽減を検討してください
                        </li>
                      )}
                      {s.burnoutFlags.includes('ヘルプ集中') && (
                        <li className="text-xs text-indigo-600 flex items-center gap-1">
                          <span className="text-base">🔄</span> ヘルプ業務の配置転換を提案します
                        </li>
                      )}
                      {s.retentionRisk < 31 && s.burnoutFlags.length === 0 && (
                        <li className="text-xs text-green-600 flex items-center gap-1">
                          <span className="text-base">✅</span> 現在の状態は良好です。継続的なサポートを
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* 職員エンゲージメントランキング */}
      <Card className="border-0 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          エンゲージメントランキング
        </h3>
        <div className="space-y-2">
          {[...scores]
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 10)
            .map((s, i) => (
              <div key={s.email} className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 text-center ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {i + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                  {s.staff.full_name?.[0]}
                </div>
                <span className="text-sm text-slate-700 min-w-[80px]">{s.staff.full_name}</span>
                <div className="flex-1">
                  <EngagementBar score={s.engagementScore} />
                </div>
              </div>
            ))}
        </div>
      </Card>

      <div className="text-xs text-slate-400 flex items-center gap-1 pb-2">
        <Info className="w-3 h-3" />
        スコアは既存データ（サンクス・勤怠・シフト・ヘルプ）から自動算出されます。データ蓄積により精度が向上します。
      </div>
      </>}
    </div>
  );
}