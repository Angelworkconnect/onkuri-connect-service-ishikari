import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Target, TrendingUp, ChevronRight } from 'lucide-react';

export default function TrialContractAISummaryCard() {
  // 体験情報を取得（Announcement の trial カテゴリ）
  const { data: trialAnnouncements = [] } = useQuery({
    queryKey: ['summary-trial-announcements'],
    queryFn: () => base44.entities.Announcement.filter({ category: 'trial' }, '-created_date', 500),
    staleTime: 60000,
  });

  // 利用者登録（Client entity）
  const { data: contractedClients = [] } = useQuery({
    queryKey: ['summary-contract-clients'],
    queryFn: () => base44.entities.Client.filter({ isActive: true }, '-created_date', 500),
    staleTime: 60000,
  });

  const summary = useMemo(() => {
    if (trialAnnouncements.length === 0) return null;

    // 体験者のスコアリング
    const trials = trialAnnouncements.map(trial => {
      const matchedContract = contractedClients.find(
        c => c.name === trial.trial_client_name
      );

      let score = 0;

      if (trial.trial_care_level && ['care_1', 'care_2', 'care_3'].includes(trial.trial_care_level)) {
        score += 15;
      }

      if (trial.trial_date) {
        const now = new Date();
        const trialDate = new Date(trial.trial_date);
        const daysElapsed = Math.floor((now - trialDate) / (1000 * 60 * 60 * 24));
        if (daysElapsed >= 7 && daysElapsed <= 90) score += 12;
      }

      if (trial.trial_pickup_time) score += 8;
      if (trial.trial_medication_has) score += 6;
      if (trial.trial_bath_has) score += 8;
      if (trial.trial_notes && trial.trial_notes.trim()) score += 10;

      if (matchedContract) score += 30;

      const normalizedScore = Math.min(100, Math.max(0, score));
      const level = normalizedScore >= 75 ? '高' : normalizedScore >= 50 ? '中' : '低';

      return {
        level,
        score: normalizedScore,
        isContracted: !!matchedContract,
      };
    });

    const highCount = trials.filter(t => t.level === '高' && !t.isContracted).length;
    
    // 今月の統計
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthTrials = trialAnnouncements.filter(t => t.trial_date && t.trial_date.startsWith(thisMonth));
    const thisMonthContracted = thisMonthTrials.filter(t => {
      return contractedClients.some(c => c.name === t.trial_client_name);
    }).length;
    const contractRate = thisMonthTrials.length > 0 ? Math.round((thisMonthContracted / thisMonthTrials.length) * 100) : 0;

    return { highCount, contractRate };
  }, [trialAnnouncements, contractedClients]);

  if (!summary) return null;

  return (
    <Link to="/TrialContractAI">
      <Card className="border-0 shadow-sm p-4 bg-gradient-to-br from-blue-50 to-blue-50 hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <p className="font-semibold text-slate-800 text-sm">体験→契約AI</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
        
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">高見込み</span>
            <Badge className="bg-red-100 text-red-700 border-0">{summary.highCount}名</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">今月契約率</span>
            <span className="text-sm font-bold text-blue-700">{summary.contractRate}%</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}