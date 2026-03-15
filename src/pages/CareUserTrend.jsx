import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Users } from 'lucide-react';

const END_REASON_LABELS = {
  hospitalization: '入院', admission: '入所', death: '逝去',
  self_reason: '自己都合', family_reason: '家族都合', other_facility: '他施設', other: 'その他',
};

export default function CareUserTrend() {
  const { data: users = [] } = useQuery({
    queryKey: ['care-user-records'],
    queryFn: () => base44.entities.CareUserRecord.list('-start_date', 500),
  });

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const activeUsers = users.filter(u => u.status === 'active');
  const endedUsers = users.filter(u => u.status === 'ended');
  const newThisMonth = users.filter(u => u.start_date && u.start_date.startsWith(thisMonth));
  const endedThisMonth = endedUsers.filter(u => u.end_date && u.end_date.startsWith(thisMonth));
  const newLastMonth = users.filter(u => u.start_date && u.start_date.startsWith(lastMonth));
  const endedLastMonth = endedUsers.filter(u => u.end_date && u.end_date.startsWith(lastMonth));

  const totalForRate = activeUsers.length + endedThisMonth.length;
  const endRate = totalForRate > 0 ? ((endedThisMonth.length / totalForRate) * 100).toFixed(1) : 0;

  // 終了理由別
  const reasonCount = {};
  endedUsers.forEach(u => {
    const r = u.end_reason || 'other';
    reasonCount[r] = (reasonCount[r] || 0) + 1;
  });
  const reasonEntries = Object.entries(reasonCount).sort((a, b) => b[1] - a[1]);

  // 週利用回数分布
  const weeklyDist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  activeUsers.forEach(u => { weeklyDist[u.weekly_visits || 2]++; });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/CareBusinessDashboard" className="flex items-center gap-2 text-white/70 hover:text-white mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" />ダッシュボードへ戻る
          </Link>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-[#E8A4B8]" />
            <h1 className="text-2xl font-bold">利用者動向</h1>
          </div>
          <p className="text-white/60 text-sm mt-1">利用者の増減傾向と終了理由を分析します</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 今月サマリー */}
        <div>
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">今月の動向</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '現在の利用者数', value: `${activeUsers.length}人`, color: 'text-[#2D4A6F]', bg: 'bg-blue-50' },
              { label: '今月新規', value: `${newThisMonth.length}人`, color: 'text-emerald-700', bg: 'bg-emerald-50', sub: `先月 ${newLastMonth.length}人` },
              { label: '今月終了', value: `${endedThisMonth.length}人`, color: 'text-red-700', bg: 'bg-red-50', sub: `先月 ${endedLastMonth.length}人` },
              { label: '今月終了率', value: `${endRate}%`, color: 'text-amber-700', bg: 'bg-amber-50' },
            ].map(({ label, value, color, bg, sub }) => (
              <Card key={label} className={`${bg} border-0 shadow-sm p-4`}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-3xl font-bold ${color} leading-tight`}>{value}</p>
                {sub && <p className="text-xs text-slate-400">{sub}</p>}
              </Card>
            ))}
          </div>
        </div>

        {/* 終了理由 */}
        <Card className="border-0 shadow-md p-5">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            終了理由（累計）
          </h3>
          {reasonEntries.length === 0 ? (
            <p className="text-slate-400 text-sm">終了者のデータがありません</p>
          ) : (
            <div className="space-y-3">
              {reasonEntries.map(([reason, count]) => {
                const maxCount = reasonEntries[0][1];
                return (
                  <div key={reason} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-20 shrink-0">{END_REASON_LABELS[reason] || reason}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-[#2D4A6F] rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      >
                        <span className="text-white text-xs font-bold">{count}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{count}件</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 週利用回数分布 */}
        <Card className="border-0 shadow-md p-5">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2D4A6F]" />
            週利用回数分布（利用中）
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[1,2,3,4].map(v => (
              <div key={v} className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">{v === 4 ? '4回以上' : `週${v}回`}</p>
                <p className="text-3xl font-bold text-[#2D4A6F]">{weeklyDist[v]}</p>
                <p className="text-xs text-slate-400">人</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            ※週利用枠換算：{Object.entries(weeklyDist).reduce((s, [v, c]) => s + (Number(v) * c), 0)}枠
          </p>
        </Card>

        {/* 今月終了者一覧 */}
        {endedThisMonth.length > 0 && (
          <Card className="border-0 shadow-md p-5">
            <h3 className="font-bold text-slate-700 mb-3">今月終了者</h3>
            <div className="space-y-2">
              {endedThisMonth.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {u.name?.[0]}
                  </div>
                  <span className="flex-1 text-sm font-medium">{u.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {END_REASON_LABELS[u.end_reason] || '-'}
                  </Badge>
                  <span className="text-xs text-slate-400">{u.end_date}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}