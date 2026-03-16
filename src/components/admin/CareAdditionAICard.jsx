import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Brain, TrendingUp, ChevronRight } from 'lucide-react';

const ADDITIONS_COUNT = 6;
const AVG_UNIT_PRICE = 5000;

export default function CareAdditionAICard() {
  const { data: careUsers = [] } = useQuery({
    queryKey: ['care-user-records-ai'],
    queryFn: () => base44.entities.CareUserRecord.list('-start_date', 100),
    staleTime: 60000,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-for-ai'],
    queryFn: () => base44.entities.Staff.list(),
    staleTime: 60000,
  });

  const activeUsers = careUsers.filter(u => u.status === 'active').length;
  const staffCount = staff.filter(s => s.status === 'active').length;
  const hasPtOt = staff.some(s => (s.qualifications || []).some(q =>
    ['PT','OT','ST','機能訓練指導員','理学療法士','作業療法士'].some(k => q.includes(k))
  ));

  // 簡易推定
  let obtainableCount = 0;
  if (staffCount >= 3) obtainableCount++;
  if (hasPtOt && activeUsers >= 10) obtainableCount++;
  if (activeUsers >= 10) obtainableCount++;
  if (staffCount >= 5) obtainableCount++;

  const estimatedMonthly = obtainableCount * AVG_UNIT_PRICE * (activeUsers || 10);

  return (
    <Link to="/CareAdditionAI">
      <Card className="border-0 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-[#2D4A6F]/5 to-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#2D4A6F] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">加算診断AI</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500">取得可能加算</p>
            <p className="text-2xl font-bold text-[#2D4A6F]">{obtainableCount}件</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3 text-emerald-500" />想定収益増</p>
            <p className="text-lg font-bold text-emerald-600">+¥{Math.round(estimatedMonthly / 10000)}万/月</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">タップして詳細診断を実行</p>
      </Card>
    </Link>
  );
}