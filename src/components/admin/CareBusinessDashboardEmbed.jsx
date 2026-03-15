import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { Settings, Users, Calendar, AlertTriangle, Target, BarChart3, TrendingUp, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine, Legend } from 'recharts';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function getOccupancyColor(rate) {
  if (rate >= 85) return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' };
  if (rate >= 80) return { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200' };
  if (rate >= 70) return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' };
  return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' };
}

function SimulationCard({ rate, maxSlots, capacity, unitPrice, monthlyDays, fixedCost, weeklyBusinessDays, currentSlots }) {
  const targetSlots = Math.round(maxSlots * rate / 100);
  const avgPeople = weeklyBusinessDays > 0 ? (targetSlots / weeklyBusinessDays).toFixed(1) : 0;
  const diffSlots = targetSlots - currentSlots;
  const week2People = Math.ceil(diffSlots / 2);
  const monthlySales = Math.round(parseFloat(avgPeople) * unitPrice * monthlyDays);
  const monthlyProfit = monthlySales - fixedCost;
  const isActive = diffSlots <= 0;

  return (
    <div className={`rounded-xl border-2 p-4 ${isActive ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xl font-bold ${isActive ? 'text-emerald-700' : 'text-slate-700'}`}>{rate}%</span>
        {isActive && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">達成済み</span>}
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">必要週枠</span><span className="font-semibold">{targetSlots}枠</span></div>
        <div className="flex justify-between"><span className="text-slate-500">必要平均人数</span><span className="font-semibold">{avgPeople}人</span></div>
        <div className="flex justify-between">
          <span className="text-slate-500">現在との差</span>
          <span className={`font-bold ${diffSlots > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{diffSlots > 0 ? `+${diffSlots}枠` : `${diffSlots}枠`}</span>
        </div>
        {diffSlots > 0 && <div className="flex justify-between"><span className="text-slate-500">週2利用換算</span><span className="font-bold text-amber-600">あと{week2People}人</span></div>}
        <hr className="my-2 border-slate-100" />
        <div className="flex justify-between"><span className="text-slate-500">月売上予測</span><span className="font-semibold">¥{monthlySales.toLocaleString()}</span></div>
        <div className="flex justify-between">
          <span className="text-slate-500">月利益予測</span>
          <span className={`font-bold ${monthlyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>¥{monthlyProfit.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function CareBusinessDashboardEmbed() {
  const { data: settingsList = [] } = useQuery({ queryKey: ['care-biz-settings'], queryFn: () => base44.entities.CareBusinessSettings.list() });
  const { data: dayUsageList = [] } = useQuery({ queryKey: ['care-day-usage'], queryFn: () => base44.entities.CareDayUsage.list() });
  const { data: careUsers = [] } = useQuery({ queryKey: ['care-user-records'], queryFn: () => base44.entities.CareUserRecord.list('-start_date', 200) });

  const settings = settingsList[0] || { capacity: 18, unit_price: 10200, fixed_cost: 2350000, business_days_of_week: [1,2,3,4,5,6], monthly_business_days: 26 };
  const bizDays = settings.business_days_of_week || [1,2,3,4,5,6];
  const capacity = settings.capacity || 18;
  const unitPrice = settings.unit_price || 10200;
  const fixedCost = settings.fixed_cost || 2350000;
  const monthlyDays = settings.monthly_business_days || 26;
  const weeklyBusinessDays = bizDays.length;

  const dayMap = {};
  dayUsageList.forEach(d => { dayMap[d.day_of_week] = d; });

  const currentWeeklySlots = bizDays.reduce((s, d) => s + (dayMap[d]?.user_count || 0), 0);
  const maxWeeklySlots = capacity * weeklyBusinessDays;
  const avgPeople = weeklyBusinessDays > 0 ? currentWeeklySlots / weeklyBusinessDays : 0;
  const occupancyRate = maxWeeklySlots > 0 ? (currentWeeklySlots / maxWeeklySlots) * 100 : 0;
  const monthlySales = Math.round(avgPeople * unitPrice * monthlyDays);
  const monthlyProfit = monthlySales - fixedCost;
  const occColor = getOccupancyColor(occupancyRate);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const activeUsers = careUsers.filter(u => u.status === 'active').length;
  const newThisMonth = careUsers.filter(u => u.start_date?.startsWith(thisMonth)).length;
  const endedThisMonth = careUsers.filter(u => u.end_date?.startsWith(thisMonth) && u.status === 'ended').length;

  const chartData = [1,2,3,4,5,6,0].map(dow => ({
    name: DAY_LABELS[dow],
    人数: dayMap[dow]?.user_count || 0,
    空き: bizDays.includes(dow) ? Math.max(0, capacity - (dayMap[dow]?.user_count || 0)) : 0,
    isOpen: bizDays.includes(dow),
  }));

  const hasSettings = settingsList.length > 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{settings.facility_name || '介護経営ダッシュボード'}</h2>
          <p className="text-sm text-slate-500">定員 {capacity}名 ／ 月営業日数 {monthlyDays}日</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/CareSettings"><Button variant="outline" size="sm" className="gap-1"><Settings className="w-3.5 h-3.5" />経営設定</Button></Link>
          <Link to="/CareDayUsageSettings"><Button variant="outline" size="sm" className="gap-1"><Calendar className="w-3.5 h-3.5" />曜日別設定</Button></Link>
          <Link to="/CareUsers"><Button variant="outline" size="sm" className="gap-1"><Users className="w-3.5 h-3.5" />利用者管理</Button></Link>
        </div>
      </div>

      {!hasSettings && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700"><Link to="/CareSettings" className="underline font-medium">経営設定</Link>から施設情報を入力してください（現在はサンプル値で表示）</p>
        </div>
      )}

      {/* 主要KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm p-4">
          <p className="text-xs text-slate-500">平均人数</p>
          <p className="text-2xl font-bold text-slate-800">{avgPeople.toFixed(1)}人</p>
          <p className="text-xs text-slate-400">定員 {capacity}名</p>
        </Card>
        <Card className={`${occColor.light} border-2 ${occColor.border} shadow-sm p-4`}>
          <p className="text-xs text-slate-500">稼働率</p>
          <p className={`text-2xl font-bold ${occColor.text}`}>{occupancyRate.toFixed(1)}%</p>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
            <div className={`h-1.5 rounded-full ${occColor.bg}`} style={{ width: `${Math.min(100, occupancyRate)}%` }} />
          </div>
        </Card>
        <Card className="border-0 shadow-sm p-4">
          <p className="text-xs text-slate-500">月売上予測</p>
          <p className="text-2xl font-bold text-blue-700">¥{Math.round(monthlySales/10000)}万</p>
          <p className="text-xs text-slate-400">¥{monthlySales.toLocaleString()}</p>
        </Card>
        <Card className={`${monthlyProfit >= 0 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'} shadow-sm p-4`}>
          <p className="text-xs text-slate-500">月利益予測</p>
          <p className={`text-2xl font-bold ${monthlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {monthlyProfit >= 0 ? '' : '▲'}¥{Math.abs(Math.round(monthlyProfit/10000))}万
          </p>
          <p className="text-xs text-slate-400">¥{monthlyProfit.toLocaleString()}</p>
        </Card>
      </div>

      {/* グラフ＋利用者動向 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#2D4A6F]" />曜日別利用人数</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, capacity]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => [`${v}人`, n]} />
              <Bar dataKey="人数" stackId="a">
                {chartData.map((entry, i) => <Cell key={i} fill={entry.isOpen ? '#2D4A6F' : '#e2e8f0'} />)}
              </Bar>
              <Bar dataKey="空き" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border-0 shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#2D4A6F]" />今月の利用者動向</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '利用中', value: activeUsers, color: 'text-[#2D4A6F]', bg: 'bg-blue-50' },
              { label: '今月新規', value: newThisMonth, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: '今月終了', value: endedThisMonth, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <Link to="/CareUserTrend"><Button variant="outline" className="w-full text-sm">利用者動向詳細 →</Button></Link>
        </Card>
      </div>

      {/* 目標稼働率シミュレーション */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-[#2D4A6F]" />目標稼働率シミュレーション</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[75, 80, 85, 90].map(rate => (
            <SimulationCard key={rate} rate={rate} maxSlots={maxWeeklySlots} capacity={capacity}
              unitPrice={unitPrice} monthlyDays={monthlyDays} fixedCost={fixedCost}
              weeklyBusinessDays={weeklyBusinessDays} currentSlots={currentWeeklySlots} />
          ))}
        </div>
      </div>
    </div>
  );
}