import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle, Banknote } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { getAnnualLimit, calcYearlyIncomePrediction, calcSafetyScore, getSafetyLabel, TAX_MODE_LABELS } from "@/components/shift/taxUtils";

function calcMinutes(record) {
  if (!record.clock_in || !record.clock_out) return 0;
  const [inH, inM] = record.clock_in.split(':').map(Number);
  const [outH, outM] = record.clock_out.split(':').map(Number);
  return Math.max(0, (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0));
}

function formatHM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}時間${m > 0 ? m + '分' : ''}`;
}

export default function AttendanceStats({ attendanceRecords, currentMonth, staff }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthRecords = attendanceRecords.filter(r => {
    const d = new Date(r.date);
    return d >= monthStart && d <= monthEnd;
  });

  const completedRecords = monthRecords.filter(r => r.clock_in && r.clock_out);
  const missingClockOut = monthRecords.filter(r => r.clock_in && !r.clock_out && r.date !== format(new Date(), 'yyyy-MM-dd'));

  const totalMonthMinutes = completedRecords.reduce((sum, r) => sum + calcMinutes(r), 0);
  const avgMinutesPerDay = completedRecords.length > 0 ? Math.round(totalMonthMinutes / completedRecords.length) : 0;
  const hourlyWage = staff?.hourly_wage || 0;
  const monthlyIncome = Math.round((totalMonthMinutes / 60) * hourlyWage);

  // 今年の年収計算（扶養ライン用）
  const currentYear = new Date().getFullYear();
  const yearRecords = attendanceRecords.filter(r => r.date?.startsWith(String(currentYear)) && r.clock_in && r.clock_out);
  const yearMinutes = yearRecords.reduce((sum, r) => sum + calcMinutes(r), 0);
  const yearIncome = Math.round((yearMinutes / 60) * hourlyWage);

  const limit = staff ? getAnnualLimit(staff) : Infinity;
  const safetyScore = staff ? calcSafetyScore(staff, yearIncome) : 100;
  const safetyLabel = getSafetyLabel(safetyScore);
  const usagePercent = limit === Infinity ? 0 : Math.min(100, Math.round((yearIncome / limit) * 100));

  const safetyColor = safetyScore >= 60 ? 'text-green-600' : safetyScore >= 30 ? 'text-yellow-600' : 'text-red-600';
  const progressColor = safetyScore >= 60 ? 'bg-green-500' : safetyScore >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  const warnBg = safetyScore < 30 ? 'bg-red-50 border-red-200' : safetyScore < 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';

  return (
    <div className="space-y-4">
      {/* 打刻漏れ警告 */}
      {missingClockOut.length > 0 && (
        <Card className="border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">退勤打刻漏れがあります</p>
              <p className="text-sm text-amber-700 mt-1">
                {missingClockOut.map(r => format(new Date(r.date), 'M月d日')).join('、')} の退勤時刻が未入力です。
                管理者に修正を依頼してください。
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 月次サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-[#2D4A6F]" />
            <p className="text-xs text-slate-500">勤務日数</p>
          </div>
          <p className="text-2xl font-light text-slate-800">{completedRecords.length}<span className="text-sm ml-1">日</span></p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#7CB342]" />
            <p className="text-xs text-slate-500">総勤務時間</p>
          </div>
          <p className="text-xl font-light text-slate-800">{formatHM(totalMonthMinutes)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#E8A4B8]" />
            <p className="text-xs text-slate-500">平均/日</p>
          </div>
          <p className="text-xl font-light text-slate-800">{formatHM(avgMinutesPerDay)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-slate-500">今月の概算賃金</p>
          </div>
          <p className="text-xl font-light text-slate-800">
            {hourlyWage > 0 ? `¥${monthlyIncome.toLocaleString()}` : '未設定'}
          </p>
        </Card>
      </div>

      {/* 扶養ライン警告 */}
      {staff && staff.tax_mode && staff.tax_mode !== 'FULL' && (
        <Card className={`p-4 border ${warnBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {safetyScore < 60 ? (
                <AlertTriangle className={`w-5 h-5 ${safetyScore < 30 ? 'text-red-500' : 'text-yellow-500'}`} />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium text-slate-800">
                扶養ライン ({TAX_MODE_LABELS[staff.tax_mode]})
              </span>
            </div>
            <Badge className={
              safetyScore >= 60 ? 'bg-green-100 text-green-700' :
              safetyScore >= 30 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }>
              {safetyLabel}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">今年の累計収入</span>
              <span className={`font-semibold ${safetyColor}`}>¥{yearIncome.toLocaleString()}</span>
            </div>
            {limit !== Infinity && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">上限金額</span>
                  <span className="text-slate-700">¥{limit.toLocaleString()}</span>
                </div>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>使用率 {usagePercent}%</span>
                    <span>残り ¥{Math.max(0, limit - yearIncome).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${progressColor}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
                {safetyScore < 30 && (
                  <p className="text-xs text-red-600 font-medium mt-2">
                    ⚠ 扶養上限に近づいています！勤務時間を調整してください。
                  </p>
                )}
                {safetyScore >= 30 && safetyScore < 60 && (
                  <p className="text-xs text-yellow-600 mt-2">
                    注意：上限の{usagePercent}%に達しています。
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}