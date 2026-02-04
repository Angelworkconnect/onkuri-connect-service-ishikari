import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Calendar } from "lucide-react";
import { format } from 'date-fns';

const tipTypeConfig = {
  everyday_thanks: { label: 'エブリデイサンクス', color: 'bg-purple-500' },
  special_thanks: { label: '現場貢献スペシャルサンクス', color: 'bg-[#7CB342]' },
  gratitude_gift: { label: '感謝還元サンクスギフト', color: 'bg-[#E8A4B8]' },
  support_thanks: { label: '人財穴埋めサンクス', color: 'bg-[#2D4A6F]' },
  snow_removal_thanks: { label: '除雪サンクス（冬季限定）', color: 'bg-cyan-500' },
  qr_attendance_thanks: { label: 'QRコード出退勤サンクス', color: 'bg-[#7CB342]' },
  sugoroku_thanks: { label: 'スゴロクサンクス', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
};

export default function TipsHistory() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: tips = [] } = useQuery({
    queryKey: ['tips', user?.email],
    queryFn: () => user ? base44.entities.TipRecord.filter({ user_email: user.email }, '-date') : [],
    enabled: !!user,
  });

  const totalTips = tips.reduce((sum, tip) => sum + (tip.amount || 0), 0);

  // 現在の四半期を計算
  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    return { year, quarter };
  };

  const getQuarterStartDate = (year, quarter) => {
    const startMonth = (quarter - 1) * 3;
    return new Date(year, startMonth, 1);
  };

  const getQuarterEndDate = (year, quarter) => {
    const endMonth = quarter * 3;
    return new Date(year, endMonth, 0, 23, 59, 59);
  };

  const getQuarterMonthRange = (quarter) => {
    const ranges = {
      1: '1月〜3月',
      2: '4月〜6月',
      3: '7月〜9月',
      4: '10月〜12月'
    };
    return ranges[quarter];
  };

  const currentQuarter = getCurrentQuarter();
  const quarterStartDate = getQuarterStartDate(currentQuarter.year, currentQuarter.quarter);

  // 今期のサンクスポイント
  const currentQuarterTips = tips.filter(tip => {
    const tipDate = new Date(tip.date);
    return tipDate >= quarterStartDate;
  });
  const currentQuarterTotal = currentQuarterTips.reduce((sum, tip) => sum + (tip.amount || 0), 0);

  // 過去の四半期データをグループ化
  const groupByQuarter = (tips) => {
    const quarters = {};
    tips.forEach(tip => {
      const tipDate = new Date(tip.date);
      const year = tipDate.getFullYear();
      const quarter = Math.floor(tipDate.getMonth() / 3) + 1;
      const key = `${year}-Q${quarter}`;
      if (!quarters[key]) {
        quarters[key] = { year, quarter, tips: [], total: 0 };
      }
      quarters[key].tips.push(tip);
      quarters[key].total += tip.amount || 0;
    });
    return Object.values(quarters).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.quarter - a.quarter;
    });
  };

  const quarterlyData = groupByQuarter(tips);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="bg-gradient-to-br from-[#E8A4B8] to-[#C17A8E] text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">サンクス履歴</h1>
          <p className="text-white/70">あなたの貢献が評価されています</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <Card className="border-0 shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            <div className="bg-gradient-to-r from-[#E8A4B8]/10 to-[#E8A4B8]/5 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">
                今期のポイント（{currentQuarter.year}年{getQuarterMonthRange(currentQuarter.quarter)}）
              </div>
              <div className="text-3xl font-medium text-[#C17A8E]">{currentQuarterTotal.toLocaleString()}pt</div>
              <div className="text-xs text-slate-500 mt-1">
                3ヶ月毎にリセット
              </div>
            </div>
            <div className="bg-gradient-to-r from-[#7CB342]/10 to-[#7CB342]/5 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">累計サンクスポイント</div>
              <div className="text-3xl font-medium text-[#7CB342]">{totalTips.toLocaleString()}pt</div>
              <div className="text-xs text-slate-500 mt-1">
                全期間の合計
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <Tabs defaultValue="current" className="w-full">
            <div className="border-b border-slate-100">
              <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="current" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8A4B8] data-[state=active]:bg-transparent px-6 py-4"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  今期の履歴
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7CB342] data-[state=active]:bg-transparent px-6 py-4"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  過去の履歴
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="current" className="p-6 mt-0">
              <div className="space-y-4">
                {currentQuarterTips.length > 0 ? (
                  currentQuarterTips.map((tip) => (
                    <div key={tip.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={`${tipTypeConfig[tip.tip_type]?.color} text-white`}>
                          {tipTypeConfig[tip.tip_type]?.label}
                        </Badge>
                        <span className="text-xl font-medium text-[#C17A8E]">{tip.amount.toLocaleString()}pt</span>
                      </div>
                      <p className="text-slate-700 mb-3">{tip.reason}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{format(new Date(tip.date), 'yyyy年M月d日')}</span>
                        {tip.given_by && <span>付与者: {tip.given_by}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">今期のサンクス履歴がまだありません</p>
                    <p className="text-sm mt-2">業務への貢献が評価されるとサンクスが付与されます</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6 mt-0">
              <div className="space-y-6">
                {quarterlyData.filter(q => 
                  !(q.year === currentQuarter.year && q.quarter === currentQuarter.quarter)
                ).length > 0 ? (
                  quarterlyData.filter(q => 
                    !(q.year === currentQuarter.year && q.quarter === currentQuarter.quarter)
                  ).map((quarterData) => (
                    <div key={`${quarterData.year}-Q${quarterData.quarter}`} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
                        <h3 className="text-lg font-medium text-slate-700">
                          {quarterData.year}年{getQuarterMonthRange(quarterData.quarter)}
                        </h3>
                        <span className="text-xl font-medium text-[#7CB342]">
                          {quarterData.total.toLocaleString()}pt
                        </span>
                      </div>
                      {quarterData.tips.map((tip) => (
                        <div key={tip.id} className="border border-slate-100 rounded-lg p-4 ml-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={`${tipTypeConfig[tip.tip_type]?.color} text-white text-xs`}>
                              {tipTypeConfig[tip.tip_type]?.label}
                            </Badge>
                            <span className="text-lg font-medium text-[#C17A8E]">{tip.amount.toLocaleString()}pt</span>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{tip.reason}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{format(new Date(tip.date), 'yyyy年M月d日')}</span>
                            {tip.given_by && <span>付与者: {tip.given_by}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">過去のサンクス履歴がありません</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}