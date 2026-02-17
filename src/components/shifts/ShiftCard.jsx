import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, CircleDollarSign, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const serviceTypeConfig = {
  day_service: { label: '通所介護', color: 'bg-[#2D4A6F] text-white' },
  home_care: { label: '訪問介護', color: 'bg-[#4A6B8A] text-white' },
  taxi: { label: '介護タクシー', color: 'bg-[#7CB342] text-white' },
  funeral: { label: '葬祭', color: 'bg-[#6B5B73] text-white' },
  estate_clearing: { label: '遺品整理', color: 'bg-[#8B7355] text-white' },
  other: { label: 'その他', color: 'bg-slate-500 text-white' },
};

const statusConfig = {
  open: { label: '募集中', color: 'bg-[#7CB342]/10 text-[#7CB342] border-[#7CB342]/20' },
  filled: { label: '募集終了', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  cancelled: { label: '募集停止', color: 'bg-red-50 text-red-500 border-red-200' },
  completed: { label: '完了', color: 'bg-[#2D4A6F]/10 text-[#2D4A6F] border-[#2D4A6F]/20' },
};

export default function ShiftCard({ shift, onApply, showApplyButton = true }) {
  const serviceConfig = serviceTypeConfig[shift.service_type] || serviceTypeConfig.other;
  const status = statusConfig[shift.status] || statusConfig.open;

  return (
    <Card className="group relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={`${serviceConfig.color} font-normal`}>
              {serviceConfig.label}
            </Badge>
            <Badge variant="outline" className={`${status.color} font-normal border`}>
              {status.label}
            </Badge>
          </div>
          <span className="text-sm font-medium text-[#2D4A6F]">
            {shift.date ? format(new Date(shift.date), 'M月d日') : '日付未設定'}
          </span>
        </div>

        <h3 className="text-lg font-medium text-slate-800 mb-3 group-hover:text-[#2D4A6F] transition-colors">
          {shift.title}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4 text-[#E8A4B8]" />
            <span>{shift.start_time} 〜 {shift.end_time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="w-4 h-4 text-[#E8A4B8]" />
            <span>{shift.location}</span>
          </div>
          {shift.hourly_rate && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CircleDollarSign className="w-4 h-4 text-[#E8A4B8]" />
              <span className="font-medium text-slate-700">¥{shift.hourly_rate.toLocaleString()}/時間</span>
            </div>
          )}
          {shift.max_applicants > 1 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="w-4 h-4 text-[#E8A4B8]" />
              <span>募集人数: {shift.max_applicants}名</span>
            </div>
          )}
        </div>

        {shift.description && (
          <p className="text-sm text-slate-400 mb-4 line-clamp-2">{shift.description}</p>
        )}

        {shift.required_skills && shift.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {shift.required_skills.map((skill, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        )}

        {showApplyButton && shift.status === 'open' && (
          <Button
            onClick={() => onApply?.(shift)}
            className="w-full bg-[#2D4A6F] hover:bg-[#1E3A5F] text-white group/btn"
          >
            <span>応募する</span>
            <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
          </Button>
        )}
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#E8A4B8]/5 to-transparent rounded-full -translate-y-12 translate-x-12" />
    </Card>
  );
}