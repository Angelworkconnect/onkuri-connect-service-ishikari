import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, MessageCircle, Calendar, AlertCircle, Megaphone, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { formatMessageTime } from "@/utils/datetime";
import { Link } from "react-router-dom";
import { createPageUrl } from '@/utils';

export default function NotificationBell({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => base44.entities.Notification.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    refetchInterval: 30000, // 30秒ごと
    staleTime: 20000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'shift': return <Calendar className="w-4 h-4 text-green-500" />;
      case 'help_request': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'announcement': return <Megaphone className="w-4 h-4 text-purple-500" />;
      case 'tip': return <Sparkles className="w-4 h-4 text-pink-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-2 border-b">
          <span className="font-semibold text-sm">通知</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs h-7"
            >
              すべて既読
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">通知はありません</p>
          </div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`cursor-pointer p-3 ${!notification.is_read ? 'bg-blue-50' : ''}`}
              onClick={() => handleNotificationClick(notification)}
              asChild
            >
              <Link to={notification.link_url || createPageUrl('Dashboard')}>
                <div className="flex gap-3 w-full">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{notification.title}</p>
                    <p className="text-xs text-slate-600 truncate">{notification.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(notification.created_date), 'M/d HH:mm')}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  )}
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        {notifications.length > 10 && (
          <div className="p-2 border-t text-center">
            <Link to={createPageUrl('Notifications')}>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                すべての通知を見る
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}