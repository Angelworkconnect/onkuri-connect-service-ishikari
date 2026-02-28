import React from 'react';
import StaffTaxBadge from './StaffTaxBadge';
import { getPieceColor, TAX_MODE_LABELS } from './taxUtils';

export default function StaffPiece({ staff, safetyScore, canPlace, warnings, draggable, onDragStart, compact = false }) {
  const colorClass = getPieceColor(staff, safetyScore ?? 100, canPlace ?? true);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-xs font-medium cursor-grab ${colorClass} ${draggable ? 'active:cursor-grabbing' : ''}`}
        draggable={draggable}
        onDragStart={onDragStart}
        title={warnings?.join(' / ')}
      >
        <span>{staff.full_name}</span>
        <StaffTaxBadge taxMode={staff.tax_mode} />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-0.5 px-2 py-1.5 rounded-xl border-2 text-xs cursor-grab select-none ${colorClass} ${draggable ? 'active:cursor-grabbing hover:shadow-md transition-shadow' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      title={warnings?.join(' / ')}
    >
      <div className="flex items-center gap-1 font-bold">
        <span>{staff.full_name}</span>
        <StaffTaxBadge taxMode={staff.tax_mode} />
      </div>
      {warnings && warnings.length > 0 && (
        <div className="text-[9px] opacity-70 leading-tight">{warnings[0]}</div>
      )}
    </div>
  );
}