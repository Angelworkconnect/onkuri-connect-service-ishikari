import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pin, AlertCircle, Calendar, Briefcase, Gift, Megaphone, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const categoryConfig = {
  general: { label: '一般', color: 'bg-slate-100 text-slate-700', icon: Megaphone },
  shift: { label: 'シフト', color: 'bg-[#2D4A6F]/10 text-[#2D4A6F]', icon: Calendar },
  welfare: { label: '福利厚生', color: 'bg-[#7CB342]/10 text-[#7CB342]', icon: Gift },
  event: { label: 'イベント', color: 'bg-[#E8A4B8]/20 text-[#C17A8E]', icon: Briefcase },
  urgent: { label: '緊急', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  trial: { label: '体験', color: 'bg-emerald-100 text-emerald-700', icon: ClipboardList },
};

export default function AnnouncementCard({ announcement }) {
  const [open, setOpen] = useState(false);
  const config = categoryConfig[announcement.category] || categoryConfig.general;
  const CategoryIcon = config.icon;

  return (
    <>
      <Card 
        className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
        onClick={() => setOpen(true)}
      >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl ${config.color}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {announcement.is_pinned && (
                <Pin className="w-3.5 h-3.5 text-[#E8A4B8]" />
              )}
              <Badge variant="secondary" className={`text-xs font-normal ${config.color}`}>
                {config.label}
              </Badge>
              <span className="text-xs text-slate-400">
                {format(new Date(announcement.created_date), 'M月d日')}
              </span>
            </div>
            <h3 className="font-medium text-slate-800 mb-1 truncate">{announcement.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2">{announcement.content}</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2D4A6F]/20 via-[#E8A4B8]/20 to-[#7CB342]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2.5 rounded-xl ${config.color}`}>
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              {announcement.is_pinned && (
                <Pin className="w-4 h-4 text-[#E8A4B8]" />
              )}
              <Badge variant="secondary" className={`${config.color}`}>
                {config.label}
              </Badge>
              <span className="text-sm text-slate-400">
                {format(new Date(announcement.created_date), 'yyyy年M月d日 HH:mm')}
              </span>
            </div>
          </div>
          <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {announcement.category === 'trial' && announcement.trial_client_name && (
            <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">体験利用者名</p>
                <p className="font-medium text-slate-800">{announcement.trial_client_name}</p>
              </div>
              {announcement.trial_date && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">体験日</p>
                  <p className="font-medium text-slate-800">{announcement.trial_date}</p>
                </div>
              )}
              {announcement.trial_care_level && (
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">要介護度</p>
                  <p className="font-medium text-slate-800">{announcement.trial_care_level}</p>
                </div>
              )}
            </div>
          )}
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
          {announcement.trial_notes && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium mb-1">特記事項・詳細</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{announcement.trial_notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}