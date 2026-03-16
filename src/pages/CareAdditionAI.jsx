import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, CheckCircle, AlertCircle, XCircle, TrendingUp, FileText, Lightbulb, Loader2 } from 'lucide-react';

const ADDITIONS = [
  {
    id: 'treatment_improvement',
    name: '介護職員等処遇改善加算',
    unit_price_per_user: 8000,
    requirements: [
      { id: 'staff_count', label: '常勤職員3名以上', check: (d) => d.staffCount >= 3 },
      { id: 'training', label: '研修計画の作成・実施', check: (d) => d.hasTrainingPlan },
      { id: 'wage_plan', label: '賃金改善計画書の整備', check: (d) => d.hasWagePlan },
    ],
    documents: ['賃金改善計画書', '研修実施記録', '就業規則'],
    action: '賃金改善計画書と研修実施記録を整備してください',
  },
  {
    id: 'individual_training',
    name: '個別機能訓練加算',
    unit_price_per_user: 5000,
    requirements: [
      { id: 'pt_ot', label: '機能訓練指導員（PT/OT等）の配置', check: (d) => d.hasPtOt },
      { id: 'plan', label: '個別機能訓練計画書の作成', check: (d) => d.hasTrainingPlanDoc },
      { id: 'users', label: '利用者10名以上', check: (d) => d.activeUserCount >= 10 },
    ],
    documents: ['個別機能訓練計画書', '訓練実施記録'],
    action: '機能訓練指導員を配置し、個別計画書を作成してください',
  },
  {
    id: 'life_function',
    name: '生活機能向上連携加算',
    unit_price_per_user: 4000,
    requirements: [
      { id: 'rehab_connection', label: 'リハ専門職との連携体制', check: (d) => d.hasRehabConnection },
      { id: 'assessment', label: '生活機能アセスメントの実施', check: (d) => d.hasAssessment },
      { id: 'plan2', label: '計画書の整備', check: (d) => d.hasLifePlanDoc },
    ],
    documents: ['生活機能アセスメント書', '連携記録', '生活機能向上計画書'],
    action: 'リハ専門職との連携協定を締結してください',
  },
  {
    id: 'adl',
    name: 'ADL維持等加算',
    unit_price_per_user: 6000,
    requirements: [
      { id: 'adl_eval', label: 'ADL評価（Barthel Index等）の実施', check: (d) => d.hasAdlEval },
      { id: 'adl_plan', label: 'ADL維持計画の作成', check: (d) => d.hasAdlPlan },
      { id: 'users2', label: '利用者15名以上', check: (d) => d.activeUserCount >= 15 },
    ],
    documents: ['ADL評価記録', 'ADL維持計画書'],
    action: 'ADL評価を定期実施し、記録を整備してください',
  },
  {
    id: 'scientific_care',
    name: '科学的介護推進体制加算',
    unit_price_per_user: 4000,
    requirements: [
      { id: 'life_submission', label: 'LIFEへのデータ提出', check: (d) => d.hasLifeSubmission },
      { id: 'pdca', label: 'PDCAサイクルの実施', check: (d) => d.hasPdca },
      { id: 'staff_count2', label: '常勤職員5名以上', check: (d) => d.staffCount >= 5 },
    ],
    documents: ['LIFEデータ提出記録', 'PDCA実施記録'],
    action: 'LIFEシステムへのデータ提出体制を整備してください',
  },
  {
    id: 'service_quality',
    name: 'サービス提供体制強化加算',
    unit_price_per_user: 3000,
    requirements: [
      { id: 'care_worker', label: '介護福祉士30%以上配置', check: (d) => d.careWorkerRatio >= 0.3 },
      { id: 'quality_check', label: '定期的な質評価の実施', check: (d) => d.hasQualityCheck },
      { id: 'staff_count3', label: '常勤職員4名以上', check: (d) => d.staffCount >= 4 },
    ],
    documents: ['職員資格一覧', '質評価記録'],
    action: '介護福祉士の採用を促進し、資格一覧を整備してください',
  },
];

