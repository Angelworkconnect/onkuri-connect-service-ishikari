import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Calendar, DollarSign, AlertCircle } from 'lucide-react';

const OVERTIME_DAILY_THRESHOLD = 8 * 60;
const OVERTIME_RATE = 1.25;

export function calcPayrollSummary(records, staff) {
  const hourlyWage = staff?.hourly_wage || 0;
  const monthlySalary = staff?.monthly_salary || 0;
  const dailyWage = staff?.daily_wage || 0;
  const payType = monthlySalary > 0 ? 'monthly' : dailyWage > 0 ? 'daily' : 'hourly';

  let totalMins = 0;
  let overtimeMins = 0;
  let workDays = 0;

  records.forEach(r => {
    if (!r.clock_in || !r.clock_out) return;
    const [inH, inM] = r.clock_in.split(':').map(Number);
    const [outH, outM] = r.clock_out.split(':').map(Number);
    const workedMins = (outH * 60 + outM) - (inH * 60 + inM) - (r.break_minutes || 0);
    if (workedMins <= 0) return;
    totalMins += workedMins;
    workDays++;
    if (workedMins > OVERTIME_DAILY_THRESHOLD) {
      overtimeMins += workedMins - OVERTIME_DAILY_THRESHOLD;
    }
  });

  const regularMins = totalMins - overtimeMins;
  const regularHours = regularMins / 60;
  const overtimeHours = overtimeMins / 60;

  let basePay = 0;
  let overtimePay = 0;
  let totalPay = 0;

  if (payType === 'monthly') {
    basePay = monthlySalary;
    if (monthlySalary > 0 && overtimeHours > 0) {
      const hourlyRate = monthlySalary / 160;
      overtimePay = Math.round(hourlyRate * OVERTIME_RATE * overtimeHours);
    }
    totalPay = basePay + overtimePay;
  } else if (payType === 'daily') {
    basePay = Math.round(dailyWage * workDays);
    totalPay = basePay;
  } else {
    if (hourlyWage > 0) {
      basePay = Math.round(hourlyWage * regularHours);
      overtimePay = Math.round(hourlyWage * OVERTIME_RATE * overtimeHours);
      totalPay = basePay + overtimePay;
    }
  }

  return { payType, workDays, totalMins, overtimeMins, overtimeHours, hourlyWage, monthlySalary, dailyWage, basePay, overtimePay, totalPay };
}

const fmtMin = (mins) => {
  if (!mins || mins <= 0) return '0分';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
};

const fmtYen = (v) => v > 0 ? `¥${Math.round(v).toLocaleString()}` : '-';

function filterRecords(records, tab) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yearMonth = today.slice(0, 7);
  const year = today.slice(0, 4);

  if (tab === 'daily') return records.filter(r => r.date === today);
  if (tab === 'monthly') return records.filter(r => r.date?.startsWith(yearMonth));
  if (tab === 'yearly') return records.filter(r => r.date?.startsWith(year));
  return records; // 累計
}

function SummaryCards({ s }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100">
        <div className="flex items-center gap-1 mb-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-500">総勤務時間</span>
        </div>
        <p className="text-base font-bold text-slate-800">{fmtMin(s.totalMins)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{s.workDays}日出勤</p>
      </div>

      <div className={`rounded-xl p-3 shadow-sm border ${s.overtimeMins > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-emerald-100'}`}>
        <div className="flex items-center gap-1 mb-1">
          <TrendingUp className="w-3 h-3 text-orange-400" />
          <span className="text-xs text-slate-500">残業時間</span>
        </div>
        <p className={`text-base font-bold ${s.overtimeMins > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
          {fmtMin(s.overtimeMins)}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">1日8h超分</p>
      </div>

      {s.payType === 'monthly' && (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">月給（固定）</span>
          </div>
          <p className="text-base font-bold text-slate-800">{fmtYen(s.basePay)}</p>
          <p className="text-xs text-slate-400 mt-0.5">月給 ¥{(s.monthlySalary || 0).toLocaleString()}</p>
        </div>
      )}

      <div className={`rounded-xl p-3 shadow-sm border ${s.totalPay > 0 ? 'bg-emerald-600 border-emerald-700' : 'bg-white border-emerald-100'}`}>
        <div className="flex items-center gap-1 mb-1">
          <DollarSign className={`w-3 h-3 ${s.totalPay > 0 ? 'text-emerald-100' : 'text-slate-400'}`} />
          <span className={`text-xs ${s.totalPay > 0 ? 'text-emerald-100' : 'text-slate-500'}`}>概算合計</span>
        </div>
        <p className={`text-lg font-bold ${s.totalPay > 0 ? 'text-white' : 'text-slate-400'}`}>
          {fmtYen(s.totalPay)}
        </p>
        {s.overtimePay > 0 && (
          <p className="text-xs text-emerald-200 mt-0.5">残業代 +¥{Math.round(s.overtimePay).toLocaleString()}込</p>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'daily',   label: '日別' },
  { key: 'monthly', label: '月別' },
  { key: 'yearly',  label: '年別' },
  { key: 'total',   label: '累計' },
];

export default function StaffPayrollSummary({ records, staff }) {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0); // 0=今月, -1=先月 ...

  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const targetYearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  function filterRecordsWithOffset(records, tab) {
    const today = now.toISOString().split('T')[0];
    const year = String(now.getFullYear());
    if (tab === 'daily') return records.filter(r => r.date === today);
    if (tab === 'monthly') return records.filter(r => r.date?.startsWith(targetYearMonth));
    if (tab === 'yearly') return records.filter(r => r.date?.startsWith(year));
    return records;
  }

  const filtered = filterRecordsWithOffset(records, tab);
  const s = calcPayrollSummary(filtered, staff);
  const hasWage = (staff?.monthly_salary > 0) || (staff?.hourly_wage > 0) || (staff?.daily_wage > 0);
  const payTypeLabel = s.payType === 'monthly' ? '正社員（月給）' : s.payType === 'daily' ? '日給制' : 'パート（時給）';

  return (
    <div className="px-4 pb-4 pt-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-bold text-emerald-800">給与計算サマリー</span>
        <Badge className={`text-xs ml-1 ${s.payType === 'monthly' ? 'bg-blue-100 text-blue-700' : s.payType === 'daily' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
          {payTypeLabel}
        </Badge>
        {!hasWage && (
          <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
            <AlertCircle className="w-3 h-3" />給与未設定
          </span>
        )}
      </div>

      {/* タブ */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                tab === t.key
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'monthly' && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
            {new Date().getFullYear()}年{new Date().getMonth() + 1}月
          </span>
        )}
        {tab === 'yearly' && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
            {new Date().getFullYear()}年
          </span>
        )}
        {tab === 'daily' && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
            {new Date().getMonth() + 1}月{new Date().getDate()}日
          </span>
        )}
      </div>

      <SummaryCards s={s} />

      {!hasWage && (
        <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          ⚠️ スタッフ編集で月給・時給・日給を設定すると給与が自動計算されます
        </p>
      )}
    </div>
  );
}