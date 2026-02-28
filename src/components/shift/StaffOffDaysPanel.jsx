import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Calendar } from 'lucide-react';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export default function StaffOffDaysPanel({ staff, onUpdate }) {
  const [customDateInput, setCustomDateInput] = useState('');
  const [localStaff, setLocalStaff] = useState(staff);

  const handleToggleDow = (dow) => {
    const current = localStaff.hard_off_days || [];
    const next = current.includes(dow) ? current.filter(d => d !== dow) : [...current, dow];
    const updated = { ...localStaff, hard_off_days: next };
    setLocalStaff(updated);
    onUpdate(updated);
  };

  const handleAddCustomDate = () => {
    if (!customDateInput) return;
    const current = localStaff.custom_off_dates || [];
    if (!current.includes(customDateInput)) {
      const updated = { ...localStaff, custom_off_dates: [...current, customDateInput] };
      setLocalStaff(updated);
      onUpdate(updated);
      setCustomDateInput('');
    }
  };

  const handleRemoveCustomDate = (date) => {
    const current = localStaff.custom_off_dates || [];
    const updated = { ...localStaff, custom_off_dates: current.filter(d => d !== date) };
    setLocalStaff(updated);
    onUpdate(updated);
  };

  const currentDowOffDays = (localStaff.hard_off_days || []).map(dow => DOW[dow]).join('・') || 'なし';
  const currentCustomCount = (localStaff.custom_off_dates || []).length;

  return (
    <Card className="p-3 border-0 shadow-sm bg-white">
      <div className="space-y-3">
        {/* 固定休曜日 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700">固定休曜日</span>
            <span className="text-[10px] text-slate-500">({currentDowOffDays})</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DOW.map((d, i) => {
              const isOff = (localStaff.hard_off_days || []).includes(i);
              return (
                <button
                  key={i}
                  onClick={() => handleToggleDow(i)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer ${
                    isOff
                      ? i === 0 ? 'bg-red-600 border-red-700 text-white shadow-md' 
                        : i === 6 ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                        : 'bg-slate-600 border-slate-700 text-white shadow-md'
                      : i === 0 ? 'bg-red-100 border-red-400 text-red-700 hover:bg-red-200'
                        : i === 6 ? 'bg-blue-100 border-blue-400 text-blue-700 hover:bg-blue-200'
                        : 'bg-slate-100 border-slate-400 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isOff ? 'クリックで解除' : 'クリックで選択'}
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
          {(localStaff.custom_off_dates || []).length > 0 && (
           <div className="flex flex-wrap gap-1 mt-2">
             {[...(localStaff.custom_off_dates || [])].sort().map((date) => (
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