import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle, TrendingUp, CheckCircle, Phone, Users, Target,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { format } from 'date-fns';

// スコアリングロジック
function calculateContractScore(user, allStaff, allAnnouncements) {
  let score = 0;
  const reasons = [];

  if (!user) return { score: 0, level: '低', reasons: ['利用者情報不足'] };

  // 要介護度が対象範囲内（要介護1〜3）
  const careLevelMatch = ['care_1', 'care_2', 'care_3'].includes(user.careLevel);
  if (careLevelMatch) {
    score += 15;
    reasons.push('要介護度が通所対象範囲');
  }

  // 利用期間（開始日から計算）
  if (user.start_date) {
    const now = new Date();
    const startDate = new Date(user.start_date);
    const daysActive = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysActive >= 7 && daysActive <= 90) {
      score += 12;
      reasons.push('体験から適切な期間経過');
    } else if (daysActive > 90) {
      score -= 10;
      reasons.push('体験から時間が経ちすぎている');
    }
  }

  // 独居判定
  if (user.address && !user.emergencyContactName) {
    score += 10;
    reasons.push('独居世帯の可能性');
  }

  // 週当たりの訪問回数
  if (user.frequencyPerWeek && user.frequencyPerWeek >= 2) {
    score += 12;
    reasons.push('週2回以上の利用ニーズが明確');
  }

  // 送迎有無
  if (user.pickupRequired || user.dropoffRequired) {
    score += 8;
    reasons.push('送迎サービスの利用需要あり');
  }

  // 特別な対応がある
  if (user.specialNeeds && user.specialNeeds.trim()) {
    score += 8;
    reasons.push('個別対応が必要（継続利用見込み高）');
  }

  // 薬服用・医療対応
  if (user.medicationInfo && user.medicationInfo.trim()) {
    score += 6;
    reasons.push('医療対応による信頼関係構築');
  }

  // アレルギー情報
  if (user.allergies && user.allergies.trim()) {
    score += 4;
    reasons.push('詳細情報による関係性強化');
  }

  // 活動的（外出希望あり）
  if (user.notes && (user.notes.includes('外出') || user.notes.includes('活動'))) {
    score += 10;
    reasons.push('外出・活動希望により利用継続性高い');
  }

  // 緊急連絡先の充実
  if (user.emergencyContactName && user.emergencyContactPhone) {
    score += 8;
    reasons.push('ご家族との連携体制構築');
  }

  // 有効性判定
  if (user.isActive === false) {
    score = Math.min(30, score);
    reasons.push('※ 現在不活のため見込みを大幅減点');
  }

  // スコア範囲を0-100に正規化
  const normalizedScore = Math.min(100, Math.max(0, score));
  const level = normalizedScore >= 75 ? '高' : normalizedScore >= 50 ? '中' : '低';

  return {
    score: normalizedScore,
    level,
    reasons: reasons.length > 0 ? reasons : ['判定情報不足'],
  };
}

function getFollowupRecommendations(user, daysElapsed) {
  const recommendations = [];

  if (daysElapsed <= 3) {
    recommendations.push('初期フォロー時期です。電話での満足度確認をお勧めします');
  } else if (daysElapsed <= 7) {
    recommendations.push('3〜7日経過。送迎条件や契約内容の最終確認を推奨します');
  } else if (daysElapsed <= 30) {
    recommendations.push('月内フォロー。契約案内を優先で実施してください');
  } else {
    recommendations.push('体験から長期間経過。ご家族への再連絡を強く推奨します');
  }

  if (user.frequencyPerWeek && user.frequencyPerWeek >= 2) {
    recommendations.push('高頻度利用ニーズあり。契約による安定的な受け入れを推奨');
  }

  if (user.pickupRequired || user.dropoffRequired) {
    recommendations.push('送迎条件の詳細確認を再度実施してください');
  }

  if (user.specialNeeds) {
    recommendations.push('特別対応が必要。事前に職員と対応内容を共有してください');
  }

  return recommendations;
}

