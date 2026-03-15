import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings, Users, BarChart3, TrendingUp, Calendar, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function getOccupancyColor(rate) {
  if (rate >= 85) return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' };
  if (rate >= 80) return { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200' };
  if (rate >= 70) return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' };
  return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' };
}

function BigMetricCard({ title, value, subtitle, color = 'text-slate-800', bg = 'bg-white', badge, icon: IconComp }) {
  return (
    <Card className={`${bg} border-0 shadow-md p-5 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {IconComp && <IconComp className="w-5 h-5 text-slate-300" />}
      </div>
      <p className={`text-3xl font-bold ${color} leading-none`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      {badge && <div className="mt-1">{badge}</div>}
    </Card>
  );
}

function SimulationCard({ label, rate, maxSlots, capacity, unitPrice, monthlyDays, fixedCost, weeklyBusinessDays, currentSlots }) {
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
        {isActive && <Badge className="bg-emerald-100 text-emerald-700 border-0">達成済み</Badge>}
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">必要週枠</span>
          <span className="font-semibold">{targetSlots}枠</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">必要平均人数</span>
          <span className="font-semibold">{avgPeople}人</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">現在との差</span>
          <span className={`font-bold ${diffSlots > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {diffSlots > 0 ? `+${diffSlots}枠` : `${diffSlots}枠`}
          </span>
        </div>
        {diffSlots > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">週2利用換算</span>
            <span className="font-bold text-amber-600">あと{week2People}人</span>
          </div>
        )}
        <hr className="my-2 border-slate-100" />
        <div className="flex justify-between">
          <span className="text-slate-500">月売上予測</span>
          <span className="font-semibold">¥{monthlySales.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">月利益予測</span>
          <span className={`font-bold ${monthlyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ¥{monthlyProfit.toLocaleString()}
          </span>
        </div>
      </div>
      {diffSlots > 0 && (
        <p className="mt-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-2 leading-relaxed">
          {rate}%達成にはあと<strong>{diffSlots}枠</strong>必要です。<br />
          週2利用者なら<strong>あと{week2People}人</strong>相当です。
        </p>
      )}
    </div>
  );
}

export default function CareBusinessDashboard() {
  const { data: settingsList = [] } = useQuery({
    queryKey: ['care-biz-settings'],
    queryFn: () => base44.entities.CareBusinessSettings.list(),
  });

  const { data: dayUsageList = [] } = useQuery({
    queryKey: ['care-day-usage'],
    queryFn: () => base44.entities.CareDayUsage.list(),
  });

  const { data: careUsers = [] } = useQuery({
    queryKey: ['care-user-records'],
    queryFn: () => base44.entities.CareUserRecord.list('-start_date', 200),
  });

  const settings = settingsList[0] || {
    capacity: 18,
    unit_price: 10200,
    fixed_cost: 2350000,
    business_days_of_week: [1, 2, 3, 4, 5, 6],
    monthly_business_days: 26,
    facility_name: '',
    memo: '',
  };

  const bizDays = settings.business_days_of_week || [1, 2, 3, 4, 5, 6];
  const weeklyBusinessDays = bizDays.length;
  const capacity = settings.capacity || 18;
  const unitPrice = settings.unit_price || 10200;
  const fixedCost = settings.fixed_cost || 2350000;
  const monthlyDays = settings.monthly_business_days || 26;

  // 曜日別人数（最新のデータを使用）
  const dayMap = {};
  dayUsageList.forEach(d => { dayMap[d.day_of_week] = d; });

  const currentWeeklySlots = bizDays.reduce((sum, dow) => sum + (dayMap[dow]?.user_count || 0), 0);
  const maxWeeklySlots = capacity * weeklyBusinessDays;
  const avgPeople = weeklyBusinessDays > 0 ? currentWeeklySlots / weeklyBusinessDays : 0;
  const occupancyRate = maxWeeklySlots > 0 ? (currentWeeklySlots / maxWeeklySlots) * 100 : 0;
  const monthlySales = Math.round(avgPeople * unitPrice * monthlyDays);
  const monthlyProfit = monthlySales - fixedCost;
  const avgVacancy = capacity - avgPeople;
  const weeklyVacancy = maxWeeklySlots - currentWeeklySlots;

  const occColor = getOccupancyColor(occupancyRate);

  // 曜日別グラフデータ
  const chartData = [1, 2, 3, 4, 5, 6, 0].map(dow => {
    const isOpen = bizDays.includes(dow);
    const count = dayMap[dow]?.user_count || 0;
    return {
      name: DAY_LABELS[dow],
      人数: count,
      空き: isOpen ? Math.max(0, capacity - count) : 0,
      isOpen,
    };
  });

  // 今月の利用者動向
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newUsers = careUsers.filter(u => u.start_date && u.start_date.startsWith(thisMonth)).length;
  const endedUsers = careUsers.filter(u => u.end_date && u.end_date.startsWith(thisMonth) && u.status === 'ended').length;
  const activeUsers = careUsers.filter(u => u.status === 'active').length;
  const endRate = activeUsers > 0 ? ((endedUsers / (activeUsers + endedUsers)) * 100).toFixed(1) : 0;

  const hasSettings = settingsList.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#2D4A6F] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white/60 text-sm mb-1">介護経営ダッシュボード</p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {settings.facility_name || '施設名未設定'}
              </h1>
              <p className="text-white/60 text-sm mt-1">定員 {capacity}名 ／ 月営業日数 {monthlyDays}日</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to="/CareSettings">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
                  <Settings className="w-4 h-4" />経営設定
                </Button>
              </Link>
              <Link to="/CareDayUsageSettings">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
                  <Calendar className="w-4 h-4" />曜日別設定
                </Button>
              </Link>
              <Link to="/CareUsers">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
                  <Users className="w-4 h-4" />利用者管理
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {!hasSettings && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">施設設定が完了していません</p>
              <p className="text-sm text-amber-600 mt-1">
                <Link to="/CareSettings" className="underline font-medium">経営設定</Link>から施設情報を入力すると、正確な計算が行われます。現在はサンプルデータで表示しています。
              </p>
            </div>
          </div>
        )}

        {/* 上段：主要KPI */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">主要指標</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BigMetricCard
              title="現在の平均人数"
              value={`${avgPeople.toFixed(1)}人`}
              subtitle={`定員 ${capacity}名`}
              icon={Users}
            />
            <Card className={`${occColor.light} border-2 ${occColor.border} shadow-md p-5 flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">稼働率</p>
                <BarChart3 className="w-5 h-5 text-slate-300" />
              </div>
              <p className={`text-3xl font-bold ${occColor.text} leading-none`}>{occupancyRate.toFixed(1)}%</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full ${occColor.bg} transition-all`}
                  style={{ width: `${Math.min(100, occupancyRate)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">週枠 {currentWeeklySlots} / {maxWeeklySlots}</p>
            </Card>
            <BigMetricCard
              title="月売上予測"
              value={`¥${Math.round(monthlySales / 10000)}万`}
              subtitle={`¥${monthlySales.toLocaleString()}`}
              color="text-blue-700"
              icon={TrendingUp}
            />
            <Card className={`${monthlyProfit >= 0 ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'} shadow-md p-5 flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">月利益予測</p>
                {monthlyProfit >= 0
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <AlertTriangle className="w-5 h-5 text-red-400" />
                }
              </div>
              <p className={`text-3xl font-bold leading-none ${monthlyProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {monthlyProfit >= 0 ? '' : '▲'}¥{Math.abs(Math.round(monthlyProfit / 10000))}万
              </p>
              <p className="text-xs text-slate-400">¥{monthlyProfit.toLocaleString()}</p>
            </Card>
          </div>
        </div>

        {/* 副指標 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BigMetricCard title="週合計枠" value={`${currentWeeklySlots}枠`} subtitle={`最大 ${maxWeeklySlots}枠`} />
          <BigMetricCard title="平均空き人数" value={`${avgVacancy.toFixed(1)}人`} subtitle={`週空き枠 ${weeklyVacancy}枠`} color="text-amber-600" />
          <BigMetricCard title="現在利用者数" value={`${activeUsers}人`} subtitle="利用中の方" />
          <BigMetricCard title="今月終了率" value={`${endRate}%`} subtitle={`新規${newUsers}人 / 終了${endedUsers}人`} />
        </div>

        {/* 曜日別グラフ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-md p-5">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2D4A6F]" />
              曜日別利用人数
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis domain={[0, capacity]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n) => [`${v}人`, n]} />
                <Bar dataKey="人数" stackId="a" radius={[0, 0, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.isOpen ? '#2D4A6F' : '#e2e8f0'} />
                  ))}
                </Bar>
                <Bar dataKey="空き" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* 曜日別空き枠一覧 */}
          <Card className="border-0 shadow-md p-5">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2D4A6F]" />
              曜日別空き枠
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                const isOpen = bizDays.includes(dow);
                const count = dayMap[dow]?.user_count || 0;
                const vacancy = capacity - count;
                const vacancyRate = capacity > 0 ? vacancy / capacity : 0;
                const barColor = !isOpen ? 'bg-slate-200' : vacancyRate <= 0.1 ? 'bg-red-400' : vacancyRate <= 0.25 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                  <div key={dow} className={`flex items-center gap-3 p-2 rounded-lg ${!isOpen ? 'opacity-40' : ''}`}>
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${!isOpen ? 'bg-slate-100 text-slate-400' : 'bg-[#2D4A6F] text-white'}`}>
                      {DAY_LABELS[dow]}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">{isOpen ? `${count}人 / ${capacity}名` : '定休日'}</span>
                        {isOpen && <span className={`font-bold ${vacancyRate <= 0.1 ? 'text-red-600' : vacancyRate <= 0.25 ? 'text-amber-600' : 'text-emerald-600'}`}>空き{vacancy}人</span>}
                      </div>
                      {isOpen && (
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${(count / capacity) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 目標稼働率シミュレーション */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4 h-4" />目標稼働率シミュレーション
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[75, 80, 85, 90].map(rate => (
              <SimulationCard
                key={rate}
                rate={rate}
                maxSlots={maxWeeklySlots}
                capacity={capacity}
                unitPrice={unitPrice}
                monthlyDays={monthlyDays}
                fixedCost={fixedCost}
                weeklyBusinessDays={weeklyBusinessDays}
                currentSlots={currentWeeklySlots}
              />
            ))}
          </div>
        </div>

        {/* 下段：利用者動向 + メモ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-md p-5">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2D4A6F]" />
              今月の利用者動向
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: '新規', value: newUsers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: '終了', value: endedUsers, color: 'text-red-600', bg: 'bg-red-50' },
                { label: '終了率', value: `${endRate}%`, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <Link to="/CareUserTrend">
              <Button variant="outline" className="w-full text-sm">詳細を見る →</Button>
            </Link>
          </Card>

          <Card className="border-0 shadow-md p-5">
            <h3 className="font-bold text-slate-700 mb-3">備考メモ</h3>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 min-h-[100px]">
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{settings.memo || '経営設定からメモを入力できます'}</p>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}