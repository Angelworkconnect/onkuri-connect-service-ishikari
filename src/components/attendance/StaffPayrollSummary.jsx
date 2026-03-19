import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Calendar, DollarSign, AlertCircle } from 'lucide-react';

// 法定労働時間: 1日8時間、週40時間
const OVERTIME_DAILY_THRESHOLD = 8 * 60; // 480分
const OVERTIME_RATE = 1.25; // 法定残業割増率

/**
 * 勤務記録から給与サマリーを計算する
 * @param {Array} records - 勤怠記録
 * @param {Object} staff - スタッフ情報
 */
export function calcPayrollSummary(records, staff) {
  const hourlyWage = staff?.hourly_wage || 0;
  const monthlySalary = staff?.monthly_salary || 0;
  const dailyWage = staff?.daily_wage || 0;

  // 給与種別を自動判定: 月給 > 日給 > 時給
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

    // 1日8時間超は残業
    if (workedMins > OVERTIME_DAILY_THRESHOLD) {
      overtimeMins += workedMins - OVERTIME_DAILY_THRESHOLD;
    }
  });

  const regularMins = totalMins - overtimeMins;
  const totalHours = totalMins / 60;
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

  return {
    payType,
    workDays,
    totalMins,
    totalHours,
    overtimeMins,
    overtimeHours,
    hourlyWage,
    monthlySalary,
    dailyWage,
    basePay,
    overtimePay,
    totalPay,
  };
}

const fmtMin = (mins) => {
  if (!mins || mins <= 0) return '0分';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}時間${m > 0 ? m + '分' : ''}` : `${m}分`;
};

const fmtYen = (v) => v > 0 ? `¥${Math.round(v).toLocaleString()}` : '-';

export default function StaffPayrollSummary({ records, staff }) {
  const s = calcPayrollSummary(records, staff);
  const isFullTime = s.employmentType === 'full_time';
  const hasWage = isFullTime ? s.monthlySalary > 0 : s.hourlyWage > 0;

  return (
    <div className="px-4 pb-4 pt-2 bg-gradient-to-br from-emerald-50 to-teal-50 border-b border-emerald-100">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-bold text-emerald-800">給与計算サマリー</span>
        <Badge className={`text-xs ml-1 ${isFullTime ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
          {isFullTime ? '正社員（月給）' : s.employmentType === 'part_time' ? 'パート（時給）' : '単発（時給）'}
        </Badge>
        {!hasWage && (
          <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
            <AlertCircle className="w-3 h-3" />給与未設定
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* 勤務時間 */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">総勤務時間</span>
          </div>
          <p className="text-base font-bold text-slate-800">{fmtMin(s.totalMins)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{s.workDays}日出勤</p>
        </div>

        {/* 残業時間 */}
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

        {/* 基本給 / 月給 */}
        <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-500">{isFullTime ? '月給（固定）' : '基本給'}</span>
          </div>
          <p className="text-base font-bold text-slate-800">{fmtYen(s.basePay)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isFullTime ? `月給 ¥${(s.monthlySalary || 0).toLocaleString()}` : `時給 ¥${(s.hourlyWage || 0).toLocaleString()}`}
          </p>
        </div>

        {/* 合計給与 */}
        <div className={`rounded-xl p-3 shadow-sm border ${s.totalPay > 0 ? 'bg-emerald-600 border-emerald-700' : 'bg-white border-emerald-100'}`}>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className={`w-3 h-3 ${s.totalPay > 0 ? 'text-emerald-100' : 'text-slate-400'}`} />
            <span className={`text-xs ${s.totalPay > 0 ? 'text-emerald-100' : 'text-slate-500'}`}>概算合計</span>
          </div>
          <p className={`text-lg font-bold ${s.totalPay > 0 ? 'text-white' : 'text-slate-400'}`}>
            {fmtYen(s.totalPay)}
          </p>
          {s.overtimePay > 0 && (
            <p className="text-xs text-emerald-200 mt-0.5">
              残業代 +¥{Math.round(s.overtimePay).toLocaleString()}込
            </p>
          )}
        </div>
      </div>

      {!hasWage && (
        <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          ⚠️ スタッフ管理で{isFullTime ? '月給' : '時給'}を設定すると給与が自動計算されます
        </p>
      )}
    </div>
  );
}