// 月別統計
function calculateMonthlyStats(users, month) {
  const monthStr = month.substring(0, 7); // YYYY-MM形式
  const monthUsers = users.filter(u => u.start_date && u.start_date.startsWith(monthStr));
  
  const contracted = monthUsers.filter(u => u.status === 'active' && u.end_date === null || u.end_date === undefined).length;
  const total = monthUsers.length;
  const contractRate = total > 0 ? Math.round((contracted / total) * 100) : 0;

  return {
    month: monthStr,
    totalTrials: total,
    contracted,
    contractRate,
    highProspect: monthUsers.filter(u => calculateContractScore(u).score >= 75).length,
  };
}

export default function TrialToContractAI() {
  const [expandedUser, setExpandedUser] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all'); // all / high / medium / low
  const [sortBy, setSortBy] = useState('score'); // score / days / name

  const { data: allClients = [] } = useQuery({
    queryKey: ['trial-clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 300),
    staleTime: 60000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['trial-staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: allAnnouncements = [] } = useQuery({
    queryKey: ['trial-announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 200),
  });

  const scoredUsers = useMemo(() => {
    return allClients.map(client => {
      const scoreData = calculateContractScore(client, allStaff, allAnnouncements);
      const now = new Date();
      const startDate = client.start_date ? new Date(client.start_date) : null;
      const daysElapsed = startDate ? Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) : 0;
      const recommendations = getFollowupRecommendations(client, daysElapsed);

      return {
        ...client,
        ...scoreData,
        daysElapsed,
        recommendations,
      };
    });
  }, [allClients, allStaff, allAnnouncements]);

  const filteredUsers = useMemo(() => {
    let filtered = scoredUsers;

    if (filterLevel !== 'all') {
      filtered = filtered.filter(u => {
        if (filterLevel === 'high') return u.level === '高';
        if (filterLevel === 'medium') return u.level === '中';
        if (filterLevel === 'low') return u.level === '低';
        return true;
      });
    }

    // ソート
    filtered.sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'days') return a.daysElapsed - b.daysElapsed;
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return filtered;
  }, [scoredUsers, filterLevel, sortBy]);

  const summary = useMemo(() => {
    const highCount = scoredUsers.filter(u => u.level === '高').length;
    const mediumCount = scoredUsers.filter(u => u.level === '中').length;
    const lowCount = scoredUsers.filter(u => u.level === '低').length;
    const avgScore = scoredUsers.length > 0
      ? Math.round(scoredUsers.reduce((s, u) => s + u.score, 0) / scoredUsers.length)
      : 0;
    
    // 今月の統計
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStats = calculateMonthlyStats(allClients, thisMonth);

    return { highCount, mediumCount, lowCount, avgScore, monthStats };
  }, [scoredUsers, allClients]);

  const levelBadgeClass = {
    '高': 'bg-red-100 text-red-700 border-red-200',
    '中': 'bg-amber-100 text-amber-700 border-amber-200',
    '低': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#2D4A6F] to-[#1E3A5F] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Target className="w-6 h-6 text-[#E8A4B8]" />
          <h2 className="text-xl font-bold">体験→契約AI</h2>
        </div>
        <p className="text-white/60 text-sm">体験者の契約見込みを可視化し、優先フォロー対象を明確にします</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">体験者数</p>
          <p className="text-2xl font-bold text-[#2D4A6F]">{scoredUsers.length}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm bg-red-50 border-l-4 border-red-300">
          <p className="text-xs text-red-600 mb-1">高見込み</p>
          <p className="text-2xl font-bold text-red-700">{summary.highCount}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm bg-amber-50 border-l-4 border-amber-300">
          <p className="text-xs text-amber-600 mb-1">中見込み</p>
          <p className="text-2xl font-bold text-amber-700">{summary.mediumCount}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">平均スコア</p>
          <p className="text-2xl font-bold text-slate-800">{summary.avgScore}</p>
        </Card>
      </div>

      {/* 今月の契約率 */}
      <Card className="border-0 shadow-sm p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#2D4A6F]" />
          今月の実績
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '体験件数', value: summary.monthStats.totalTrials },
            { label: '契約件数', value: summary.monthStats.contracted },
            { label: '契約率', value: `${summary.monthStats.contractRate}%` },
            { label: '高見込み', value: summary.monthStats.highProspect },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* フィルタ・ソート */}
      <div className="flex flex-wrap gap-2 items-center bg-slate-50 rounded-lg p-4">
        <span className="text-sm text-slate-600 font-medium">見込み度：</span>
        {['all', 'high', 'medium', 'low'].map(level => (
          <button
            key={level}
            onClick={() => setFilterLevel(level)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filterLevel === level
                ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#2D4A6F]'
            }`}
          >
            {level === 'all' ? 'すべて' : level === 'high' ? '高' : level === 'medium' ? '中' : '低'}
          </button>
        ))}

        <span className="text-sm text-slate-600 font-medium ml-4">ソート：</span>
        {['score', 'days', 'name'].map(key => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              sortBy === key
                ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#2D4A6F]'
            }`}
          >
            {key === 'score' ? 'スコア' : key === 'days' ? '経過日数' : '名前'}
          </button>
        ))}
      </div>

      {/* 利用者一覧 */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <Card className="border-0 shadow-sm p-8 text-center text-slate-500">
            該当する利用者はいません
          </Card>
        ) : (
          filteredUsers.map(user => (
            <Card key={user.id} className="border-0 shadow-sm overflow-hidden">
              <button
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* 左側：利用者名 + スコア */}
                  <div className="flex-1 min-w-[150px]">
                    <p className="font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {user.careLevel || '未設定'} • 体験から{user.daysElapsed}日経過
                    </p>
                  </div>

                  {/* 右側：見込み度 + スコア */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge className={`${levelBadgeClass[user.level]}`}>
                        {user.level}見込み
                      </Badge>
                      <p className="text-sm font-bold text-slate-800 mt-1">{user.score}/100</p>
                    </div>
                    {expandedUser === user.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* スコアバー */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        user.level === '高'
                          ? 'bg-red-500'
                          : user.level === '中'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                      }`}
                      style={{ width: `${user.score}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* 展開詳細 */}
              {expandedUser === user.id && (
                <div className="px-4 pb-4 bg-slate-50 border-t space-y-4">
                  {/* 判定理由 */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      判定理由
                    </p>
                    <ul className="space-y-1">
                      {user.reasons.map((reason, i) => (
                        <li key={i} className="text-sm text-slate-600 flex gap-2">
                          <span className="text-green-600 font-bold">✓</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 推奨フォロー */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      推奨フォロー
                    </p>
                    <ul className="space-y-1">
                      {user.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-slate-700 bg-white rounded px-3 py-2 border border-slate-200">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 基本情報 */}
                  {(user.frequencyPerWeek || user.careLevel) && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">利用情報</p>
                      <div className="grid grid-cols-2 gap-2">
                        {user.careLevel && (
                          <div className="bg-white rounded px-3 py-2 border border-slate-200 text-sm">
                            <p className="text-xs text-slate-500">要介護度</p>
                            <p className="font-medium text-slate-700">{user.careLevel}</p>
                          </div>
                        )}
                        {user.frequencyPerWeek && (
                          <div className="bg-white rounded px-3 py-2 border border-slate-200 text-sm">
                            <p className="text-xs text-slate-500">週利用回数</p>
                            <p className="font-medium text-slate-700">{user.frequencyPerWeek}回</p>
                          </div>
                        )}
                        {(user.pickupRequired || user.dropoffRequired) && (
                          <div className="bg-white rounded px-3 py-2 border border-slate-200 text-sm col-span-2">
                            <p className="text-xs text-slate-500">送迎対応</p>
                            <p className="font-medium text-slate-700">
                              {user.pickupRequired && 'お迎え'}{user.pickupRequired && user.dropoffRequired && ' / '}
                              {user.dropoffRequired && 'お見送り'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="text-xs text-slate-400 flex items-center gap-1">
        <Info className="w-3 h-3" />
        スコアはルールベースで計算されており、要介護度・利用ニーズ・フォロー状況などから判定されます
      </div>
    </div>
  );
}