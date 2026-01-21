import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import QRCode from 'qrcode';
import { RefreshCw, Download, QrCode } from 'lucide-react';
import { format, addMonths } from 'date-fns';

export default function QRCodeManager() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const queryClient = useQueryClient();

  const { data: tokens = [] } = useQuery({
    queryKey: ['qr-tokens'],
    queryFn: () => base44.entities.QRCodeToken.list('-created_date'),
  });

  const currentToken = tokens.find(t => t.is_active);

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const yearMonth = format(now, 'yyyy-MM');
      const expiresAt = format(addMonths(now, 1), 'yyyy-MM-dd');
      const token = `ONKURI-${yearMonth}-${Math.random().toString(36).substring(2, 15)}`;
      
      // 既存のトークンを無効化
      for (const t of tokens) {
        if (t.is_active) {
          await base44.entities.QRCodeToken.update(t.id, { is_active: false });
        }
      }
      
      // 新しいトークンを作成
      return base44.entities.QRCodeToken.create({
        token,
        year_month: yearMonth,
        expires_at: expiresAt,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['qr-tokens']);
    },
  });

  useEffect(() => {
    if (currentToken?.token) {
      QRCode.toDataURL(currentToken.token, {
        width: 400,
        margin: 2,
        color: {
          dark: '#2D4A6F',
          light: '#FFFFFF'
        }
      }).then(setQrDataUrl);
    }
  }, [currentToken]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `勤怠QRコード_${currentToken.year_month}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            勤怠QRコード管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            毎月更新するQRコードで出退勤を管理
          </p>
        </div>
        <Button 
          onClick={() => generateTokenMutation.mutate()}
          disabled={generateTokenMutation.isPending}
          className="bg-[#2D4A6F]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {generateTokenMutation.isPending ? '生成中...' : '新しいQRコード生成'}
        </Button>
      </div>

      {currentToken ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-shrink-0">
              {qrDataUrl && (
                <div className="bg-white p-4 rounded-lg border-2 border-[#2D4A6F]">
                  <img src={qrDataUrl} alt="QRコード" className="w-64 h-64" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">有効期間</div>
                <div className="text-lg font-medium">{currentToken.year_month}</div>
                <div className="text-sm text-slate-500 mt-1">
                  {format(new Date(currentToken.expires_at), 'yyyy年M月d日')}まで有効
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="text-sm text-amber-800">
                  <strong>使い方：</strong>
                  <ol className="mt-2 space-y-1 list-decimal list-inside">
                    <li>このQRコードを印刷または画面表示</li>
                    <li>スタッフが出退勤時にスマホでスキャン</li>
                    <li>毎月1日に新しいQRコードを生成</li>
                  </ol>
                </div>
              </div>

              <Button 
                onClick={downloadQR}
                variant="outline"
                className="w-full"
              >
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
          <p className="text-sm mt-2">上のボタンから生成してください</p>
        </div>
      )}
    </Card>
  );
}