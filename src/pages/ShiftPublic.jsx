import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import PublicShiftCalendar from '../components/shift/PublicShiftCalendar';
import ShiftLegend from '../components/shift/ShiftLegend';
import { Button } from '@/components/ui/button';

export default function ShiftPublic() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: currentShiftMonth } = useQuery({
    queryKey: ['shift-month-public', year, month],
    queryFn: () => {
      const months = base44.entities.ShiftMonth.filter({ year, month });
      return months.then(m => m.find(sm => sm.status === 'PUBLISHED'));
    },
    enabled: !!user,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['shift-entries-public', year, month],
    queryFn: () => 
      currentShiftMonth?.id 
        ? base44.entities.ShiftEntry.filter({ shift_month_id: currentShiftMonth.id })
        : [],
    enabled: !!currentShiftMonth,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['shift-requirements-public', year, month],
    queryFn: () =>
      currentShiftMonth?.id
        ? base44.entities.DayRequirement.filter({ shift_month_id: currentShiftMonth.id })
        : [],
    enabled: !!currentShiftMonth,
  });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">シフト表</h1>
          <p className="text-slate-600">{year}年{month}月</p>
        </div>

        {/* 月ナビゲーション */}
        <Card className="p-4 border-0 shadow-md mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={prevMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-2xl font-bold text-slate-800 min-w-[120px] text-center">
                {year}年{month}月
              </span>
              <button 
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {currentShiftMonth && (
              <div className="text-sm text-slate-600">
                公開済み
              </div>
            )}
          </div>
        </Card>

        {!currentShiftMonth ? (
          <Card className="p-12 text-center border-dashed border-2">
            <p className="text-slate-500">この月のシフト表はまだ公開されていません</p>
          </Card>
        ) : (
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-white shadow mb-6 h-auto p-2">
              <TabsTrigger value="personal" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                👤 あなたのシフト
              </TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Users className="w-4 h-4 mr-2" />全体シフト表
              </TabsTrigger>
              <TabsTrigger value="legend" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                📋 凡例・特記事項
              </TabsTrigger>
            </TabsList>

            {/* 個人シフト */}
            <TabsContent value="personal" className="space-y-4">
              {user?.email ? (
                <PublicShiftCalendar
                  entries={entries}
                  requirements={requirements}
                  year={year}
                  month={month}
                  currentUserEmail={user.email}
                  notes={currentShiftMonth.notes}
                />
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-slate-500">ログインしてください</p>
                </Card>
              )}
            </TabsContent>

            {/* 全体シフト表 */}
            <TabsContent value="all">
              <Card className="p-6 border-0 shadow-lg">
                <h2 className="text-xl font-bold text-slate-800 mb-4">全体シフト表</h2>
                <div className="overflow-x-auto">
                  <AllStaffShiftTable
                    entries={entries}
                    year={year}
                    month={month}
                    requirements={requirements}
                  />
                </div>
              </Card>
            </TabsContent>

            {/* 凡例 */}
            <TabsContent value="legend">
              <ShiftLegend />
              {currentShiftMonth?.notes && (
                <Card className="p-6 border-0 shadow-md mt-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">【特記事項】</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{currentShiftMonth.notes}</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function AllStaffShiftTable({ entries, year, month, requirements }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  // スタッフごとにグループ化
  const staffMap = {};
  entries.forEach(e => {
    if (!staffMap[e.staff_email]) {
      staffMap[e.staff_email] = { name: e.staff_name, entries: [] };
    }
    staffMap[e.staff_email].entries.push(e);
  });

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 p-2 text-sm font-bold text-left min-w-[100px]">スタッフ</th>
          {days.map(day => {
            const dayOfWeek = new Date(year, month - 1, day).getDay();
            const dayLabel = dayLabels[dayOfWeek];
            return (
              <th
                key={day}
                className={`border border-slate-300 p-2 text-sm font-bold text-center min-w-[80px] ${
                  dayOfWeek === 0 ? 'bg-red-50' : dayOfWeek === 6 ? 'bg-blue-50' : ''
                }`}
              >
                <div>{day}</div>
                <div className={`text-xs ${dayOfWeek === 0 ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : 'text-slate-600'}`}>
                  {dayLabel}
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {Object.entries(staffMap).map(([email, staff]) => (
          <tr key={email} className="hover:bg-slate-50">
            <td className="border border-slate-300 p-2 font-medium text-sm text-slate-800">
              {staff.name}
            </td>
            {days.map(day => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const entry = staff.entries.find(e => e.date === dateStr);
              const req = requirements.find(r => r.date === dateStr);

              return (
                <td
                  key={day}
                  className="border border-slate-300 p-1 text-center text-xs"
                >
                  {entry ? (
                    <div className="bg-slate-100 rounded p-1 font-medium">
                      {entry.shift_type}
                    </div>
                  ) : (
                    <div className="text-slate-400">休</div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}