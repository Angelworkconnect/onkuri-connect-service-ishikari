import React from 'react';
import { Card } from "@/components/ui/card";
import { QrCode, Gift, Sparkles } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function InfoSection() {
  const { data: siteSettings = {} } = useQuery({
    queryKey: ['site-settings-info'],
    queryFn: async () => {
      const settings = await base44.entities.SiteSettings.list();
      return settings.length > 0 ? settings[0] : {};
    },
  });

  const qrTitle = siteSettings.info_qr_title || '勤怠打刻方法';
  const qrDescription = siteSettings.info_qr_description || '勤務開始時・終了時に、事業所内に設置されたQRコードを読み取ってください。位置情報を確認し、自動的に打刻されます。';
  
  const thanksTitle = siteSettings.info_thanks_title || '感謝が見える仕組み';
  const thanksDescription = siteSettings.info_thanks_description || 'チップは、利用者・ご家族・事業所からの評価に基づき、不定期で付与されます。';
  const thanksItems = siteSettings.info_thanks_items || [
    '現場貢献スペシャルサンクス',
    '感謝還元サンクスギフト',
    '人財穴埋めサンクス'
  ];
  
  const benefitsTitle = siteSettings.info_benefits_title || '福利厚生制度';
  const benefitsDescription = siteSettings.info_benefits_description || '働く人の人生の質を高める福利厚生制度を整えています。';
  const benefitsItems = siteSettings.info_benefits_items || [
    'エステ／リラクゼーション利用券',
    'カーシェアサービス利用権',
    'ガレージ使用権',
    '介護タクシー職員割引',
    '葬祭・遺品整理 割引制度'
  ];

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="p-6 space-y-4">
        {/* QR勤怠打刻 */}
        <div className="bg-[#2D4A6F]/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2D4A6F]/10 flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5 text-[#2D4A6F]" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-800 mb-1">{qrTitle}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {qrDescription}
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
              <h4 className="text-sm font-medium text-slate-800 mb-1">{thanksTitle}</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {thanksDescription}
              </p>
              <div className="space-y-1 text-xs text-slate-500">
                {thanksItems.map((item, index) => (
                  <div key={index}>• {item}</div>
                ))}
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
              <h4 className="text-sm font-medium text-slate-800 mb-1">{benefitsTitle}</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                {benefitsDescription}
              </p>
              <div className="space-y-1 text-xs text-slate-500">
                {benefitsItems.map((item, index) => (
                  <div key={index}>• {item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}