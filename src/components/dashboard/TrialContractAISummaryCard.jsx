import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Target, TrendingUp, ChevronRight } from 'lucide-react';

function calculateContractScore(user) {
  let score = 0;

  if (!user) return { score: 0, level: '低' };

  const careLevelMatch = ['care_1', 'care_2', 'care_3'].includes(user.careLevel);
  if (careLevelMatch) score += 15;

  if (user.start_date) {
    const now = new Date();
    const startDate = new Date(user.start_date);
    const daysActive = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    if (daysActive >= 7 && daysActive <= 90) score += 12;
    else if (daysActive > 90) score -= 10;
  }

  if (user.address && !user.emergencyContactName) score += 10;
  if (user.frequencyPerWeek && user.frequencyPerWeek >= 2) score += 12;
  if (user.pickupRequired || user.dropoffRequired) score += 8;
  if (user.specialNeeds && user.specialNeeds.trim()) score += 8;
  if (user.medicationInfo && user.medicationInfo.trim()) score += 6;
  if (user.allergies && user.allergies.trim()) score += 4;
  if (user.notes && (user.notes.includes('外出') || user.notes.includes('活動'))) score += 10;
  if (user.emergencyContactName && user.emergencyContactPhone) score += 8;

  if (user.isActive === false) score = Math.min(30, score);

  const normalizedScore = Math.min(100, Math.max(0, score));
  const level = normalizedScore >= 75 ? '高' : normalizedScore >= 50 ? '中' : '低';

  return { score: normalizedScore, level };
}

export default function TrialContractAISummaryCard() {
  const { data: allClients = [] } = useQuery({
    queryKey: ['trial-clients-summary'],
    queryFn: () => base44.entities.Client.list('-created_date', 300),
    staleTime: 60000,
  });

  const summary = useMemo(() => {
    if (allClients.length === 0) return null;

    // 利用者登録済み（isActive === true）を除外
    const trialOnly = allClients.filter(c => c.isActive !== true);
    
    const scored = trialOnly.map(c => ({
      ...c,
      ...calculateContractScore(c),
    }));

    const highCount = scored.filter(s => s.level === '高').length;
    
    // 今月の統計
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthUsers = allClients.filter(u => u.start_date && u.start_date.startsWith(thisMonth));
    const contracted = monthUsers.filter(u => u.status === 'active').length;
    const contractRate = monthUsers.length > 0 ? Math.round((contracted / monthUsers.length) * 100) : 0;

    return { highCount, contractRate, totalTrials: allClients.length };
  }, [allClients]);

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