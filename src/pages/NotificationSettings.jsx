import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, MessageCircle, Calendar, HandHeart, Megaphone, 
  Sparkles, Settings as SettingsIcon, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NotificationSettingsPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const prefs = await base44.entities.NotificationPreference.filter({
        user_email: user.email
      });
      
      if (prefs.length === 0) {
        // デフォルト設定を作成
        return await base44.entities.NotificationPreference.create({
          user_email: user.email,
          push_all: true,
          push_shift: true,
          push_announcement: true,
          push_help_request: true,
          push_message: true,
          push_tip: true,
          push_shift_remind: true,
          in_app_all: true,
          remind_before_minutes: 60,
        });
      }
      
      return prefs[0];
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (updates) => 
      base44.entities.NotificationPreference.update(preferences.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-preferences']);
      toast.success('設定を保存しました');
    },
  });

  const sendTestNotificationMutation = useMutation({
    mutationFn: async () => {
      const nowUtc = Date.now();
      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'system',
        title: 'テスト通知',
        content: 'これはテスト通知です。通知設定が正しく動作しています。',
        priority: 'low',
        is_read: false,
        createdAtUtc: nowUtc,
        displayTimeText: new Date(nowUtc + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' '),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('テスト通知を送信しました');
    },
  });

  const handleToggle = (field, value) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };

  const handleRemindTimeChange = (minutes) => {
    updatePreferencesMutation.mutate({ remind_before_minutes: minutes });
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">通知設定</h1>
          <p className="text-white/70">お知らせの受け取り方法をカスタマイズ</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 pb-8">
        <div className="space-y-6">
          {/* プッシュ通知設定 */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                プッシュ通知設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 全体ON/OFF */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-base font-medium">プッシュ通知を受け取る</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    すべてのプッシュ通知を一括でON/OFF
                  </p>
                </div>
                <Switch
                  checked={preferences?.push_all ?? true}
                  onCheckedChange={(checked) => handleToggle('push_all', checked)}
                />
              </div>

              {/* カテゴリ別設定 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <Label>シフト通知</Label>
                      <p className="text-xs text-slate-500">シフト更新・確定</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences?.push_shift ?? true}
                    onCheckedChange={(checked) => handleToggle('push_shift', checked)}
                    disabled={!preferences?.push_all}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-5 h-5 text-slate-400" />
                    <div>
                      <Label>お知らせ通知</Label>
                      <p className="text-xs text-slate-500">新しいお知らせ</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences?.push_announcement ?? true}
                    onCheckedChange={(checked) => handleToggle('push_announcement', checked)}
                    disabled={!preferences?.push_all}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <HandHeart className="w-5 h-5 text-slate-400" />
                    <div>
                      <Label>ヘルプコール通知</Label>
                      <p className="text-xs text-slate-500">募集・結果</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences?.push_help_request ?? true}
                    onCheckedChange={(checked) => handleToggle('push_help_request', checked)}
                    disabled={!preferences?.push_all}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-slate-400" />
                    <div>
                      <Label>メッセージ通知</Label>
                      <p className="text-xs text-slate-500">新着メッセージ</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences?.push_message ?? true}
                    onCheckedChange={(checked) => handleToggle('push_message', checked)}
                    disabled={!preferences?.push_all}
                  />
                </div>

                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-slate-400" />
                    <div>
                      <Label>サンクス通知</Label>
                      <p className="text-xs text-slate-500">ポイント付与</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences?.push_tip ?? true}
                    onCheckedChange={(checked) => handleToggle('push_tip', checked)}
                    disabled={!preferences?.push_all}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* シフトリマインド設定 */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                シフトリマインド
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-base font-medium">シフト前にリマインド</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    シフト開始前に通知を受け取る
                  </p>
                </div>
                <Switch
                  checked={preferences?.push_shift_remind ?? true}
                  onCheckedChange={(checked) => handleToggle('push_shift_remind', checked)}
                />
              </div>

              {preferences?.push_shift_remind && (
                <div className="space-y-2">
                  <Label>リマインド時間</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[30, 60, 120].map(minutes => (
                      <Button
                        key={minutes}
                        variant={preferences?.remind_before_minutes === minutes ? 'default' : 'outline'}
                        onClick={() => handleRemindTimeChange(minutes)}
                        className="w-full"
                      >
                        {minutes}分前
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* アプリ内通知設定 */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                アプリ内通知
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-base font-medium">アプリ内通知を表示</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    アプリ内の通知ベルに表示
                  </p>
                </div>
                <Switch
                  checked={preferences?.in_app_all ?? true}
                  onCheckedChange={(checked) => handleToggle('in_app_all', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* テスト通知 */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>テスト通知</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => sendTestNotificationMutation.mutate()}
                disabled={sendTestNotificationMutation.isPending}
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                テスト通知を送信
              </Button>
              <p className="text-sm text-slate-500 mt-2 text-center">
                設定が正しく動作するか確認できます
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}