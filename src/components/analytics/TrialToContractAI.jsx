import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle, TrendingUp, CheckCircle, Phone, Users, Target,
  ChevronDown, ChevronUp, Info, History, RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

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
  const [activeTab, setActiveTab] = useState('current'); // current / history
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const queryClient = useQueryClient();

  // 体験情報を取得（Announcement の trial カテゴリ）
  const { data: trialAnnouncements = [] } = useQuery({
    queryKey: ['trial-announcements'],
    queryFn: () => base44.entities.Announcement.filter({ category: 'trial' }, '-created_date', 500),
    staleTime: 60000,
  });

  // 利用者登録（Client entity）
  const { data: allClients = [] } = useQuery({
    queryKey: ['contract-clients'],
    queryFn: () => base44.entities.Client.filter({ isActive: true }, '-created_date', 500),
    staleTime: 60000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['trial-staff'],
    queryFn: () => base44.entities.Staff.list(),
  });

  // AI判定履歴を保存
  const saveJudgmentHistory = useMutation({
    mutationFn: async (data) => {
      const { trialId, score, level, reasons, contractStatus } = data;
      const trial = trialAnnouncements.find(t => t.id === trialId);
      if (!trial) return;

      const newHistory = {
        timestamp: new Date().toISOString(),
        score,
        level,
        reasons,
        contract_status: contractStatus,
      };

      const currentHistory = trial.ai_judgment_history || [];
      const updatedHistory = [...currentHistory, newHistory];

      await base44.entities.Announcement.update(trialId, {
        ai_judgment_history: updatedHistory,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-announcements'] });
    },
  });

  const scoredUsers = useMemo(() => {
    // 体験情報から利用情報を構築
    const trials = trialAnnouncements.map(trial => {
      // Announcementの trial_client_name と Client の name でマッチング
      const matchedContract = allClients.find(
        c => c.name === trial.trial_client_name || c.name === trial.trial_furigana
      );

      const now = new Date();
      const trialDate = trial.trial_date ? new Date(trial.trial_date) : new Date(trial.created_date);
      const daysElapsed = Math.floor((now - trialDate) / (1000 * 60 * 60 * 24));

      // スコアリング（体験情報ベース）
      let score = 0;
      const reasons = [];
      const isPreTrial = daysElapsed < 0 || !trial.trial_date; // 体験日未設定 or 将来日

      // 【体験前段階での見込み評価】
      // 紹介元がある場合
      if (trial.trial_referral && trial.trial_referral.trim()) {
        score += 20;
        reasons.push(`📞 紹介元あり「${trial.trial_referral}」→ 真度の高い見込み客`);
      }

      // 要介護度が対象範囲
      if (trial.trial_care_level && ['care_1', 'care_2', 'care_3'].includes(trial.trial_care_level)) {
        score += 18;
        reasons.push('要介護度が通所対象範囲（介護1〜3）');
      }

      // ニーズが明確（体験前でも詳細な要望がある = 本気度高い）
      if (trial.trial_notes && trial.trial_notes.trim()) {
        score += 15;
        reasons.push('詳細な対応要望あり → 利用イメージ明確');
      }

      // 送迎ニーズあり
      if (trial.trial_pickup_time) {
        score += 12;
        reasons.push('定期的な送迎ニーズ確認 → 継続利用見込み高い');
      }

      // 【体験後の段階での評価】
      if (!isPreTrial) {
        if (daysElapsed >= 7 && daysElapsed <= 90) {
          score += 15;
          reasons.push('🎯 体験から適切な期間経過（1-3週間が決定タイミング）');
        } else if (daysElapsed > 90) {
          score -= 15;
          reasons.push('⚠️ 体験から時間が経ちすぎている（再接触推奨）');
        }
      }

      // サービス詳細ニーズ
      if (trial.trial_medication_has) {
        score += 8;
        reasons.push('薬管理あり → 医療対応による関係構築');
      }

      if (trial.trial_bath_has) {
        score += 10;
        reasons.push('入浴サービス → 信頼関係と利用頻度高い');
      }

      // アレルギーなど細かい配慮情報
      if (trial.trial_allergy_has) {
        score += 5;
        reasons.push('アレルギー情報など詳細対応が必要');
      }

      // 契約済みの場合
      if (matchedContract) {
        score += 40;
        reasons.push('✅ 【契約成立】利用者登録済み');
      } else if (isPreTrial) {
        // 体験前なので、まずは期待度を表示
        reasons.push('📅 体験日未設定 → 体験後に判定更新予定');
      }

      const normalizedScore = Math.min(100, Math.max(0, score));
      // 見込み度判定：体験前段階でも紹介元や詳細ニーズがあれば「高」
      // 体験後は経過日数と詳細ニーズで判定
      const level = normalizedScore >= 65 ? '高' : normalizedScore >= 40 ? '中' : '低';

      // フォローアップ推奨
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

      if (trial.trial_pickup_time) {
        recommendations.push('送迎条件の詳細確認を再度実施してください');
      }

      if (trial.trial_notes && trial.trial_notes.trim()) {
        recommendations.push('特別対応が必要。事前に職員と対応内容を共有してください');
      }

      return {
        id: trial.id,
        name: trial.trial_client_name,
        furigana: trial.trial_furigana,
        careLevel: trial.trial_care_level,
        frequencyPerWeek: undefined,
        pickupRequired: trial.trial_pickup_time ? true : false,
        dropoffRequired: false,
        bathRequired: trial.trial_bath_has,
        medicationInfo: trial.trial_medication_note,
        notes: trial.trial_notes,
        trialDate: trial.trial_date,
        referral: trial.trial_referral,
        score: normalizedScore,
        level,
        reasons,
        recommendations,
        daysElapsed,
        matchedContract,
        contractStatus: matchedContract ? 'contracted' : 'trial',
        judgmentHistory: trial.ai_judgment_history || [],
      };
    });

    return trials;
  }, [trialAnnouncements, allClients]);

  const filteredUsers = useMemo(() => {
    // デフォルトで契約済みを除外（体験中の利用者のみ表示）
    let filtered = scoredUsers.filter(u => u.contractStatus !== 'contracted');

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
    const highCount = scoredUsers.filter(u => u.level === '高' && u.contractStatus !== 'contracted').length;
    const mediumCount = scoredUsers.filter(u => u.level === '中' && u.contractStatus !== 'contracted').length;
    const lowCount = scoredUsers.filter(u => u.level === '低' && u.contractStatus !== 'contracted').length;
    const contractedCount = scoredUsers.filter(u => u.contractStatus === 'contracted').length;
    
    const avgScore = scoredUsers.filter(u => u.contractStatus !== 'contracted').length > 0
      ? Math.round(
          scoredUsers
            .filter(u => u.contractStatus !== 'contracted')
            .reduce((s, u) => s + u.score, 0) /
            scoredUsers.filter(u => u.contractStatus !== 'contracted').length
        )
      : 0;
    
    // 今月の統計（体験情報ベース）
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthTrials = scoredUsers.filter(u => u.trialDate && u.trialDate.startsWith(thisMonth));
    const thisMonthContracted = thisMonthTrials.filter(u => u.contractStatus === 'contracted').length;
    const contractRate = thisMonthTrials.length > 0 ? Math.round((thisMonthContracted / thisMonthTrials.length) * 100) : 0;

    return {
      highCount,
      mediumCount,
      lowCount,
      contractedCount,
      avgScore,
      monthStats: {
        totalTrials: thisMonthTrials.length,
        contracted: thisMonthContracted,
        contractRate,
        highProspect: thisMonthTrials.filter(u => u.level === '高').length,
      },
    };
  }, [scoredUsers]);

  const levelBadgeClass = {
    '高': 'bg-red-100 text-red-700 border-red-200',
    '中': 'bg-amber-100 text-amber-700 border-amber-200',
    '低': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  // 過去実績データ
  const historyData = useMemo(() => {
    const monthMap = {};
    scoredUsers.forEach(u => {
      const key = u.trialDate ? u.trialDate.substring(0, 7) : '不明';
      if (!monthMap[key]) monthMap[key] = { month: key, trials: [], contracted: [], notContracted: [] };
      monthMap[key].trials.push(u);
      if (u.contractStatus === 'contracted') {
        monthMap[key].contracted.push(u);
      } else {
        monthMap[key].notContracted.push(u);
      }
    });
    return Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month));
  }, [scoredUsers]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#2D4A6F] to-[#1E3A5F] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Target className="w-6 h-6 text-[#E8A4B8]" />
              <h2 className="text-xl font-bold">体験→契約AI</h2>
            </div>
            <p className="text-white/60 text-sm">体験者の契約見込みを可視化し、優先フォロー対象を明確にします</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'current' ? 'bg-white text-[#2D4A6F]' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >現在の体験者</button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white text-[#2D4A6F]' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >過去実績</button>
          </div>
        </div>
      </div>

      {/* 過去実績タブ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 border-0 shadow-sm text-center">
              <p className="text-xs text-slate-500 mb-1">総体験件数</p>
              <p className="text-2xl font-bold text-[#2D4A6F]">{scoredUsers.length}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm text-center bg-green-50">
              <p className="text-xs text-green-600 mb-1">累計契約件数</p>
              <p className="text-2xl font-bold text-green-700">{summary.contractedCount}</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm text-center bg-blue-50">
              <p className="text-xs text-blue-600 mb-1">累計契約率</p>
              <p className="text-2xl font-bold text-blue-700">
                {scoredUsers.length > 0 ? Math.round((summary.contractedCount / scoredUsers.length) * 100) : 0}%
              </p>
            </Card>
          </div>

          {historyData.map(({ month, trials, contracted, notContracted }) => (
            <Card key={month} className="border-0 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">{month === '不明' ? '日付不明' : month}</span>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">体験 {trials.length}件</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">契約 {contracted.length}件</span>
                  {trials.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      契約率 {Math.round((contracted.length / trials.length) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y">
                {trials.map(u => (
                  <div key={u.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${u.contractStatus === 'contracted' ? 'bg-green-50' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.contractStatus === 'contracted' ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{u.name || '名前未設定'}</p>
                        {u.furigana && <p className="text-xs text-slate-400 truncate">{u.furigana}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.careLevel && <span className="text-xs text-slate-500 hidden sm:block">{u.careLevel}</span>}
                      {u.trialDate && <span className="text-xs text-slate-400 hidden sm:block">{u.trialDate}</span>}
                      {u.contractStatus === 'contracted' ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">✅ 契約済</Badge>
                      ) : (
                        <Badge className={`${levelBadgeClass[u.level]} text-xs`}>{u.level}見込み</Badge>
                      )}
                      <span className="text-xs font-bold text-slate-600">{u.score}点</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {historyData.length === 0 && (
            <Card className="border-0 shadow-sm p-8 text-center text-slate-500">体験データがありません</Card>
          )}
        </div>
      )}

      {activeTab === 'current' && <>
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 border-0 shadow-sm">
          <p className="text-xs text-slate-500 mb-1">体験者数</p>
          <p className="text-2xl font-bold text-[#2D4A6F]">{scoredUsers.filter(u => u.contractStatus !== 'contracted').length}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm bg-green-50 border-l-4 border-green-300">
          <p className="text-xs text-green-600 mb-1">✅ 契約済</p>
          <p className="text-2xl font-bold text-green-700">{summary.contractedCount}</p>
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

      {/* 判定基準の説明 */}
      <Card className="border-0 shadow-sm p-4 bg-blue-50 border-l-4 border-blue-300">
        <p className="text-sm font-semibold text-blue-800 mb-2">📊 見込み度の判定基準</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700">
          <div>
            <span className="font-bold text-red-600">高見込み（65点以上）</span>
            <p>紹介元あり / 要介護度対象 / 詳細ニーズ明確 / 体験1-3週間</p>
          </div>
          <div>
            <span className="font-bold text-amber-600">中見込み（40-64点）</span>
            <p>基本情報あり / 送迎ニーズなど / 体験初期or長期</p>
          </div>
          <div>
            <span className="font-bold text-slate-600">低見込み（40点未満）</span>
            <p>情報不足 / 対象外要介護度 / 長期経過後</p>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-2">💡 体験前段階でも紹介元や詳細ニーズがあれば「高」と評価します</p>
      </Card>

      {/* AI判定実行ボタン */}
      <Card className="border-0 shadow-sm p-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 mb-0.5">🤖 AI判定を実行・保存</p>
            <p className="text-xs text-slate-600">現在の判定理由をAI履歴に記録します（学習データとして蓄積）</p>
          </div>
          <Button
            onClick={() => {
              // 全員分の判定を履歴に保存
              scoredUsers.forEach(user => {
                saveJudgmentHistory.mutate({
                  trialId: user.id,
                  score: user.score,
                  level: user.level,
                  reasons: user.reasons,
                  contractStatus: user.contractStatus,
                });
              });
            }}
            disabled={saveJudgmentHistory.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap gap-2"
          >
            {saveJudgmentHistory.isPending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />保存中...</>
            ) : (
              <><History className="w-4 h-4" />判定を保存</>
            )}
          </Button>
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
            <Card 
              key={user.id} 
              className={`border-0 shadow-sm overflow-hidden ${
                user.contractStatus === 'contracted' 
                  ? 'border-l-4 border-green-500 bg-green-50' 
                  : ''
              }`}
            >
              <button
                className="w-full text-left p-4 hover:bg-opacity-75 transition-colors"
                onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* 左側：利用者名 + 契約状態 */}
                  <div className="flex-1 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{user.name}</p>
                      {user.contractStatus === 'contracted' && (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs font-bold">
                          ✅ 利用者登録済
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {user.careLevel || '未設定'} • 体験から{user.daysElapsed}日経過
                    </p>
                  </div>

                  {/* 右側：見込み度 + スコア */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {user.contractStatus === 'contracted' ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          ✅ 契約
                        </Badge>
                      ) : (
                        <Badge className={`${levelBadgeClass[user.level]}`}>
                          {user.level}見込み
                        </Badge>
                      )}
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
                        user.contractStatus === 'contracted'
                          ? 'bg-green-500'
                          : user.level === '高'
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

                  {/* AI判定履歴 */}
                  {user.judgmentHistory && user.judgmentHistory.length > 0 && (
                    <div>
                      <button
                        className="w-full text-left p-3 bg-blue-50 rounded border border-blue-200 flex items-center justify-between gap-2 hover:bg-blue-100 transition-colors"
                        onClick={() => setExpandedHistory(expandedHistory === user.id ? null : user.id)}
                      >
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700">AI判定履歴 ({user.judgmentHistory.length}回)</span>
                        </div>
                        {expandedHistory === user.id ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        )}
                      </button>

                      {expandedHistory === user.id && (
                        <div className="mt-2 space-y-2">
                          {user.judgmentHistory.map((entry, i) => (
                            <div key={i} className="bg-white rounded border border-slate-200 p-3 text-xs">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="font-semibold text-slate-700">
                                  {format(parseISO(entry.timestamp), 'yyyy/MM/dd HH:mm')}
                                </span>
                                <Badge className={
                                  entry.level === '高' ? 'bg-red-100 text-red-700 border-0' :
                                  entry.level === '中' ? 'bg-amber-100 text-amber-700 border-0' :
                                  'bg-slate-100 text-slate-600 border-0'
                                }>
                                  {entry.level}見込み {entry.score}/100
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                {entry.reasons.map((reason, j) => (
                                  <p key={j} className="text-slate-600">• {reason}</p>
                                ))}
                              </div>
                              <div className="mt-2 text-slate-500 border-t pt-2">
                                ステータス: {entry.contract_status === 'contracted' ? '✅ 契約済み' : '📅 体験中'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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