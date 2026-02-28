import React from 'react';
import StaffTaxBadge from './StaffTaxBadge';
import { getPieceColor, TAX_MODE_LABELS } from './taxUtils';

// 介護系の加算が取れる資格のみレインボー対象（運転免許系は除外）
const CARE_QUALIFICATIONS = [
  '介護福祉士', '社会福祉士', '精神保健福祉士', '看護師', '准看護師',
  '理学療法士', 'PT', '作業療法士', 'OT', '言語聴覚士', 'ST',
  'ケアマネージャー', '介護支援専門員',
  'ホームヘルパー1級', 'ホームヘルパー2級', 'ホームヘルパー3級',
  '初任者研修', '実務者研修', '生活援助従事者研修',
  '喀痰吸引等研修', '認知症介護基礎研修', '認知症介護実践者研修',
  '福祉用具専門相談員', '相談支援専門員',
  '保育士', '社会福祉主事',
];

// 介護系の加算取れる資格があるかチェック
function hasCareQualification(staff) {
  if (!staff.qualifications || staff.qualifications.length === 0) return false;
  return staff.qualifications.some(q => q && CARE_QUALIFICATIONS.some(cq => q.includes(cq)));
}

// 有資格者かどうか（無資格・空配列以外、運転免許含む全資格）
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