import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { Settings, Users, Calendar, AlertTriangle, Target, BarChart3, TrendingUp, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine, Legend } from 'recharts';
import { useCareBusinessMetrics } from '../analytics/useCareBusinessMetrics';

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
  const { metrics, isLoading } = useCareBusinessMetrics();

  const {
    settings, hasSettings, capacity, unitPrice, fixedCost, monthlyDays,
    bizDays, weeklyBusinessDays, dayMap, currentWeeklySlots, maxWeeklySlots,
    occupancyRate, avgUsers, estimatedRevenue: monthlySales, estimatedProfit: monthlyProfit,
    activeUsers, newThisMonth, endedThisMonth, targetRates,
  } = metrics;

  const occColor = getOccupancyColor(occupancyRate ?? 0);

  const chartData = [1,2,3,4,5,6,0].map(dow => ({
    name: DAY_LABELS[dow],
    人数: dayMap[dow]?.user_count || 0,
    空き: bizDays.includes(dow) ? Math.max(0, capacity - (dayMap[dow]?.user_count || 0)) : 0,
    isOpen: bizDays.includes(dow),
  }));

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{settings?.facility_name || '介護経営ダッシュボード'}</h2>
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
          <p className="text-2xl font-bold text-slate-800">{avgUsers}人</p>
          <p className="text-xs text-slate-400">定員 {capacity}名</p>
        </Card>
        <Card className={`${occColor.light} border-2 ${occColor.border} shadow-sm p-4`}>
          <p className="text-xs text-slate-500">稼働率</p>
          <p className={`text-2xl font-bold ${occColor.text}`}>{occupancyRate != null ? `${occupancyRate}%` : '-'}</p>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
            <div className={`h-1.5 rounded-full ${occColor.bg}`} style={{ width: `${Math.min(100, occupancyRate ?? 0)}%` }} />
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
          {(targetRates || [75, 80, 85, 90]).map(rate => (
            <SimulationCard key={rate} rate={rate} maxSlots={maxWeeklySlots} capacity={capacity}
              unitPrice={unitPrice} monthlyDays={monthlyDays} fixedCost={fixedCost}
              weeklyBusinessDays={weeklyBusinessDays} currentSlots={currentWeeklySlots} />
          ))}
        </div>
      </div>

      {/* 経営シミュレーター */}
      <ProfitSimulator defaultCapacity={capacity} defaultUnitPrice={unitPrice} defaultFixedCost={fixedCost} defaultMonthlyDays={monthlyDays} />
    </div>
  );
}

const SIM_STORAGE_KEY = 'care_profit_simulator_v2';

