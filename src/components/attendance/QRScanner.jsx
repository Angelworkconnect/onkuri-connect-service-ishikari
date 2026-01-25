import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { QrCode, Camera, CheckCircle, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ user, todayAttendance, onSuccess }) {
  const [scannedToken, setScannedToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCameraMode, setIsCameraMode] = useState(false);
  const queryClient = useQueryClient();
  const html5QrCodeRef = useRef(null);
  const isScanning = useRef(false);

  const clockInMutation = useMutation({
    mutationFn: async (token) => {
      // トークン検証
      const tokens = await base44.entities.QRCodeToken.filter({ 
        token, 
        is_active: true 
      });

      if (tokens.length === 0) {
        throw new Error('無効なQRコードです');
      }

      const validToken = tokens[0];
      const now = new Date();
      if (new Date(validToken.expires_at) < now) {
        throw new Error('QRコードの有効期限が切れています');
      }

      // 出勤打刻
      const today = format(now, 'yyyy-MM-dd');
      const clockIn = format(now, 'HH:mm');

      await base44.entities.Attendance.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        date: today,
        clock_in: clockIn,
        status: 'working',
      });

      // QRコード出退勤サンクスを自動付与
      await base44.entities.TipRecord.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        tip_type: 'qr_attendance_thanks',
        amount: 50,
        reason: 'QRコードで正確に出勤記録',
        given_by: 'システム自動付与',
        date: today,
      });
    },
    onSuccess: () => {
      setSuccess('出勤を記録しました！（+50pt サンクス付与）');
      setError('');
      setScannedToken('');
      queryClient.invalidateQueries(['attendance']);
      queryClient.invalidateQueries(['tips']);
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (token) => {
      // トークン検証
      const tokens = await base44.entities.QRCodeToken.filter({ 
        token, 
        is_active: true 
      });

      if (tokens.length === 0) {
        throw new Error('無効なQRコードです');
      }

      const validToken = tokens[0];
      const now = new Date();
      if (new Date(validToken.expires_at) < now) {
        throw new Error('QRコードの有効期限が切れています');
      }

      // 退勤打刻
      const today = format(now, 'yyyy-MM-dd');
      const clockOut = format(now, 'HH:mm');
      await base44.entities.Attendance.update(todayAttendance.id, {
        clock_out: clockOut,
        status: 'completed',
      });

      // QRコード出退勤サンクスを自動付与
      await base44.entities.TipRecord.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        tip_type: 'qr_attendance_thanks',
        amount: 50,
        reason: 'QRコードで正確に退勤記録',
        given_by: 'システム自動付与',
        date: today,
      });
    },
    onSuccess: () => {
      setSuccess('退勤を記録しました！（+50pt サンクス付与）');
      setError('');
      setScannedToken('');
      queryClient.invalidateQueries(['attendance']);
      queryClient.invalidateQueries(['tips']);
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const handleSubmit = () => {
    if (!scannedToken.trim()) {
      setError('QRコードをスキャンしてください');
      return;
    }

    setError('');
    setSuccess('');

    if (todayAttendance?.clock_in && !todayAttendance.clock_out) {
      clockOutMutation.mutate(scannedToken);
    } else {
      clockInMutation.mutate(scannedToken);
    }
  };

  const isWorking = todayAttendance?.clock_in && !todayAttendance.clock_out;

  const startCamera = async () => {
    setError('');
    setSuccess('');
    setIsCameraMode(true);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = html5QrCode;
        isScanning.current = true;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // QRコード読み取り成功
            html5QrCode.stop().then(() => {
              isScanning.current = false;
              setIsCameraMode(false);
              if (isWorking) {
                clockOutMutation.mutate(decodedText);
              } else {
                clockInMutation.mutate(decodedText);
              }
            });
          },
          (errorMessage) => {
            // スキャン中のエラーは無視
          }
        );
      } catch (err) {
        console.error('カメラエラー:', err);
        setError('カメラの起動に失敗しました。ブラウザの設定でカメラへのアクセスを許可してください。');
        setIsCameraMode(false);
        isScanning.current = false;
      }
    }, 100);
  };

  const stopCamera = () => {
    if (html5QrCodeRef.current && isScanning.current) {
      html5QrCodeRef.current.stop().then(() => {
        isScanning.current = false;
        setIsCameraMode(false);
      }).catch((err) => {
        console.error('カメラ停止エラー:', err);
        isScanning.current = false;
        setIsCameraMode(false);
      });
    } else {
      setIsCameraMode(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && isScanning.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-[#2D4A6F]/10 rounded-full flex items-center justify-center">
          <QrCode className="w-8 h-8 text-[#2D4A6F]" />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">
            QRコードで{isWorking ? '退勤' : '出勤'}
          </h3>
          <p className="text-sm text-slate-500">
            カメラでQRコードをスキャンしてください
          </p>
        </div>

        {isCameraMode ? (
          <div className="space-y-3">
            <div 
              id="qr-reader" 
              className="w-full"
            />
            <Button
              onClick={stopCamera}
              variant="outline"
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              キャンセル
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={startCamera}
              disabled={clockInMutation.isPending || clockOutMutation.isPending}
              className={`w-full ${isWorking ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#7CB342] hover:bg-[#6BA232]'}`}
            >
              <Camera className="w-4 h-4 mr-2" />
              {clockInMutation.isPending || clockOutMutation.isPending ? '処理中...' : isWorking ? 'カメラで退勤' : 'カメラで出勤'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">または</span>
              </div>
            </div>

            <Input
              placeholder="QRコードを手動入力"
              value={scannedToken}
              onChange={(e) => setScannedToken(e.target.value)}
              className="text-center"
            />

            <Button
              onClick={handleSubmit}
              disabled={clockInMutation.isPending || clockOutMutation.isPending || !scannedToken.trim()}
              variant="outline"
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              手動で{isWorking ? '退勤' : '出勤'}
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="pt-4 border-t text-xs text-slate-400">
          QRコードは毎月更新されます
        </div>
      </div>
    </Card>
  );
}