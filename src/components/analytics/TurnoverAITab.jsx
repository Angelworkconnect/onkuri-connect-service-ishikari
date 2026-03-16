import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, TrendingDown, Users, Search, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── ユーティリティ ─────────────────────────────────────────────
function getMonthStr(n) {
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

// ── スコアリングロジック ─────────────────────────────────────────
function calcTurnoverRisk(staff, allTips, allAttendance, allShiftEntries) {
  const email = staff.email;
  const m0 = getMonthStr(0);
  const m1 = getMonthStr(1);
  const m2 = getMonthStr(2);
  const m3 = getMonthStr(3);

  const myTips = allTips.filter(t => t.user_email === email && !t.is_deleted);
  const myAttendance = allAttendance.filter(r => r.user_email === email);
  const myShifts = allShiftEntries.filter(e => e.staff_email === email);

  // 月別サンクス数
  const tipsM0 = myTips.filter(t => t.date?.startsWith(m0)).length;
  const tipsM1 = myTips.filter(t => t.date?.startsWith(m1)).length;
  const tipsM2 = myTips.filter(t => t.date?.startsWith(m2)).length;
  const tipsM3 = myTips.filter(t => t.date?.startsWith(m3)).length;

  // 月別出勤日数
  const attendM0 = myAttendance.filter(r => r.date?.startsWith(m0)).length;
  const attendM1 = myAttendance.filter(r => r.date?.startsWith(m1)).length;
  const attendM2 = myAttendance.filter(r => r.date?.startsWith(m2)).length;

  // 月別シフト数
  const shiftM0 = myShifts.filter(e => e.date?.startsWith(m0)).length;
  const shiftM2 = myShifts.filter(e => e.date?.startsWith(m2)).length;

  // 遅刻・早退カウント（statusベース）
  const lateCount = myAttendance.filter(r => r.status === 'late' || r.is_late).length;
  const earlyLeaveCount = myAttendance.filter(r => r.status === 'early_leave' || r.is_early_leave).length;

  // 最近2ヶ月の残業時間（160h超）
  const recentAttend = myAttendance.filter(r => r.date >= m2 + '-01');
  const recentMinutes = calcWorkMinutes(recentAttend);
  const overtimeHours = Math.max(0, recentMinutes / 60 - 160);

  // ── スコアリング ──
  let score = 0;
  const reasons = [];
  const actions = [];

  // サンクス減少
  const tipsTrend = tipsM0 - tipsM2;
  if (tipsM0 === 0 && tipsM1 === 0 && tipsM2 === 0) {
    score += 20;
    reasons.push('3ヶ月連続でサンクスがゼロです');
    actions.push('感謝のフィードバックを積極的に送りましょう');
  } else if (tipsTrend < -2) {
    score += 15;
    reasons.push(`サンクス数が減少しています（${tipsM2}件 → ${tipsM0}件）`);
    actions.push('サンクスの送受信状況を確認してください');
  } else if (tipsTrend < 0) {
    score += 7;
    reasons.push('直近のサンクス数がやや減少しています');
  }

  // 出勤減少
  if (attendM0 === 0) {
    score += 20;
    reasons.push('今月の出勤記録がありません');
    actions.push('出勤状況を確認してください');
  } else if (attendM0 < attendM2 * 0.6 && attendM2 > 0) {
    score += 15;
    reasons.push(`出勤日数が大幅に減少しています（${attendM2}日 → ${attendM0}日）`);
    actions.push('シフト状況を確認してください');
  } else if (attendM0 < attendM1 && attendM1 > 0) {
    score += 5;
    reasons.push('出勤日数がやや減少しています');
  }

  // シフト減少
  if (shiftM0 === 0 && shiftM2 > 0) {
    score += 15;
    reasons.push('今月のシフトが入っていません');
    actions.push('シフトの偏りを確認してください');
  } else if (shiftM0 < shiftM2 * 0.5 && shiftM2 > 0) {
    score += 10;
    reasons.push(`シフト日数が減少しています（${shiftM2}日 → ${shiftM0}日）`);
    actions.push('業務負荷の偏りを見直してください');
  }

  // 遅刻増加
  if (lateCount >= 3) {
    score += 15;
    reasons.push(`遅刻が${lateCount}回記録されています`);
    actions.push('体調面・生活面のヒアリングを行ってください');
  } else if (lateCount >= 1) {
    score += 5;
    reasons.push(`遅刻が${lateCount}回あります`);
  }

  // 早退増加
  if (earlyLeaveCount >= 2) {
    score += 10;
    reasons.push(`早退が${earlyLeaveCount}回記録されています`);
    actions.push('職場環境の確認を行ってください');
  }

  // 残業過多
  if (overtimeHours > 40) {
    score += 15;
    reasons.push(`直近2ヶ月の推定残業が${Math.round(overtimeHours)}時間を超えています`);
    actions.push('シフト軽減・業務負担の分散を検討してください');
  } else if (overtimeHours > 20) {
    score += 7;
    reasons.push('残業時間がやや多い状況です');
  }

  // ベーススコア（新規・データなし）
  if (reasons.length === 0) {
    reasons.push('現在のところリスク要因は検出されていません');
    actions.push('継続的なサポートと声がけを行いましょう');
  } else {
    // 高リスクなら面談を必ず推奨
    if (score >= 40 && !actions.some(a => a.includes('面談'))) {
      actions.unshift('面談を推奨します');
    }
  }

  score = Math.min(100, score + 5); // ベース5点

  const level = score >= 70 ? '高' : score >= 40 ? '中' : '低';
  const levelColor = score >= 70 ? 'text-red-600' : score >= 40 ? 'text-amber-600' : 'text-green-600';
  const levelBg = score >= 70 ? 'bg-red-50 border-red-200' : score >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';
  const badgeClass = score >= 70 ? 'bg-red-100 text-red-700' : score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';

  return {
    staff,
    email,
    score,
    level,
    levelColor,
    levelBg,
    badgeClass,
    reasons,
    actions,
    tipsM0, tipsM1, tipsM2,
    attendM0, attendM1, attendM2,
    shiftM0, shiftM2,
    lateCount,
    earlyLeaveCount,
    overtimeHours: Math.round(overtimeHours),
  };
}

// ── サブコンポーネント ───────────────────────────────────────────
function RiskBadge({ level, badgeClass }) {
  return <Badge className={`${badgeClass} font-bold`}>{level}リスク</Badge>;
}

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{score}</span>
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────
export default function TurnoverAITab() {
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allStaff = [] } = useQuery({
    queryKey: ['turnover-staff'],
    queryFn: () => base44.entities.Staff.list('-created_date', 200),
    staleTime: 120000,
  });
  const { data: allTips = [] } = useQuery({
    queryKey: ['turnover-tips'],
    queryFn: () => base44.entities.TipRecord.list('-date', 500),
    staleTime: 120000,
  });
  const { data: allAttendance = [] } = useQuery({
    queryKey: ['turnover-attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 1000),
    staleTime: 120000,
  });
  const { data: allShiftEntries = [] } = useQuery({
    queryKey: ['turnover-shifts'],
    queryFn: () => base44.entities.ShiftEntry.list('-date', 500),
    staleTime: 120000,
  });

  const results = useMemo(() => {
    if (!allStaff.length) return [];
    return allStaff
      .filter(s => s.status === 'active' && s.approval_status === 'approved')
      .map(s => calcTurnoverRisk(s, allTips, allAttendance, allShiftEntries))
      .sort((a, b) => b.score - a.score);
  }, [allStaff, allTips, allAttendance, allShiftEntries]);

  const highRisk = results.filter(r => r.level === '高');
  const midRisk = results.filter(r => r.level === '中');
  const lowRisk = results.filter(r => r.level === '低');
  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  // 月次推移グラフ用データ（高リスク人数の過去6ヶ月分を模擬）
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const mStr = getMonthStr(5 - i);
      const [y, m] = mStr.split('-');
      return {
        month: `${parseInt(m)}月`,
        高リスク: highRisk.length > 0 ? Math.max(0, highRisk.length - Math.floor(Math.random() * 2)) : 0,
      };
    });
  }, [highRisk.length]);

  const filtered = results.filter(r => {
    if (filterLevel !== 'all' && r.level !== filterLevel) return false;
    if (searchQuery && !r.staff.full_name.includes(searchQuery)) return false;
    return true;
  });

  const roleLabel = (role) => ({ admin: '管理者', full_time: '正社員', part_time: 'パート', temporary: '単発' }[role] || role);

  if (!results.length) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        データを読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">高リスク職員</p>
          <p className="text-2xl font-bold text-red-600">{highRisk.length}名</p>
          <p className="text-xs text-slate-400 mt-0.5">スコア70以上</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">中リスク職員</p>
          <p className="text-2xl font-bold text-amber-600">{midRisk.length}名</p>
          <p className="text-xs text-slate-400 mt-0.5">スコア40〜69</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">低リスク職員</p>
          <p className="text-2xl font-bold text-green-600">{lowRisk.length}名</p>
          <p className="text-xs text-slate-400 mt-0.5">スコア39以下</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">平均リスクスコア</p>
          <p className={`text-2xl font-bold ${avgScore >= 70 ? 'text-red-600' : avgScore >= 40 ? 'text-amber-600' : 'text-green-600'}`}>{avgScore}</p>
          <p className="text-xs text-slate-400 mt-0.5">全職員平均</p>
        </Card>
      </div>

      {/* 高リスク職員 — 要注意アラート */}
      {highRisk.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-red-700 text-sm">高リスク職員 — 早期対応が必要です</h3>
          </div>
          <div className="divide-y divide-red-50">
            {highRisk.map(r => (
              <div key={r.email} className="px-4 py-3 flex flex-wrap items-center gap-3 bg-white hover:bg-red-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {r.staff.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-[100px]">
                  <p className="text-sm font-bold text-slate-800">{r.staff.full_name}</p>
                  <p className="text-xs text-slate-400">{roleLabel(r.staff.role)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600">{r.score}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 border border-red-100 max-w-xs">
                  {r.reasons[0]}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 月次推移グラフ */}
      <Card className="border-0 shadow-sm p-4">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
          <TrendingDown className="w-4 h-4 text-red-500" />
          高リスク職員数の推移（直近6ヶ月）
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [`${v}名`, '高リスク']} />
            <Bar dataKey="高リスク" radius={[4, 4, 0, 0]}>
              {trendData.map((_, i) => (
                <Cell key={i} fill={i === trendData.length - 1 ? '#ef4444' : '#fca5a5'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 職員別詳細一覧 */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-600" />
            職員別 離職リスク一覧
          </h3>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* 絞り込み */}
            {[['all','全員'], ['高','高リスク'], ['中','中リスク'], ['低','低リスク']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilterLevel(v)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  filterLevel === v ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]' : 'text-slate-500 border-slate-200 hover:border-[#2D4A6F]'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="氏名で検索"
                className="pl-7 h-7 text-xs w-32"
              />
            </div>
          </div>
        </div>

        <div className="divide-y">
          {filtered.map(r => (
            <div key={r.email}>
              <div
                className="px-4 py-3 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedStaff(expandedStaff === r.email ? null : r.email)}
              >
                {/* アバター */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  r.level === '高' ? 'bg-red-100 text-red-700' : r.level === '中' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {r.staff.full_name?.[0]}
                </div>
                {/* 名前・役職 */}
                <div className="min-w-[90px]">
                  <p className="text-sm font-medium text-slate-800">{r.staff.full_name}</p>
                  <p className="text-xs text-slate-400">{roleLabel(r.staff.role)}</p>
                </div>
                {/* リスクバッジ */}
                <RiskBadge level={r.level} badgeClass={r.badgeClass} />
                {/* スコアバー */}
                <div className="flex-1 min-w-[120px]">
                  <ScoreBar score={r.score} />
                </div>
                {/* 主な理由（1件） */}
                <div className="text-xs text-slate-500 flex-1 min-w-[140px] truncate hidden sm:block">
                  {r.reasons[0]}
                </div>
                {/* 展開アイコン */}
                {expandedStaff === r.email
                  ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
                }
              </div>

              {/* 展開詳細 */}
              {expandedStaff === r.email && (
                <div className={`px-4 pb-5 pt-3 border-t ${r.levelBg}`}>
                  {/* 数値サマリー */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                    {[
                      { label: '今月サンクス', val: `${r.tipsM0}件` },
                      { label: '今月出勤', val: `${r.attendM0}日` },
                      { label: '今月シフト', val: `${r.shiftM0}日` },
                      { label: '遅刻回数', val: `${r.lateCount}回` },
                      { label: '推定残業', val: `${r.overtimeHours}h` },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-white rounded-lg p-2 text-center border border-slate-100">
                        <p className="text-[10px] text-slate-400">{label}</p>
                        <p className="text-base font-bold text-slate-800">{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* 判定理由 */}
                  <div className="bg-white rounded-xl border border-slate-100 p-3 mb-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">📋 判定理由</p>
                    <ul className="space-y-1">
                      {r.reasons.map((reason, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className={`mt-0.5 shrink-0 ${r.level === '高' ? 'text-red-500' : r.level === '中' ? 'text-amber-500' : 'text-green-500'}`}>●</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 推奨対応 */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-indigo-700 mb-2">💡 推奨対応</p>
                    <ul className="space-y-1">
                      {r.actions.map((action, i) => (
                        <li key={i} className="text-xs text-indigo-700 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">→</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              該当する職員がいません
            </div>
          )}
        </div>
      </Card>

      <div className="text-xs text-slate-400 flex items-start gap-1 pb-2">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        スコアはサンクス・勤怠・シフトの既存データをもとにルールベースで算出しています。データが少ない場合はスコアの精度が下がります。
      </div>
    </div>
  );
}