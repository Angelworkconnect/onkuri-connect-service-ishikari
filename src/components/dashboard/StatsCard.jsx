import React from 'react';
import { Card } from "@/components/ui/card";

export default function StatsCard({ title, value, icon: Icon, description, trend }) {
  return (
    <Card className="bg-gradient-to-br from-slate-100/50 to-white border-slate-200/50 hover:shadow-md transition-all duration-300 rounded-2xl">
      <div className="p-6">
        <div className="flex items-start justify-between mb-8">
          <p className="text-sm text-slate-600 font-medium">{title}</p>
          {Icon && (
            <Icon className="w-5 h-5 text-slate-400" />
          )}
        </div>
        
        <div className="mb-2">
          <p className="text-5xl font-extralight text-slate-800">{value}</p>
        </div>
        
        {description && (
          <p className="text-xs text-slate-400">{description}</p>
        )}

        {trend && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className={`text-sm ${trend > 0 ? 'text-[#7CB342]' : 'text-slate-400'}`}>
              {trend > 0 ? '↑' : ''} {trend}%
            </span>
            <span className="text-xs text-slate-400 ml-2">前月比</span>
          </div>
        )}
      </div>
    </Card>
  );
}