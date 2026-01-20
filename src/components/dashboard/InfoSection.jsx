import React from 'react';
import { Card } from "@/components/ui/card";
import { Info, QrCode, MapPin, Gift, Heart, Sparkles } from "lucide-react";

export default function InfoSection() {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#2D4A6F] to-[#3A5A7F] text-white p-6">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5" />
          <h3 className="font-medium">スタッフ専用ページへようこそ</h3>
        </div>
        <p className="text-sm text-white/80">
          このページは現職員および登録スタッフ専用です
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* 主な機能 */}
        <div>
          <h4 className="text-sm font-medium text-slate-800 mb-3">利用できる機能</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-[#E8A4B8] mt-1">•</span>
              <span>勤務予定の確認</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E8A4B8] mt-1">•</span>
              <span>QRコードによる勤怠打刻</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E8A4B8] mt-1">•</span>
              <span>勤怠履歴の確認</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E8A4B8] mt-1">•</span>
              <span>評価・チップ履歴の確認</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#E8A4B8] mt-1">•</span>
              <span>福利厚生サービスの利用申請</span>
            </li>
          </ul>
        </div>

        {/* QR勤怠打刻 */}
        <div className="bg-[#2D4A6F]/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2D4A6F]/10 flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5 text-[#2D4A6F]" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">勤怠打刻方法</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                勤務開始時・終了時に、事業所内に設置されたQRコードを読み取ってください。
                位置情報を確認し、自動的に打刻されます。
              </p>
            </div>
          </div>
        </div>

        {/* チップ制度 */}
        <div className="bg-[#E8A4B8]/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8A4B8]/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#C17A8E]" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">感謝が見える仕組み</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                チップは、利用者・ご家族・事業所からの評価に基づき、不定期で付与されます。
              </p>
              <div className="space-y-1 text-xs text-slate-500">
                <div>• 現場貢献スペシャルサンクス</div>
                <div>• 感謝還元サンクスギフト</div>
                <div>• 人財穴埋めサンクス</div>
              </div>
            </div>
          </div>
        </div>

        {/* 福利厚生 */}
        <div className="bg-[#7CB342]/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7CB342]/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-[#7CB342]" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">福利厚生制度</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                働く人の人生の質を高める福利厚生制度を整えています。
              </p>
              <div className="space-y-1 text-xs text-slate-500">
                <div>• エステ／リラクゼーション利用券</div>
                <div>• カーシェアサービス利用権</div>
                <div>• ガレージ使用権</div>
                <div>• 介護タクシー職員割引</div>
                <div>• 葬祭・遺品整理 割引制度</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}