import React from 'react';
import { Card } from "@/components/ui/card";

export default function StatsCard({ title, value, icon: Icon, description, trend }) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-white border-slate-200 hover:shadow-lg transition-all duration-300">
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <p className="text-sm text-slate-500">{title}</p>
          {Icon && (
            <Icon className="w-6 h-6 text-slate-400" />
          )}
        </div>
        
        <div className="text-center mb-4">
          <p className="text-5xl font-light text-slate-800 mb-2">{value}</p>
          {description && (
            <p className="text-xs text-slate-400">{description}</p>
          )}
        </div>

        {trend && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
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