import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * 経営ダッシュボード・経営健全度AIが共有する
 * 統一指標計算フック。常に同じデータ・同じ計算式で数値を返す。
 */
export function useCareBusinessMetrics() {
  const { data: settingsList = [], isLoading: loadingSettings } = useQuery({
    queryKey: ['care-biz-settings'],
    queryFn: () => base44.entities.CareBusinessSettings.list(),
    staleTime: 0,
  });

  const { data: dayUsageList = [], isLoading: loadingUsages } = useQuery({
    queryKey: ['care-day-usage'],
    queryFn: () => base44.entities.CareDayUsage.list(),
    staleTime: 60000,
  });

  const { data: careUsers = [], isLoading: loadingCareUsers } = useQuery({
    queryKey: ['care-user-records'],
    queryFn: () => base44.entities.CareUserRecord.list('-start_date', 200),
    staleTime: 60000,
  });

  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['mgmt-health-staff'],
    queryFn: () => base44.entities.Staff.list(),
    staleTime: 60000,
  });

  const { data: tips = [] } = useQuery({
    queryKey: ['mgmt-health-tips'],
    queryFn: () => base44.entities.TipRecord.list('-date', 200),
    staleTime: 60000,
  });

  const isLoading = loadingSettings || loadingUsages || loadingCareUsers || loadingStaff;

  const metrics = useMemo(() => {
    const settings = settingsList[0] || null;

    const capacity = settings?.capacity || 18;
    const unitPrice = settings?.unit_price || 10200;
    const monthlyDays = settings?.monthly_business_days || 26;
    const bizDays = settings?.business_days_of_week || [1, 2, 3, 4, 5, 6];
    const weeklyBusinessDays = bizDays.length;

    // 固定費：シンプルモードは設定値、詳細モードはスタッフ給与+その他費用
    let fixedCost = settings?.fixed_cost || 2350000;
    if (settings?.cost_input_mode === 'detailed') {
      const salaryTotal = (settings?.salary_avg_hourly || 1000) *
        (settings?.salary_monthly_hours || 160) *
        (settings?.salary_staff_count || 0);
      fixedCost = Math.round(salaryTotal + (settings?.other_costs_monthly || 0));
    }

    // 曜日別マップ
    const dayMap = {};
    dayUsageList.forEach(d => { dayMap[d.day_of_week] = d; });

    // ── 稼働率計算（統一：週枠ベース）──
    const currentWeeklySlots = bizDays.reduce((s, d) => s + (dayMap[d]?.user_count || 0), 0);
    const maxWeeklySlots = capacity * weeklyBusinessDays;
    const occupancyRate = maxWeeklySlots > 0
      ? Math.min(100, Math.round((currentWeeklySlots / maxWeeklySlots) * 100))
      : null;

    // 平均利用者数（曜日平均）
    const avgUsers = weeklyBusinessDays > 0 ? currentWeeklySlots / weeklyBusinessDays : 0;

    // ── 収益計算 ──
    const estimatedRevenue = Math.round(avgUsers * unitPrice * monthlyDays);
    const estimatedProfit = estimatedRevenue - fixedCost;
    const profitMargin = estimatedRevenue > 0
      ? Math.round((estimatedProfit / estimatedRevenue) * 100)
      : null;

    // ── 人件費計算 ──
    const activeStaff = staff.filter(s => s.status === 'active' && s.role !== 'admin' && s.role !== 'temporary');
    const staffCount = activeStaff.length;
    
    let estimatedLaborCost = 0;
    let avgWage = 1000;
    
    // 詳細モード：設定値から計算
    if (settings?.cost_input_mode === 'detailed' && settings?.salary_staff_count > 0) {
      avgWage = settings.salary_avg_hourly || 1000;
      estimatedLaborCost = Math.round(
        avgWage *
        (settings.salary_monthly_hours || 160) *
        settings.salary_staff_count
      );
    } else if (staffCount > 0) {
      // シンプルモードまたは詳細設定がない場合：Staff entity から推定（管理者除外）
      avgWage = activeStaff.reduce((s, st) => s + (st.hourly_wage || 1000), 0) / staffCount;
      estimatedLaborCost = Math.round(avgWage * 160 * staffCount);
    }
    
    const laborRate = estimatedRevenue > 0
      ? Math.round((estimatedLaborCost / estimatedRevenue) * 100)
      : null;

    // ── 利用者動向 ──
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const activeUsers = careUsers.filter(u => u.status === 'active').length;
    const newThisMonth = careUsers.filter(u => u.start_date?.startsWith(thisMonth)).length;
    const endedThisMonth = careUsers.filter(u => u.end_date?.startsWith(thisMonth) && u.status === 'ended').length;

    // ── サンクス傾向 ──
    const prevMonth = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    const tipsThisMonth = tips.filter(t => t.date?.startsWith(thisMonth) && !t.is_deleted).length;
    const tipsPrevMonth = tips.filter(t => t.date?.startsWith(prevMonth) && !t.is_deleted).length;
    const tipsDecreasing = staffCount > 0 && tipsPrevMonth > 0 && tipsThisMonth < tipsPrevMonth * 0.5;

    // ── 曜日別稼働率が低い曜日 ──
    const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
    const lowDays = bizDays.filter(dow => {
      const count = dayMap[dow]?.user_count || 0;
      return capacity > 0 && count / capacity < 0.6;
    }).map(d => DAY_LABELS[d]);

    const targetRates = settings?.target_rates?.length === 4
      ? settings.target_rates
      : [75, 80, 85, 90];

    return {
      settings,
      hasSettings: settingsList.length > 0,
      targetRates,
      capacity,
      unitPrice,
      fixedCost,
      monthlyDays,
      bizDays,
      weeklyBusinessDays,
      dayMap,
      currentWeeklySlots,
      maxWeeklySlots,
      occupancyRate,
      avgUsers: Math.round(avgUsers * 10) / 10,
      estimatedRevenue,
      estimatedProfit,
      profitMargin,
      staffCount,
      avgWage,
      estimatedLaborCost,
      laborRate,
      activeUsers,
      newThisMonth,
      endedThisMonth,
      tipsThisMonth,
      tipsPrevMonth,
      tipsDecreasing,
      lowDays,
      facilityName: settings?.facility_name || '事業所',
    };
  }, [settingsList, dayUsageList, careUsers, staff, tips]);

  return { metrics, isLoading };
}