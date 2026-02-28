import React from 'react';
import StaffTaxBadge from './StaffTaxBadge';
import { getPieceColor, TAX_MODE_LABELS } from './taxUtils';

// 有資格者かどうか（無資格・空配列以外）
function hasQualification(staff) {
  if (!staff.qualifications || staff.qualifications.length === 0) return false;
  const filtered = staff.qualifications.filter(q => q && q !== '無資格');
  return filtered.length > 0;
}

// 性別ベースの基本色（有資格の場合は虹色グラデーション優先）
function getGenderColor(staff, safetyScore, canPlace) {
  if (!canPlace) return { cls: 'bg-red-100 border-red-400 text-red-700', style: {} };
  if (safetyScore < 30) return { cls: 'bg-red-100 border-red-400 text-red-700', style: {} };

  if (hasQualification(staff)) {
    // 虹色グラデーション（border＋background）
    return {
      cls: 'border-2 text-slate-800 font-semibold',
      style: {
        background: 'linear-gradient(135deg, #ffd6e0 0%, #ffeaa7 25%, #d4f5a0 50%, #a0e4f5 75%, #d4a0f5 100%)',
        borderImage: 'linear-gradient(135deg, #ff6b9d, #ffc107, #51cf66, #339af0, #cc5de8) 1',
        borderStyle: 'solid',
        borderWidth: '2px',
      },
    };
  }

  if (safetyScore < 60) return { cls: 'bg-yellow-100 border-yellow-400 text-yellow-700', style: {} };

  if (staff.gender === 'male') {
    return { cls: 'bg-sky-100 border-sky-400 text-sky-800', style: {} };
  } else if (staff.gender === 'female') {
    return { cls: 'bg-pink-100 border-pink-400 text-pink-800', style: {} };
  }
  return { cls: 'bg-blue-100 border-blue-400 text-blue-700', style: {} };
}

export default function StaffPiece({ staff, safetyScore, canPlace, warnings, draggable, onDragStart, compact = false }) {
  const { cls, style } = getGenderColor(staff, safetyScore ?? 100, canPlace ?? true);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-xs font-medium cursor-grab ${cls} ${draggable ? 'active:cursor-grabbing' : ''}`}
        style={style}
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
      className={`flex flex-col gap-0.5 px-2 py-1.5 rounded-xl border-2 text-xs cursor-grab select-none ${cls} ${draggable ? 'active:cursor-grabbing hover:shadow-md transition-shadow' : ''}`}
      style={style}
      draggable={draggable}
      onDragStart={onDragStart}
      title={warnings?.join(' / ')}
    >
      <div className="flex items-center gap-1 font-bold">
        <span>{staff.full_name}</span>
        {hasQualification(staff) && <span className="text-[8px]">🌈</span>}
        <StaffTaxBadge taxMode={staff.tax_mode} />
      </div>
      {warnings && warnings.length > 0 && (
        <div className="text-[9px] opacity-70 leading-tight">{warnings[0]}</div>
      )}
    </div>
  );
}