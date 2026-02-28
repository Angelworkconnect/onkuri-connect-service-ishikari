import React from 'react';

export default function HeatmapRow({ days, year, month, entries, requirements }) {
  return (
    <div className="flex gap-0.5">
      {days.map(day => {
        const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayEntries = entries.filter(e => e.date === date);
        const req = requirements.find(r => r.date === date);
        const required = req?.required_total || 3;
        const count = dayEntries.length;
        const ratio = required > 0 ? count / required : 1;

        let bg = 'bg-green-200';
        let text = 'text-green-800';
        if (ratio < 0.5) { bg = 'bg-red-300'; text = 'text-red-900'; }
        else if (ratio < 0.8) { bg = 'bg-yellow-200'; text = 'text-yellow-800'; }

        const dow = new Date(year, month - 1, day).getDay();

        return (
          <div key={day} className="flex-1 min-w-0">
            <div className={`${bg} ${text} rounded text-center text-[10px] font-bold py-0.5 leading-tight`}>
              <div>{count}/{required}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}