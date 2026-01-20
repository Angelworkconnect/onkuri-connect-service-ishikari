import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin, AlertCircle, Calendar, Briefcase, Gift, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const categoryConfig = {
  general: { label: '一般', color: 'bg-slate-100 text-slate-700', icon: Megaphone },
  shift: { label: 'シフト', color: 'bg-[#2D4A6F]/10 text-[#2D4A6F]', icon: Calendar },
  welfare: { label: '福利厚生', color: 'bg-[#7CB342]/10 text-[#7CB342]', icon: Gift },
  event: { label: 'イベント', color: 'bg-[#E8A4B8]/20 text-[#C17A8E]', icon: Briefcase },
  urgent: { label: '緊急', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function AnnouncementCard({ announcement }) {
  const config = categoryConfig[announcement.category] || categoryConfig.general;
  const CategoryIcon = config.icon;

  return (
    <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all duration-300">
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
                {format(new Date(announcement.created_date), 'M月d日', { locale: ja })}
              </span>
            </div>
            <h3 className="font-medium text-slate-800 mb-1 truncate">{announcement.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2">{announcement.content}</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#2D4A6F]/20 via-[#E8A4B8]/20 to-[#7CB342]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
}