// 資格・スキルタグのキーワードマッチング
const KEYWORDS = {
  ptOt: ['PT', 'OT', 'ST', '理学療法士', '作業療法士', '言語聴覚士', '機能訓練指導員'],
  careWorker: ['介護福祉士'],
  nurse: ['看護師', '准看護師', '保健師'],
  socialWorker: ['社会福祉士', 'ケアマネ', 'ケアマネジャー', '介護支援専門員'],
  rehabAdvisor: ['PT', 'OT', 'ST', '理学療法士', '作業療法士', '言語聴覚士', 'リハ', 'リハビリ'],
  lifePlan: ['ケアマネ', 'ケアマネジャー', '介護支援専門員', '社会福祉士'],
  adlSpec: ['介護福祉士', 'PT', 'OT', '理学療法士', '作業療法士', '機能訓練指導員'],
  dataOp: ['LIFE', 'ICT', 'データ', '科学的介護'],
};

function hasKeyword(staff, keyList) {
  const all = [...(staff.qualifications || []), ...(staff.skill_tags || [])];
  return all.some(q => keyList.some(k => q.includes(k)));
}

function buildFacilityData(settings, careUsers, staff, bizSettings) {
  // 在籍中のみを計算対象
  const workingStaff = staff.filter(s => s.status === 'active');
  const activeUsers = careUsers.filter(u => u.status === 'active');

  // 各資格・スキル保有スタッフを特定
  const ptOtStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.ptOt));
  const careWorkerStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.careWorker));
  const nurseStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.nurse));
  const rehabStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.rehabAdvisor));
  const lifePlanStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.lifePlan));
  const adlSpecStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.adlSpec));
  const dataOpStaff = workingStaff.filter(s => hasKeyword(s, KEYWORDS.dataOp));

  const hasPtOt = ptOtStaff.length > 0;
  const careWorkerCount = careWorkerStaff.length;
  const careWorkerRatio = workingStaff.length > 0 ? careWorkerCount / workingStaff.length : 0;

  // 「所属があれば加算要件を充足」と自動推論
  // リハ専門職がいれば連携体制あり / 生活機能アセスメント可能 / 生活機能向上計画作成可能
  const hasRehabConnection = rehabStaff.length > 0;
  const hasAssessment = rehabStaff.length > 0 || adlSpecStaff.length >= 2;
  const hasLifePlanDoc = lifePlanStaff.length > 0 || hasPtOt;

  // ADL評価はPT/OT/介護福祉士がいれば実施体制あり
  const hasAdlCapable = adlSpecStaff.length > 0;
  const hasAdlEval = hasAdlCapable && activeUsers.length >= 10;
  const hasAdlPlan = hasAdlCapable && activeUsers.length >= 10;

  // 科学的介護：LIFEデータ提出スタッフいるか、または専任ICT担当者がいれば推定可
  const hasLifeSubmission = dataOpStaff.length > 0;

  // 処遇改善：スタッフ3名以上 + 管理体制（管理者ロールのスタッフがいれば賃金計画作成済みと推定）
  const hasAdminStaff = workingStaff.some(s => s.role === 'admin' || s.role === 'full_time');
  const hasWagePlan = workingStaff.length >= 3 && hasAdminStaff;

  return {
    staffCount: workingStaff.length,
    activeUserCount: activeUsers.length,
    hasPtOt,
    hasCareWorker: careWorkerCount > 0,
    careWorkerRatio,
    hasTrainingPlan: workingStaff.length >= 3,
    hasWagePlan,
    hasTrainingPlanDoc: hasPtOt,
    hasRehabConnection,
    hasAssessment,
    hasLifePlanDoc,
    hasAdlEval,
    hasAdlPlan,
    hasLifeSubmission,
    hasPdca: workingStaff.length >= 5,
    hasQualityCheck: workingStaff.length >= 4,
    // 詳細情報（AIアドバイス表示用）
    ptOtCount: ptOtStaff.length,
    careWorkerCount,
    nurseCount: nurseStaff.length,
    rehabCount: rehabStaff.length,
    ptOtNames: ptOtStaff.map(s => s.full_name).join('・'),
    careWorkerNames: careWorkerStaff.map(s => s.full_name).join('・'),
  };
}

