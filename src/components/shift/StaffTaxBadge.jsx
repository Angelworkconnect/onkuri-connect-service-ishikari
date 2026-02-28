import React from 'react';
import { TAX_MODE_LABELS, TAX_MODE_COLORS } from './taxUtils';

export default function StaffTaxBadge({ taxMode }) {
  if (!taxMode || taxMode === 'FULL') return null;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${TAX_MODE_COLORS[taxMode]}`}>
      {TAX_MODE_LABELS[taxMode]}
    </span>
  );
}