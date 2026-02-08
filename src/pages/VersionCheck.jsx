import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatMessageTimeFromUtc } from '@/components/utils/datetime';

const APP_BUILD_VERSION = "2026-02-09-datetime-fix-v1";

export default function VersionCheck() {
  const [savedVersion, setSavedVersion] = useState('');
  const [cacheCleared, setCacheCleared] = useState(false);
  const [testTimestamp] = useState(Date.now());

  useEffect(() => {
    const version = localStorage.getItem('app_build_version') || '(未設定)';
    setSavedVersion(version);
  }, []);

  const handleClearCache = async () => {
    try {
      // LocalStorage更新
      localStorage.setItem('app_build_version', APP_BUILD_VERSION);
      
      // Service Worker削除
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      
      // Cache Storage削除
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          await caches.delete(name);
        }
      }
      
      setCacheCleared(true);
      
      // 2秒後に強制リロード
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Cache clear error:', error);
      alert('キャッシュクリアに失敗しました: ' + error.message);
    }
  };

  const isVersionMatch = savedVersion === APP_BUILD_VERSION;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            バージョン確認・キャッシュクリア
          </h1>
          <p className="text-slate-600">
            スマホで日時表示が正しくない場合は、ここでキャッシュをクリアしてください
          </p>
        </div>

        {/* バージョン情報 */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">バージョン情報</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">最新バージョン:</span>
              <span className="font-mono font-bold text-green-600">{APP_BUILD_VERSION}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">現在のバージョン:</span>
              <span className="font-mono font-bold text-blue-600">{savedVersion}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">ステータス:</span>
              {isVersionMatch ? (
                <span className="flex items-center gap-2 text-green-600 font-bold">
                  <CheckCircle className="w-5 h-5" />
                  最新
                </span>
              ) : (
                <span className="flex items-center gap-2 text-orange-600 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                  更新が必要
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* 日時表示テスト */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">日時表示テスト</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">現在時刻（JST）:</span>
              <span className="font-bold text-slate-800">
                {formatMessageTimeFromUtc(testTimestamp)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">UTCミリ秒:</span>
              <span className="font-mono text-sm text-slate-600">{testTimestamp}</span>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg mt-4">
              <p className="text-sm text-blue-800">
                <strong>確認方法:</strong> この時刻がPCとスマホで完全一致するか確認してください。
                ズレている場合は下のボタンでキャッシュをクリアしてください。
              </p>
            </div>
          </div>
        </Card>

        {/* キャッシュクリア */}
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">キャッシュクリア</h2>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              スマホで古い日時が表示される場合、キャッシュが原因の可能性があります。
              下のボタンを押すと、Service WorkerとCache Storageを削除し、自動的にリロードします。
            </p>
            {cacheCleared ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="font-bold text-green-800">キャッシュクリア完了！</p>
                <p className="text-sm text-green-700 mt-1">まもなく自動的にリロードします...</p>
              </div>
            ) : (
              <Button
                onClick={handleClearCache}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                キャッシュをクリアして再読み込み
              </Button>
            )}
          </div>
        </Card>

        {/* 説明 */}
        <Card className="p-6 bg-slate-100">
          <h3 className="font-bold mb-3">📱 スマホで日時がおかしい場合の対処法</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>このページを開く</li>
            <li>「キャッシュをクリアして再読み込み」ボタンを押す</li>
            <li>自動的にリロードされるまで待つ</li>
            <li>日時表示を再確認する</li>
          </ol>
          <p className="text-xs text-slate-500 mt-4">
            ※ それでも直らない場合は、ブラウザの設定から「キャッシュとCookieを削除」してください
          </p>
        </Card>
      </div>
    </div>
  );
}