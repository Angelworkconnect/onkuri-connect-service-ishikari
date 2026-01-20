import React from 'react';
import { Card } from "@/components/ui/card";

export default function StatsCard({ title, value, icon: Icon, description, trend }) {
  return (
    <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 tracking-wide">{title}</p>
            <p className="text-3xl font-light text-slate-800">{value}</p>
            {description && (
              <p className="text-xs text-slate-400">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#2D4A6F]/10 to-[#2D4A6F]/5">
              <Icon className="w-5 h-5 text-[#2D4A6F]" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className={`text-sm ${trend > 0 ? 'text-[#7CB342]' : 'text-slate-400'}`}>
              {trend > 0 ? '↑' : ''} {trend}%
            </span>
            <span className="text-xs text-slate-400 ml-2">前月比</span>
          </div>
        )}
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#E8A4B8]/10 to-transparent rounded-full -translate-y-16 translate-x-16" />
    </Card>
  );
}