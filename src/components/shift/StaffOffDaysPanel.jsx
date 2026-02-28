import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Calendar } from 'lucide-react';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export default function StaffOffDaysPanel({ staff, onUpdate }) {
  const [customDateInput, setCustomDateInput] = useState('');

  const handleToggleDow = (dow) => {
    const current = staff.hard_off_days || [];
    const next = current.includes(dow) ? current.filter(d => d !== dow) : [...current, dow];
    onUpdate({ ...staff, hard_off_days: next });
  };

  const handleAddCustomDate = () => {
    if (!customDateInput) return;
    const current = staff.custom_off_dates || [];
    if (!current.includes(customDateInput)) {
      onUpdate({ ...staff, custom_off_dates: [...current, customDateInput] });
      setCustomDateInput('');
    }
  };

  const handleRemoveCustomDate = (date) => {
    const current = staff.custom_off_dates || [];
    onUpdate({ ...staff, custom_off_dates: current.filter(d => d !== date) });
  };

  const currentDowOffDays = (staff.hard_off_days || []).map(dow => DOW[dow]).join('・') || 'なし';
  const currentCustomCount = (staff.custom_off_dates || []).length;

  return (
    <Card className="p-3 border-0 shadow-sm bg-white">
      <div className="space-y-3">
        {/* 固定休曜日 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700">固定休曜日</span>
            <span className="text-[10px] text-slate-500">({currentDowOffDays})</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {DOW.map((d, i) => {
              const isOff = (staff.hard_off_days || []).includes(i);
              return (
                <button
                  key={i}
                  onClick={() => handleToggleDow(i)}
                  className={`w-7 h-7 rounded text-xs font-bold border transition-colors ${
                    isOff
                      ? i === 0 ? 'bg-red-500 border-red-600 text-white' 
                        : i === 6 ? 'bg-blue-500 border-blue-600 text-white'
                        : 'bg-slate-500 border-slate-600 text-white'
                      : i === 0 ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                        : i === 6 ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* カスタム休み日 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700">カスタム休み日</span>
            <span className="text-[10px] text-slate-500">({currentCustomCount}件)</span>
          </div>
          <div className="flex gap-1">
            <Input
              type="date"
              value={customDateInput}
              onChange={(e) => setCustomDateInput(e.target.value)}
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={handleAddCustomDate}
              disabled={!customDateInput}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          {(staff.custom_off_dates || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {[...(staff.custom_off_dates || [])].sort().map((date) => (
                <Badge key={date} variant="outline" className="flex items-center gap-1 px-2 py-0.5">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px]">{date}</span>
                  <button
                    onClick={() => handleRemoveCustomDate(date)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}