function ProfitSimulator({ defaultCapacity, defaultUnitPrice, defaultFixedCost, defaultMonthlyDays }) {
  const extra = (() => {
    try { const s = localStorage.getItem(SIM_STORAGE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  })();

  const [simCapacity, setSimCapacity] = useState(defaultCapacity);
  const [simUnitPrice, setSimUnitPrice] = useState(defaultUnitPrice);
  const [simFixedCost, setSimFixedCost] = useState(defaultFixedCost);
  const [simMonthlyDays, setSimMonthlyDays] = useState(defaultMonthlyDays);
  const [simVariableCostRate, setSimVariableCostRate] = useState(extra?.simVariableCostRate ?? 3);
  const [open, setOpen] = useState(true);
  const [scenarios, setScenarios] = useState(extra?.scenarios ?? [
    { id: 1, label: '現状維持', rate: 70 },
    { id: 2, label: '目標', rate: 80 },
    { id: 3, label: '理想', rate: 90 },
    { id: 4, label: '満員', rate: 100 },
  ]);
  const [nextId, setNextId] = useState(extra?.nextId ?? 5);

  // 経営設定が変わったらシミュレーターにも反映
  useEffect(() => { setSimCapacity(defaultCapacity); }, [defaultCapacity]);
  useEffect(() => { setSimUnitPrice(defaultUnitPrice); }, [defaultUnitPrice]);
  useEffect(() => { setSimFixedCost(defaultFixedCost); }, [defaultFixedCost]);
  useEffect(() => { setSimMonthlyDays(defaultMonthlyDays); }, [defaultMonthlyDays]);

  useEffect(() => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ simVariableCostRate, scenarios, nextId }));
  }, [simVariableCostRate, scenarios, nextId]);

  const calcAt = (rate) => {
    const avg = (simCapacity * rate) / 100;
    const sales = Math.round(avg * simUnitPrice * simMonthlyDays);
    const varCost = Math.round(sales * simVariableCostRate / 100);
    return { sales, profit: sales - simFixedCost - varCost };
  };

  const addScenario = () => {
    setScenarios(s => [...s, { id: nextId, label: `シナリオ${nextId}`, rate: 75 }]);
    setNextId(n => n + 1);
  };

  const updateScenario = (id, field, value) => {
    setScenarios(s => s.map(sc => sc.id === id ? { ...sc, [field]: field === 'rate' ? Math.min(100, Math.max(0, Number(value))) : value } : sc));
  };

  const removeScenario = (id) => setScenarios(s => s.filter(sc => sc.id !== id));

  const chartData = Array.from({ length: 21 }, (_, i) => {
    const rate = i * 5;
    const avg = (simCapacity * rate) / 100;
    const sales = Math.round(avg * simUnitPrice * simMonthlyDays);
    const varCost = Math.round(sales * simVariableCostRate / 100);
    const totalCost = simFixedCost + varCost;
    return { rate: `${rate}%`, 売上: sales, 総費用: totalCost, 利益: sales - totalCost };
  });

  const breakEvenSales = simFixedCost / (1 - simVariableCostRate / 100);
  const breakEvenPeople = simUnitPrice * simMonthlyDays > 0 ? breakEvenSales / (simUnitPrice * simMonthlyDays) : 0;
  const breakEvenRate = simCapacity > 0 ? (breakEvenPeople / simCapacity) * 100 : 0;

  return (
    <Card className="border-0 shadow-sm">
      <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setOpen(o => !o)}>
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#2D4A6F]" />
          経営シミュレーター
          <span className="text-xs font-normal text-slate-400 ml-1">— パラメータを自由に変えて利益予測</span>
        </h3>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 pb-6 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">基本パラメータ</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: '定員（人）', value: simCapacity, setter: setSimCapacity, min: 1, max: 100 },
                { label: '客単価（円）', value: simUnitPrice, setter: setSimUnitPrice, min: 1000 },
                { label: '固定費（円/月）', value: simFixedCost, setter: setSimFixedCost, min: 0 },
                { label: '月営業日数', value: simMonthlyDays, setter: setSimMonthlyDays, min: 1, max: 31 },
                { label: '変動費率（%）', value: simVariableCostRate, setter: setSimVariableCostRate, min: 0 },
              ].map(({ label, value, setter, min, max }) => (
                <div key={label}>
                  <Label className="text-xs text-slate-500 mb-1 block">{label}</Label>
                  <Input type="number" value={value} min={min} max={max}
                    onChange={e => setter(Number(e.target.value))} className="text-sm h-8" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div>
              <p className="text-xs text-amber-600 font-medium">損益分岐点</p>
              <p className="text-lg font-bold text-amber-700">{breakEvenRate.toFixed(1)}% 稼働</p>
            </div>
            <div className="text-xs text-amber-700 space-y-0.5">
              <p>平均 {breakEvenPeople.toFixed(1)}人／日 が必要</p>
              <p>月売上 ¥{Math.round(breakEvenSales).toLocaleString()} で収支ゼロ</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">稼働率別 売上・費用・利益</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rate" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tickFormatter={v => `${Math.round(v/10000)}万`} tick={{ fontSize: 10 }} width={52} />
                <Tooltip formatter={(v) => `¥${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                <Line type="monotone" dataKey="売上" stroke="#2D4A6F" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="総費用" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="利益" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">シナリオ比較（自由にカスタマイズ）</p>
              <Button size="sm" variant="outline" onClick={addScenario} className="text-xs h-7 px-3">＋ シナリオ追加</Button>
            </div>
            <div className="space-y-2 mb-4">
              {scenarios.map(sc => (
                <div key={sc.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <Input value={sc.label} onChange={e => updateScenario(sc.id, 'label', e.target.value)} className="text-sm h-7 w-32 bg-white" placeholder="シナリオ名" />
                  <span className="text-xs text-slate-400 shrink-0">稼働率</span>
                  <Input type="number" value={sc.rate} min={0} max={100} onChange={e => updateScenario(sc.id, 'rate', e.target.value)} className="text-sm h-7 w-16 bg-white text-center" />
                  <span className="text-xs text-slate-400 shrink-0">%</span>
                  <button onClick={() => removeScenario(sc.id)} className="ml-auto text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {scenarios.map(sc => {
                const { sales, profit } = calcAt(sc.rate);
                const isProfit = profit >= 0;
                return (
                  <div key={sc.id} className={`rounded-xl border-2 p-4 ${isProfit ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <p className="text-xs font-semibold text-slate-600 mb-1">{sc.label}</p>
                    <p className="text-xs text-slate-400 mb-2">稼働率 {sc.rate}%</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">売上</span><span className="font-semibold">¥{Math.round(sales/10000)}万</span></div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">利益</span>
                        <span className={`font-bold ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>{isProfit ? '' : '▲'}¥{Math.abs(Math.round(profit/10000))}万</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}