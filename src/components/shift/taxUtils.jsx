// 扶養・税制ユーティリティ

export const TAX_MODE_LABELS = {
  FULL: '無制限',
  SPOUSE_103: '103万',
  SPOUSE_106: '106万',
  SPOUSE_130: '130万',
  STUDENT_LIMIT: '学生',
  CUSTOM: 'カスタム',
};

export const TAX_MODE_COLORS = {
  FULL: 'bg-slate-100 text-slate-600',
  SPOUSE_103: 'bg-orange-100 text-orange-700',
  SPOUSE_106: 'bg-yellow-100 text-yellow-700',
  SPOUSE_130: 'bg-amber-100 text-amber-700',
  STUDENT_LIMIT: 'bg-blue-100 text-blue-700',
  CUSTOM: 'bg-purple-100 text-purple-700',
};

export const ANNUAL_LIMITS = {
  FULL: Infinity,
  SPOUSE_103: 1030000,
  SPOUSE_106: 1060000,
  SPOUSE_130: 1300000,
  STUDENT_LIMIT: 1030000,
  CUSTOM: null,
};

export function getAnnualLimit(staff) {
  if (staff.tax_mode === 'CUSTOM') return staff.annual_income_limit || Infinity;
  return ANNUAL_LIMITS[staff.tax_mode] ?? Infinity;
}

// 年収予測（勤怠記録から）
export function calcYearlyIncomePrediction(staff, attendanceRecords) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const hourlyWage = staff.hourly_wage || 1000;

  // 今年の実績時間
  let actualMinutes = 0;
  attendanceRecords.forEach(r => {
    if (!r.clock_in || !r.clock_out) return;
    const [inH, inM] = r.clock_in.split(':').map(Number);
    const [outH, outM] = r.clock_out.split(':').map(Number);
    actualMinutes += (outH * 60 + outM) - (inH * 60 + inM) - (r.break_minutes || 0);
  });

  const actualHours = actualMinutes / 60;
  const actualIncome = actualHours * hourlyWage;
  const monthsElapsed = currentMonth;
  const monthsRemaining = 12 - monthsElapsed;
  const monthlyAvgIncome = monthsElapsed > 0 ? actualIncome / monthsElapsed : 0;
  const predictedYearlyIncome = actualIncome + monthlyAvgIncome * monthsRemaining;

  return {
    actualIncome: Math.round(actualIncome),
    predictedYearlyIncome: Math.round(predictedYearlyIncome),
    monthlyAvgIncome: Math.round(monthlyAvgIncome),
  };
}

// 扶養安全度（0-100）
export function calcSafetyScore(staff, predictedYearlyIncome) {
  const limit = getAnnualLimit(staff);
  if (limit === Infinity) return 100;
  if (predictedYearlyIncome >= limit) return 0;
  const usage = predictedYearlyIncome / limit;
  return Math.round((1 - usage) * 100);
}

export function getSafetyColor(score) {
  if (score >= 60) return 'text-green-600';
  if (score >= 30) return 'text-yellow-600';
  return 'text-red-600';
}

export function getSafetyBgColor(score) {
  if (score >= 60) return 'bg-green-500';
  if (score >= 30) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getSafetyLabel(score) {
  if (score >= 60) return '安全';
  if (score >= 30) return '注意';
  return '危険';
}

// シフト配置の可否判定
export function canPlaceStaff(staff, date, currentMonthEntries, attendanceRecords) {
  const warnings = [];

  // 固定休チェック
  const dow = new Date(date).getDay();
  if (staff.hard_off_days?.includes(dow)) {
    return { canPlace: false, warnings: ['固定休日です'] };
  }

  // 月労働時間チェック
  if (staff.monthly_hour_limit) {
    const monthEntries = currentMonthEntries.filter(e => e.staff_id === staff.id);
    const usedHours = monthEntries.reduce((sum, e) => {
      if (!e.start_time || !e.end_time) return sum + 8;
      const [sH, sM] = e.start_time.split(':').map(Number);
      const [eH, eM] = e.end_time.split(':').map(Number);
      return sum + ((eH * 60 + eM) - (sH * 60 + sM)) / 60;
    }, 0);
    if (usedHours >= staff.monthly_hour_limit) {
      return { canPlace: false, warnings: [`月${staff.monthly_hour_limit}h上限超過`] };
    }
    if (usedHours >= staff.monthly_hour_limit * 0.9) {
      warnings.push(`月上限の90%に達しています`);
    }
  }

  // 連勤チェック
  const maxDays = staff.max_consecutive_days || 5;
  const dateObj = new Date(date);
  let consecutive = 0;
  for (let i = 1; i <= maxDays; i++) {
    const prev = new Date(dateObj);
    prev.setDate(prev.getDate() - i);
    const prevStr = prev.toISOString().split('T')[0];
    if (currentMonthEntries.some(e => e.staff_id === staff.id && e.date === prevStr)) {
      consecutive++;
    } else break;
  }
  if (consecutive >= maxDays) {
    return { canPlace: false, warnings: [`${maxDays}連勤超過`] };
  }
  if (consecutive >= maxDays - 1) {
    warnings.push(`連勤注意（${consecutive + 1}日連続）`);
  }

  return { canPlace: true, warnings };
}

// 駒の色
export function getPieceColor(staff, safetyScore, canPlace) {
  if (!canPlace) return 'bg-red-100 border-red-400 text-red-700';
  if (safetyScore < 30) return 'bg-red-100 border-red-400 text-red-700';
  if (safetyScore < 60) return 'bg-yellow-100 border-yellow-400 text-yellow-700';
  return 'bg-blue-100 border-blue-400 text-blue-700';
}