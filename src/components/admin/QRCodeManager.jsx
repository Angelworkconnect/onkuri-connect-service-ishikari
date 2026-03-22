import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import QRCode from 'qrcode';
import { RefreshCw, Download, QrCode, Lock, Zap, Hand, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';

// JST対応の有効期限計算: 指定日のJST 23:59:59をUTC msで返す
function jstEndOfDay(dateStr) {
  // dateStr: "YYYY-MM-DD"
  // JSTの23:59:59 = UTC 14:59:59 (UTC+9)
  const [y, m, d] = dateStr.split('-').map(Number);
  // UTC ms for JST 23:59:59 of that date
  return Date.UTC(y, m - 1, d, 14, 59, 59, 999);
}

function getNowJstDate() {
  const now = new Date();
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const jstDate = new Date(jstMs);
  return format(jstDate, 'yyyy-MM-dd');
}

function getNowJstYearMonth() {
  return getNowJstDate().substring(0, 7);
}

const MODE_CONFIG = {
  auto: { label: '自動モード', icon: Zap, color: 'bg-green-100 text-green-700', desc: '設定した間隔で自動的にQRコードを更新' },
  manual: { label: '手動モード', icon: Hand, color: 'bg-blue-100 text-blue-700', desc: '管理者が手動でQRコードを更新' },
  fixed: { label: '固定モード', icon: Lock, color: 'bg-purple-100 text-purple-700', desc: 'QRコードを変更せず固定で使い続ける' },
};

const INTERVAL_OPTIONS = [
  { value: 1, label: '毎日' },
  { value: 7, label: '毎週（7日）' },
  { value: 14, label: '2週間ごと' },
  { value: 30, label: '毎月（30日）' },
  { value: 90, label: '3ヶ月ごと' },
  { value: 365, label: '1年ごと' },
];

export default function QRCodeManager() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [selectedMode, setSelectedMode] = useState('manual');
  const [intervalDays, setIntervalDays] = useState(30);
  const [label, setLabel] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: tokens = [] } = useQuery({
    queryKey: ['qr-tokens'],
    queryFn: () => base44.entities.QRCodeToken.list('-created_date'),
  });

  const currentToken = tokens.find(t => t.is_active);

  // 自動ローテーションチェック
  useEffect(() => {
    if (!currentToken || currentToken.mode !== 'auto') return;
    const now = Date.now();
    const nextRotation = currentToken.next_rotation_at_utc_ms;
    if (nextRotation && now >= nextRotation) {
      // 期限切れ → 自動生成
      generateTokenMutation.mutate({
        mode: 'auto',
        intervalDays: currentToken.rotation_interval_days || 30,
        label: currentToken.label || '',
      });
    }
  }, [currentToken]);

  // QRコード生成
  useEffect(() => {
    if (currentToken?.token) {
      QRCode.toDataURL(currentToken.token, {
        width: 400,
        margin: 2,
        color: { dark: '#2D4A6F', light: '#FFFFFF' }
      }).then(setQrDataUrl);
    } else {
      setQrDataUrl('');
    }
  }, [currentToken?.token]);

  // 設定フォームを現在トークンで初期化
  useEffect(() => {
    if (currentToken) {
      setSelectedMode(currentToken.mode || 'manual');
      setIntervalDays(currentToken.rotation_interval_days || 30);
      setLabel(currentToken.label || '');
    }
  }, [currentToken?.id]);

  const generateTokenMutation = useMutation({
    mutationFn: async ({ mode, intervalDays, label }) => {
      const nowMs = Date.now();
      const jstDate = getNowJstDate();
      const yearMonth = getNowJstYearMonth();

      // 有効期限計算
      let expiresDays = intervalDays;
      if (mode === 'fixed') expiresDays = 365 * 10; // 固定は10年
      const expiresDateStr = format(addDays(new Date(jstDate), expiresDays), 'yyyy-MM-dd');
      const expiresUtcMs = jstEndOfDay(expiresDateStr);

      // 次回自動更新
      const nextRotationMs = mode === 'auto' ? nowMs + intervalDays * 24 * 60 * 60 * 1000 : null;

      const tokenStr = mode === 'fixed'
        ? `ONKURI-FIXED-${Math.random().toString(36).substring(2, 15)}`
        : `ONKURI-${yearMonth}-${Math.random().toString(36).substring(2, 15)}`;

      // 既存アクティブを無効化
      for (const t of tokens) {
        if (t.is_active) {
          await base44.entities.QRCodeToken.update(t.id, { is_active: false });
        }
      }

      return base44.entities.QRCodeToken.create({
        token: tokenStr,
        year_month: yearMonth,
        expires_at: expiresDateStr,
        expires_at_utc_ms: expiresUtcMs,
        is_active: true,
        mode,
        rotation_interval_days: intervalDays,
        next_rotation_at_utc_ms: nextRotationMs,
        label: label || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-tokens']);
      setShowSettings(false);
    },
  });

  const downloadQR = () => {
    if (!qrDataUrl || !currentToken) return;
    const link = document.createElement('a');
    link.download = `勤怠QRコード_${currentToken.label || currentToken.year_month}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // 有効期限の状態チェック（JST対応）
  const getExpiryStatus = () => {
    if (!currentToken) return null;
    const nowMs = Date.now();
    // expires_at_utc_ms があれば使用、なければ旧式でJST補正
    const expiresMs = currentToken.expires_at_utc_ms
      ? currentToken.expires_at_utc_ms
      : jstEndOfDay(currentToken.expires_at);
    const remainingMs = expiresMs - nowMs;
    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));

    if (remainingMs < 0) return { status: 'expired', label: '期限切れ', color: 'bg-red-100 text-red-700' };
    if (remainingDays <= 3) return { status: 'soon', label: `あと${remainingDays}日`, color: 'bg-amber-100 text-amber-700' };
    return { status: 'valid', label: `あと${remainingDays}日`, color: 'bg-green-100 text-green-700' };
  };

  const expiryStatus = getExpiryStatus();
  const modeConfig = currentToken ? MODE_CONFIG[currentToken.mode || 'manual'] : null;

  return (
    <div className="space-y-6">
      {/* ステータスカード */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-medium flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              勤怠QRコード管理
            </h2>
            <p className="text-sm text-slate-500 mt-1">自動・手動・固定の3モードに対応</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
            >
              設定・新規生成
            </Button>
            {currentToken?.mode !== 'fixed' && (
              <Button
                onClick={() => generateTokenMutation.mutate({
                  mode: currentToken?.mode || 'manual',
                  intervalDays: currentToken?.rotation_interval_days || 30,
                  label: currentToken?.label || '',
                })}
                disabled={generateTokenMutation.isPending}
                className="bg-[#2D4A6F]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                今すぐ更新
              </Button>
            )}
          </div>
        </div>

        {/* 設定パネル */}
        {showSettings && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-medium text-slate-800">QRコード設定</h3>

            {/* モード選択 */}
            <div>
              <Label className="mb-2 block">更新モード</Label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(MODE_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMode(key)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedMode === key
                          ? 'border-[#2D4A6F] bg-[#2D4A6F]/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1 text-slate-600" />
                      <div className="text-sm font-medium">{cfg.label}</div>
                      <div className="text-xs text-slate-500 mt-1">{cfg.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 間隔設定（固定以外） */}
            {selectedMode !== 'fixed' && (
              <div>
                <Label className="mb-2 block">
                  {selectedMode === 'auto' ? '自動更新間隔' : '有効期限'}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {INTERVAL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setIntervalDays(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        intervalDays === opt.value
                          ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ラベル */}
            <div>
              <Label className="mb-2 block">管理用ラベル（任意）</Label>
              <Input
                placeholder="例: 本社用QR、2024年4月〜"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => generateTokenMutation.mutate({ mode: selectedMode, intervalDays, label })}
                disabled={generateTokenMutation.isPending}
                className="bg-[#2D4A6F]"
              >
                {generateTokenMutation.isPending ? '生成中...' : '新しいQRコードを生成'}
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>キャンセル</Button>
            </div>
          </div>
        )}

        {currentToken ? (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* QRコード表示 */}
              <div className="flex-shrink-0">
                {qrDataUrl && (
                  <div className="bg-white p-4 rounded-lg border-2 border-[#2D4A6F]">
                    <img src={qrDataUrl} alt="QRコード" className="w-64 h-64" />
                  </div>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 space-y-3">
                {/* バッジ群 */}
                <div className="flex flex-wrap gap-2">
                  {modeConfig && (
                    <Badge className={modeConfig.color}>
                      <modeConfig.icon className="w-3 h-3 mr-1" />
                      {modeConfig.label}
                    </Badge>
                  )}
                  {expiryStatus && (
                    <Badge className={expiryStatus.color}>
                      <Clock className="w-3 h-3 mr-1" />
                      {expiryStatus.label}
                    </Badge>
                  )}
                  {currentToken.label && (
                    <Badge variant="outline">{currentToken.label}</Badge>
                  )}
                </div>

                {/* 期限切れ警告 */}
                {expiryStatus?.status === 'expired' && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>QRコードの期限が切れています</strong>
                      <p className="mt-1 text-xs">スタッフがスキャンできない状態です。「今すぐ更新」ボタンで新しいコードを生成してください。</p>
                    </div>
                  </div>
                )}
                {expiryStatus?.status === 'soon' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>まもなく期限が切れます</strong>
                      <p className="mt-1 text-xs">月末のエラーを防ぐため、早めに更新することをお勧めします。</p>
                    </div>
                  </div>
                )}

                {/* 詳細情報 */}
                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">発行年月</span>
                    <span className="font-medium">{currentToken.year_month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">有効期限</span>
                    <span className="font-medium">{currentToken.expires_at}（JST 23:59まで）</span>
                  </div>
                  {currentToken.mode === 'auto' && currentToken.next_rotation_at_utc_ms && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">次回自動更新</span>
                      <span className="font-medium text-green-700">
                        {format(new Date(currentToken.next_rotation_at_utc_ms), 'yyyy/MM/dd HH:mm')}
                      </span>
                    </div>
                  )}
                  {currentToken.rotation_interval_days && currentToken.mode !== 'fixed' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">更新間隔</span>
                      <span className="font-medium">
                        {INTERVAL_OPTIONS.find(o => o.value === currentToken.rotation_interval_days)?.label
                          || `${currentToken.rotation_interval_days}日`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 固定モードの場合の注意 */}
                {currentToken.mode === 'fixed' && (
                  <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-sm">
                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>固定モードのため、手動で「設定・新規生成」から変更するまでこのQRコードが使われ続けます。</div>
                  </div>
                )}

                <Button onClick={downloadQR} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  QRコードをダウンロード
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <QrCode className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>QRコードが生成されていません</p>
            <p className="text-sm mt-2">「設定・新規生成」ボタンから生成してください</p>
          </div>
        )}
      </Card>

      {/* 履歴 */}
      {tokens.filter(t => !t.is_active).length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-3">過去のQRコード履歴</h3>
          <div className="space-y-2">
            {tokens.filter(t => !t.is_active).slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                <span className="text-slate-500">{t.label || t.year_month}</span>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="text-xs">{MODE_CONFIG[t.mode || 'manual']?.label || '手動'}</Badge>
                  <span className="text-slate-400 text-xs">{t.expires_at}まで</span>
                  <Badge variant="outline" className="text-xs text-red-500">無効</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}