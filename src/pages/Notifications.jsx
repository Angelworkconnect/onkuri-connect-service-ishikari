import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Bell, MessageCircle, Calendar, HandHeart, Megaphone, 
  Sparkles, Check, CheckCheck, Filter 
} from 'lucide-react';
import { getDisplayTimeText } from '@/components/utils/datetime';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotificationsPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const notifs = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-createdAtUtc'
      );
      return notifs;
    },
    enabled: !!user,
    refetchInterval: 30000, // 30秒ごとに再取得
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.is_read);
    return notifications.filter(n => n.type === activeTab);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle className="w-5 h-5" />;
      case 'shift': return <Calendar className="w-5 h-5" />;
      case 'help_request': return <HandHeart className="w-5 h-5" />;
      case 'announcement': return <Megaphone className="w-5 h-5" />;
      case 'tip': return <Sparkles className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      message: 'メッセージ',
      shift: 'シフト',
      help_request: 'ヘルプコール',
      announcement: 'お知らせ',
      tip: 'サンクス',
      system: 'システム',
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'text-red-500 bg-red-50';
    if (priority === 'medium') return 'text-amber-500 bg-amber-50';
    return 'text-slate-500 bg-slate-50';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light mb-2">通知</h1>
              <p className="text-white/70">
                {unreadCount > 0 ? `未読 ${unreadCount}件` : '未読なし'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllAsReadMutation.mutate()}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                すべて既読
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 pb-8">
        <Card className="border-0 shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b bg-slate-50 p-4">
              <TabsList className="w-full grid grid-cols-7 gap-1">
                <TabsTrigger value="all" className="text-xs">すべて</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">未読</TabsTrigger>
                <TabsTrigger value="shift" className="text-xs">シフト</TabsTrigger>
                <TabsTrigger value="announcement" className="text-xs">お知らせ</TabsTrigger>
                <TabsTrigger value="help_request" className="text-xs">ヘルプ</TabsTrigger>
                <TabsTrigger value="message" className="text-xs">メッセージ</TabsTrigger>
                <TabsTrigger value="tip" className="text-xs">サンクス</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div className="divide-y">
                {getFilteredNotifications().length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>通知はありません</p>
                  </div>
                ) : (
                  getFilteredNotifications().map(notification => (
                    <Link
                      key={notification.id}
                      to={createPageUrl(notification.link_url || 'Dashboard')}
                      onClick={() => handleNotificationClick(notification)}
                      className={`block p-4 hover:bg-slate-50 transition ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          getPriorityColor(notification.priority)
                        }`}>
                          {getIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-medium ${
                                !notification.is_read ? 'text-slate-900' : 'text-slate-600'
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.is_read && (
                                <Badge className="bg-blue-500">未読</Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {getDisplayTimeText(notification)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {notification.content}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {notification.priority === 'high' && (
                              <Badge className="bg-red-500 text-xs">重要</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}