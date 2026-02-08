import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, ChevronLeft, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function MessagesPage() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async u => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        u.staffRole = staffList[0].role;
      }
      setUser(u);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const sent = await base44.entities.Message.filter({ sender_email: user.email });
      const received = await base44.entities.Message.filter({ receiver_email: user.email });
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    refetchInterval: 10000, // 10秒ごと
    staleTime: 5000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff'],
    queryFn: () => base44.entities.Staff.list(),
    staleTime: 300000, // 5分
    refetchOnWindowFocus: false,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-for-messages'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: helpRequests = [] } = useQuery({
    queryKey: ['help-requests-for-messages'],
    queryFn: () => base44.entities.HelpRequest.list('-created_date'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const message = await base44.entities.Message.create(data);
      // Create notification for receiver
      await base44.entities.Notification.create({
        user_email: data.receiver_email,
        type: 'message',
        title: `${data.sender_name}からメッセージ`,
        content: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
        related_id: message.id,
        link_url: '/Messages',
      });
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['notifications']);
      setMessageContent('');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation]);

  const getConversations = () => {
    if (!user) return [];
    
    const conversationMap = new Map();
    
    messages.forEach(msg => {
      const otherPersonEmail = msg.sender_email === user.email ? msg.receiver_email : msg.sender_email;
      const otherPersonName = msg.sender_email === user.email ? msg.receiver_name : msg.sender_name;
      
      if (!conversationMap.has(otherPersonEmail)) {
        conversationMap.set(otherPersonEmail, {
          email: otherPersonEmail,
          name: otherPersonName,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      
      const conv = conversationMap.get(otherPersonEmail);
      if (new Date(msg.created_date) > new Date(conv.lastMessage.created_date)) {
        conv.lastMessage = msg;
      }
      
      if (msg.receiver_email === user.email && !msg.is_read) {
        conv.unreadCount++;
      }
    });
    
    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  };

  const getFilteredConversations = () => {
    const conversations = getConversations();
    if (activeTab === 'all') return conversations;
    if (activeTab === 'unread') return conversations.filter(c => c.unreadCount > 0);
    return conversations.filter(c => c.lastMessage.related_type === activeTab);
  };

  const getConversationMessages = () => {
    if (!selectedConversation || !user) return [];
    
    return messages
      .filter(msg => 
        (msg.sender_email === user.email && msg.receiver_email === selectedConversation.email) ||
        (msg.receiver_email === user.email && msg.sender_email === selectedConversation.email)
      )
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  };

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedConversation) return;
    
    const convMessages = getConversationMessages();
    const lastMsg = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;
    
    sendMessageMutation.mutate({
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: selectedConversation.email,
      receiver_name: selectedConversation.name,
      content: messageContent,
      related_type: lastMsg?.related_type || 'general',
      related_id: lastMsg?.related_id,
      related_title: lastMsg?.related_title,
    });
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    
    // Mark unread messages as read
    const unreadMessages = messages.filter(
      msg => msg.sender_email === conv.email && msg.receiver_email === user.email && !msg.is_read
    );
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  };

  const getCategoryIcon = (type) => {
    if (type === 'shift') return <Calendar className="w-4 h-4" />;
    if (type === 'help_request') return <AlertCircle className="w-4 h-4" />;
    return <MessageCircle className="w-4 h-4" />;
  };

  const getCategoryLabel = (type) => {
    if (type === 'shift') return 'シフト';
    if (type === 'help_request') return 'ヘルプコール';
    return '一般';
  };

  const getRelatedInfo = (msg) => {
    if (msg.related_type === 'shift' && msg.related_id) {
      return shifts.find(s => s.id === msg.related_id);
    }
    if (msg.related_type === 'help_request' && msg.related_id) {
      return helpRequests.find(h => h.id === msg.related_id);
    }
    return null;
  };

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
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">メッセージ</h1>
          <p className="text-white/70">スタッフと管理者のコミュニケーション</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="flex h-[calc(100vh-250px)]">
            {/* Conversation List */}
            <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 border-r bg-white`}>
              <div className="p-4 border-b bg-slate-50">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-4 gap-1">
                    <TabsTrigger value="all" className="text-xs">全て</TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs">未読</TabsTrigger>
                    <TabsTrigger value="shift" className="text-xs">シフト</TabsTrigger>
                    <TabsTrigger value="help_request" className="text-xs">ヘルプ</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="overflow-y-auto h-[calc(100%-80px)]">
                {getFilteredConversations().length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>メッセージがありません</p>
                  </div>
                ) : (
                  getFilteredConversations().map(conv => (
                    <div
                      key={conv.email}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition ${
                        selectedConversation?.email === conv.email ? 'bg-blue-50 border-l-4 border-l-[#2D4A6F]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                            {conv.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{conv.name}</p>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              {getCategoryIcon(conv.lastMessage.related_type)}
                              <span>{getCategoryLabel(conv.lastMessage.related_type)}</span>
                            </div>
                          </div>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-red-500">{conv.unreadCount}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 truncate">{conv.lastMessage.content}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(conv.lastMessage.created_date), 'M月d日 HH:mm')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message Thread */}
            <div className={`${selectedConversation ? 'block' : 'hidden md:block'} flex-1 flex flex-col bg-slate-50`}>
              {selectedConversation ? (
                <>
                  <div className="p-4 border-b bg-white flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                      {selectedConversation.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{selectedConversation.name}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        {getCategoryIcon(selectedConversation.lastMessage.related_type)}
                        <span>{getCategoryLabel(selectedConversation.lastMessage.related_type)}</span>
                        {selectedConversation.lastMessage.related_title && (
                          <span>: {selectedConversation.lastMessage.related_title}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(() => {
                      const convMessages = getConversationMessages();
                      const relatedMsg = convMessages.find(m => m.related_type && m.related_type !== 'general');
                      if (relatedMsg) {
                        const relatedInfo = getRelatedInfo(relatedMsg);
                        return (
                          <div className="mb-4">
                            <Card className="p-4 bg-blue-50 border-blue-200">
                              <div className="flex items-start gap-3">
                                {getCategoryIcon(relatedMsg.related_type)}
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-slate-900 mb-1">
                                    {getCategoryLabel(relatedMsg.related_type)}
                                  </p>
                                  {relatedMsg.related_title && (
                                    <p className="text-sm text-slate-700 mb-2">{relatedMsg.related_title}</p>
                                  )}
                                  {relatedInfo && relatedMsg.related_type === 'shift' && (
                                    <div className="text-xs text-slate-600 space-y-1">
                                      <p>📅 {format(new Date(relatedInfo.date), 'M月d日')} {relatedInfo.start_time}〜{relatedInfo.end_time}</p>
                                      <p>📍 {relatedInfo.location}</p>
                                      {relatedInfo.description && <p className="text-slate-700 mt-1">{relatedInfo.description}</p>}
                                    </div>
                                  )}
                                  {relatedInfo && relatedMsg.related_type === 'help_request' && (
                                    <div className="text-xs text-slate-600 space-y-1">
                                      <p>📅 {format(new Date(relatedInfo.date), 'M月d日')} {relatedInfo.time || ''}</p>
                                      <p>📍 {relatedInfo.location}</p>
                                      {relatedInfo.description && <p className="text-slate-700 mt-1">{relatedInfo.description}</p>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {getConversationMessages().map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_email === user.email ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.sender_email === user.email
                              ? 'bg-[#2D4A6F] text-white'
                              : 'bg-white text-slate-900 shadow-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_email === user.email ? 'text-white/70' : 'text-slate-400'
                          }`}>
                            {format(new Date(msg.created_date), 'M月d日 HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder="メッセージを入力..."
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                        className="bg-[#2D4A6F]"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex flex-1 items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>会話を選択してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}