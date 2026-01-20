import React from 'react';
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

export default function ServiceCard({ title, description, icon: Icon, color, onClick }) {
  return (
    <Card 
      onClick={onClick}
      className="group relative overflow-hidden bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      <div className="p-6">
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2 group-hover:text-[#2D4A6F] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">{description}</p>
        <div className="flex items-center text-sm text-[#2D4A6F] font-medium">
          <span>詳しく見る</span>
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform" />
    </Card>
  );
}