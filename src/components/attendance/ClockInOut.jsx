import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Coffee, Clock } from "lucide-react";
import { format } from "date-fns";

export default function ClockInOut({ currentAttendance, onClockIn, onClockOut, isLoading, canClockIn = true }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isWorking = currentAttendance && !currentAttendance.clock_out;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white border-0 shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-white/70 mb-1">
              {format(currentTime, 'yyyy年M月d日')}
            </p>
            <p className="text-4xl font-light tracking-wider">
              {format(currentTime, 'HH:mm:ss')}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {isWorking ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10">
              <div className="w-3 h-3 rounded-full bg-[#7CB342] animate-pulse" />
              <div>
                <p className="text-sm text-white/70">勤務中</p>
                <p className="text-lg font-medium">
                  {currentAttendance.clock_in} 〜
                </p>
              </div>
            </div>
            <Button
              onClick={onClockOut}
              disabled={isLoading}
              className="w-full h-14 bg-[#E8A4B8] hover:bg-[#D88FA3] text-white text-lg font-medium disabled:opacity-50"
            >
              <LogOut className="w-5 h-5 mr-2" />
              {isLoading ? '処理中...' : '退勤する'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {currentAttendance && currentAttendance.clock_out && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/10">
                <Coffee className="w-5 h-5 text-white/70" />
                <div>
                  <p className="text-sm text-white/70">本日の勤務完了</p>
                  <p className="text-lg font-medium">
                    {currentAttendance.clock_in} 〜 {currentAttendance.clock_out}
                  </p>
                </div>
              </div>
            )}
            <Button
              onClick={onClockIn}
              disabled={isLoading || (currentAttendance && currentAttendance.clock_out) || !canClockIn}
              className="w-full h-14 bg-[#7CB342] hover:bg-[#6BA232] text-white text-lg font-medium disabled:opacity-50"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {!canClockIn ? '本日のシフト承認が必要です' : '出勤する'}
            </Button>
          </div>
        )}
      </div>
      <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-white/5" />
    </Card>
  );
}