function diagnose(facilityData) {
  const obtained = [];
  const obtainable = [];
  const insufficient = [];

  ADDITIONS.forEach(addition => {
    const results = addition.requirements.map(req => ({
      ...req,
      met: req.check(facilityData),
    }));
    const allMet = results.every(r => r.met);
    const anyMet = results.some(r => r.met);
    const missing = results.filter(r => !r.met);

    if (allMet) {
      obtained.push({ ...addition, results });
    } else if (anyMet && missing.length <= 2) {
      obtainable.push({ ...addition, results, missing });
    } else {
      insufficient.push({ ...addition, results, missing });
    }
  });

  return { obtained, obtainable, insufficient };
}

export default function CareAdditionAI() {
  const [diagResult, setDiagResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  // { [addition_id]: { obtained: bool, unit_price: number } }
  const [customSettings, setCustomSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('addition_custom') || '{}'); } catch { return {}; }
  });

  const saveCustom = (id, field, value) => {
    const next = { ...customSettings, [id]: { ...(customSettings[id] || {}), [field]: value } };
    setCustomSettings(next);
    localStorage.setItem('addition_custom', JSON.stringify(next));
  };

  const { data: careUsers = [] } = useQuery({
    queryKey: ['care-user-records-ai'],
    queryFn: () => base44.entities.CareUserRecord.list('-start_date', 200),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-for-ai'],
    queryFn: () => base44.entities.Staff.list(),
  });
  const { data: bizSettingsList = [] } = useQuery({
    queryKey: ['care-biz-settings-ai'],
    queryFn: () => base44.entities.CareBusinessSettings.list(),
  });
  const { data: siteSettings = {} } = useQuery({
    queryKey: ['site-settings-ai'],
    queryFn: async () => { const s = await base44.entities.SiteSettings.list(); return s[0] || {}; },
  });

  const bizSettings = bizSettingsList[0] || {};
  const isDataReady = staff.length > 0 || careUsers.length > 0;

  const handleDiagnose = async () => {
    setIsAnalyzing(true);
    const facilityData = buildFacilityData(siteSettings, careUsers, staff, bizSettings);
    const result = diagnose(facilityData);

    // カスタム設定を反映：取得済みフラグがONのものを obtained へ移動
    Object.entries(customSettings).forEach(([id, cs]) => {
      if (!cs.obtained) return;
      ['obtainable', 'insufficient'].forEach(key => {
        const idx = result[key].findIndex(a => a.id === id);
        if (idx >= 0) {
          const [item] = result[key].splice(idx, 1);
          if (!result.obtained.find(a => a.id === id)) result.obtained.push(item);
        }
      });
    });

    // AI insight
    try {
      const prompt = `
介護通所サービス事業所の加算診断結果を分析してください。

【事業所データ】
・在籍スタッフ数: ${facilityData.staffCount}名
・利用者数: ${facilityData.activeUserCount}名
・介護福祉士数: ${facilityData.careWorkerCount}名（比率: ${Math.round(facilityData.careWorkerRatio * 100)}%）${facilityData.careWorkerNames ? '（' + facilityData.careWorkerNames + '）' : ''}
・機能訓練指導員（PT/OT等）: ${facilityData.ptOtCount}名${facilityData.ptOtNames ? '（' + facilityData.ptOtNames + '）' : ''}
・リハビリ専門職: ${facilityData.rehabCount}名
・看護師: ${facilityData.nurseCount}名

【診断結果】
・既取得加算: ${result.obtained.map(a => a.name).join('、') || 'なし'}
・取得可能加算: ${result.obtainable.map(a => a.name).join('、') || 'なし'}
・条件不足加算: ${result.insufficient.map(a => a.name).join('、') || 'なし'}

スタッフの資格・所属を踏まえ、最優先で取り組むべき加算と具体的な改善アクションを1〜2文で簡潔にアドバイスしてください。
      `;
      const insight = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gpt_5_mini' });
      setAiInsight(typeof insight === 'string' ? insight : '');
    } catch (e) {
      setAiInsight('');
    }

    setDiagResult(result);
    setIsAnalyzing(false);
  };

  const totalMonthlyIncrease = diagResult
    ? diagResult.obtainable.reduce((s, a) => {
        const users = careUsers.filter(u => u.status === 'active').length || 10;
        const price = customSettings[a.id]?.unit_price || a.unit_price_per_user;
        return s + price * users;
      }, 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/AdminPanel" className="flex items-center gap-2 text-white/70 hover:text-white mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" />管理画面へ戻る
          </Link>
          <div className="flex items-center gap-3">
            <Brain className="w-7 h-7 text-[#E8A4B8]" />
            <div>
              <h1 className="text-2xl font-bold">加算診断AI</h1>
              <p className="text-white/70 text-sm">取得可能な介護加算を診断し、収益改善を可視化</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* 事業所サマリ */}
        <Card className="border-0 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm">診断に使用するデータ</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: '在籍スタッフ', value: `${staff.filter(s => s.status === 'active').length}名` },
              { label: '利用者数', value: `${careUsers.filter(u => u.status === 'active').length}名` },
              { label: '介護福祉士', value: `${staff.filter(s => s.status === 'active' && hasKeyword(s, KEYWORDS.careWorker)).length}名` },
              { label: 'PT/OT/ST等', value: `${staff.filter(s => s.status === 'active' && hasKeyword(s, KEYWORDS.ptOt)).length}名` },
              { label: '看護師', value: `${staff.filter(s => s.status === 'active' && hasKeyword(s, KEYWORDS.nurse)).length}名` },
              { label: 'ケアマネ等', value: `${staff.filter(s => s.status === 'active' && hasKeyword(s, KEYWORDS.socialWorker)).length}名` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          <Button
            className="w-full mt-4 bg-[#2D4A6F] hover:bg-[#1E3A5F] h-12 text-base"
            onClick={handleDiagnose}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />AI診断中...</>
            ) : (
              <><Brain className="w-5 h-5 mr-2" />加算診断を実行</>
            )}
          </Button>
          {!isDataReady && (
            <p className="text-xs text-amber-600 mt-2 text-center">※スタッフ・利用者データを登録すると精度が上がります</p>
          )}
          {/* カスタマイズ折りたたみ */}
          <button
            className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1"
            onClick={() => setShowCustomize(v => !v)}
          >
            ⚙️ 加算の単価・取得済み状況を手動で設定する {showCustomize ? '▲' : '▼'}
          </button>
          {showCustomize && (
            <div className="mt-3 space-y-2 border-t pt-3">
              {ADDITIONS.map(a => {
                const cs = customSettings[a.id] || {};
                return (
                  <div key={a.id} className="bg-slate-50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 flex-1">{a.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cs.obtained === true}
                          onChange={e => saveCustom(a.id, 'obtained', e.target.checked)}
                          className="rounded"
                        />
                        取得済み
                      </label>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>単価¥</span>
                        <input
                          type="number"
                          className="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
                          placeholder={a.unit_price_per_user}
                          value={cs.unit_price ?? ''}
                          onChange={e => saveCustom(a.id, 'unit_price', e.target.value ? Number(e.target.value) : '')}
                        />
                        <span>/人</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-slate-400">※ 設定はブラウザに保存されます</p>
            </div>
          )}
        </Card>

        {diagResult && (
          <>
            {/* AI アドバイス */}
            {aiInsight && (
              <Card className="border-0 shadow-sm p-5 bg-gradient-to-br from-[#2D4A6F]/5 to-white">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2D4A6F] flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#2D4A6F] font-semibold mb-1">AIアドバイス</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{aiInsight}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* 収益サマリ */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm p-4 bg-emerald-50 border-2 border-emerald-200">
                <p className="text-xs text-emerald-600 font-medium">想定月収益増</p>
                <p className="text-2xl font-bold text-emerald-700">+¥{totalMonthlyIncrease.toLocaleString()}</p>
                <p className="text-xs text-emerald-500 mt-1">取得可能加算計</p>
              </Card>
              <Card className="border-0 shadow-sm p-4 bg-blue-50 border-2 border-blue-200">
                <p className="text-xs text-blue-600 font-medium">想定年収益増</p>
                <p className="text-2xl font-bold text-blue-700">+¥{(totalMonthlyIncrease * 12).toLocaleString()}</p>
                <p className="text-xs text-blue-500 mt-1">12ヶ月換算</p>
              </Card>
            </div>

            {/* 取得中加算 */}
            {diagResult.obtained.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />現在取得中加算
                </h2>
                <div className="space-y-2">
                  {diagResult.obtained.map(a => (
                    <Card key={a.id} className="border-0 shadow-sm p-4 bg-emerald-50 border-l-4 border-emerald-400">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-800">{a.name}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">取得中</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 取得可能加算 */}
            {diagResult.obtainable.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />取得可能加算（条件を満たせば取得可）
                </h2>
                <div className="space-y-3">
                  {diagResult.obtainable.map(a => {
                    const users = careUsers.filter(u => u.status === 'active').length || 10;
                    const monthly = a.unit_price_per_user * users;
                    return (
                      <Card key={a.id} className="border-0 shadow-sm p-4 border-l-4 border-amber-400">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="font-semibold text-slate-800">{a.name}</span>
                          <Badge className="bg-amber-100 text-amber-700 border-0 shrink-0">取得可能</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-amber-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-amber-600">想定月収益増</p>
                            <p className="font-bold text-amber-700">+¥{monthly.toLocaleString()}</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-amber-600">想定年収益増</p>
                            <p className="font-bold text-amber-700">+¥{(monthly * 12).toLocaleString()}</p>
                          </div>
                        </div>
                        {/* 不足条件 */}
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-slate-500 mb-1">不足条件</p>
                          {a.missing.map(m => (
                            <div key={m.id} className="flex items-center gap-2 text-sm text-red-600">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{m.label}</span>
                            </div>
                          ))}
                        </div>
                        {/* 必要書類 */}
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-slate-500 mb-1">必要書類</p>
                          <div className="flex flex-wrap gap-1">
                            {a.documents.map(doc => (
                              <span key={doc} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FileText className="w-3 h-3" />{doc}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* 推奨アクション */}
                        <div className="bg-[#2D4A6F]/5 rounded-lg p-3">
                          <p className="text-xs font-semibold text-[#2D4A6F] mb-0.5">推奨アクション</p>
                          <p className="text-sm text-slate-700">{a.action}</p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 条件不足加算 */}
            {diagResult.insufficient.length > 0 && (
              <div>
                <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-slate-400" />条件不足加算（中長期的に検討）
                </h2>
                <div className="space-y-2">
                  {diagResult.insufficient.map(a => (
                    <Card key={a.id} className="border-0 shadow-sm p-4 border-l-4 border-slate-200">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-semibold text-slate-600">{a.name}</span>
                        <Badge variant="outline" className="text-slate-400 shrink-0 text-xs">条件不足</Badge>
                      </div>
                      <div className="space-y-1">
                        {a.missing.slice(0, 3).map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs text-slate-500">
                            <XCircle className="w-3 h-3 shrink-0 text-slate-400" />
                            <span>{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}