import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { format } from 'date-fns';

const tipTypeConfig = {
  special_thanks: { label: '現場貢献スペシャルサンクス', color: 'bg-[#7CB342]' },
  gratitude_gift: { label: '感謝還元サンクスギフト', color: 'bg-[#E8A4B8]' },
  support_thanks: { label: '人財穴埋めサンクス', color: 'bg-[#2D4A6F]' },
  snow_removal_thanks: { label: '除雪サンクス（冬季限定）', color: 'bg-cyan-500' },
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
          <div className="bg-gradient-to-r from-[#E8A4B8]/10 to-[#E8A4B8]/5 rounded-lg p-6">
            <div className="text-sm text-slate-600 mb-1">累計サンクスポイント</div>
            <div className="text-4xl font-medium text-[#C17A8E]">{totalTips.toLocaleString()}pt</div>
          </div>
        </Card>

        <div className="space-y-4">
          {tips.length > 0 ? (
            tips.map((tip) => (
              <Card key={tip.id} className="border-0 shadow-sm p-6">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={`${tipTypeConfig[tip.tip_type]?.color} text-white`}>
                    {tipTypeConfig[tip.tip_type]?.label}
                  </Badge>
                  <span className="text-2xl font-medium text-[#C17A8E]">{tip.amount.toLocaleString()}pt</span>
                </div>
                <p className="text-slate-700 mb-3">{tip.reason}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{format(new Date(tip.date), 'yyyy年M月d日')}</span>
                  {tip.given_by && <span>付与者: {tip.given_by}</span>}
                </div>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-sm p-12">
              <div className="text-center text-slate-400">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">まだサンクス履歴がありません</p>
                <p className="text-sm mt-2">業務への貢献が評価されるとサンクスが付与されます</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}