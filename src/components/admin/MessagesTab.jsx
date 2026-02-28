import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { getDisplayTimeText } from "@/components/utils/datetime";

export default function MessagesTab({ user, allStaff, allMessages, selectedStaffForMessage, setSelectedStaffForMessage, messageContent, setMessageContent, onSendMessage, sendPending, onOpenBroadcast }) {
  const getUnreadCount = (staffEmail) =>
    allMessages.filter(m => m.sender_email === staffEmail && m.receiver_email === user?.email && !m.is_read).length;

  const getConversation = (staffEmail) =>
    allMessages.filter(m =>
      (m.sender_email === user?.email && m.receiver_email === staffEmail) ||
      (m.receiver_email === user?.email && m.sender_email === staffEmail)
    ).sort((a, b) => {
      const ta = typeof a.createdAtUtc === 'number' ? a.createdAtUtc : new Date(a.created_date || 0).getTime();
      const tb = typeof b.createdAtUtc === 'number' ? b.createdAtUtc : new Date(b.created_date || 0).getTime();
      return ta - tb;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="border-0 shadow-lg lg:col-span-1">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium">スタッフ一覧</h2>
          <Button onClick={onOpenBroadcast} size="sm" className="bg-[#E8A4B8] hover:bg-[#D393A7]">
            <Send className="w-4 h-4 mr-2" />一斉送信
          </Button>
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {allStaff.map((staff) => {
            const unreadCount = getUnreadCount(staff.email);
            const lastMessage = allMessages.find(m =>
              (m.sender_email === staff.email && m.receiver_email === user?.email) ||
              (m.receiver_email === staff.email && m.sender_email === user?.email)
            );
            return (
              <div key={staff.id} onClick={() => setSelectedStaffForMessage(staff)}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedStaffForMessage?.id === staff.id ? 'bg-[#2D4A6F]/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                      {staff.full_name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{staff.full_name}</p>
                      {lastMessage && <p className="text-xs text-slate-500 truncate max-w-[150px]">{lastMessage.content}</p>}
                    </div>
                  </div>
                  {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount}</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-0 shadow-lg lg:col-span-2">
        {selectedStaffForMessage ? (
          <>
            <div className="p-4 sm:p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                  {selectedStaffForMessage.full_name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-medium">{selectedStaffForMessage.full_name}</h2>
                  <p className="text-sm text-slate-500">{selectedStaffForMessage.email}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {getConversation(selectedStaffForMessage.email).map((msg) => {
                const isSent = msg.sender_email === user?.email;
                return (
                  <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isSent ? 'bg-[#2D4A6F] text-white' : 'bg-slate-100 text-slate-900'} rounded-lg p-3`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isSent ? 'text-white/70' : 'text-slate-500'}`}>{getDisplayTimeText(msg)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="メッセージを入力..." className="flex-1" rows={2}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
                />
                <Button onClick={onSendMessage} disabled={!messageContent.trim() || sendPending} className="bg-[#2D4A6F]">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>スタッフを選択してメッセージを開始してください</p>
          </div>
        )}
      </Card>
    </div>
  );
}