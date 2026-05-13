import React from 'react';
import './SteamKeyStatusBadge.css';

const VALID_STATUSES = {
  available: 'Available',
  disabled: 'Disabled',
  sold: 'Sold'
};

const normalizeStatus = (status) => {
  const raw = String(status ?? '').trim();

  if (!raw) {
    console.warn('[SteamKeyStatusBadge] Received empty status value');
    return 'Disabled';
  }

  const lower = raw.toLowerCase();

  if (VALID_STATUSES[lower] !== undefined) {
    return VALID_STATUSES[lower];
  }

  const numeric = Number(raw);
  if (!isNaN(numeric)) {
    if (numeric === 0) return 'Available';
    if (numeric === 1) return 'Disabled';
    if (numeric === 2) return 'Sold';
  }

  console.warn(`[SteamKeyStatusBadge] Unknown status "${raw}" — defaulting to Disabled`);
  return 'Disabled';
};

export const SteamKeyStatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  const className = `steam-key-status-badge ${normalized.toLowerCase()}`;

  return <span className={className}>{normalized}</span>;
};
