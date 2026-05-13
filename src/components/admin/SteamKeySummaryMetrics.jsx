import React from 'react';
import './SteamKeySummaryMetrics.css';

const METRIC_CONFIG = [
  { key: 'available', label: 'Available' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'sold', label: 'Sold' },
  { key: 'total', label: 'Total' }
];

export const SteamKeySummaryMetrics = ({ summary, isLoading = false }) => {
  const safeSummary = {
    available: Number(summary?.available ?? summary?.Available ?? 0) || 0,
    disabled: Number(summary?.disabled ?? summary?.Disabled ?? 0) || 0,
    sold: Number(summary?.sold ?? summary?.Sold ?? 0) || 0,
    total: Number(summary?.total ?? summary?.Total ?? 0) || 0
  };

  return (
    <div className="steam-key-summary-metrics" aria-live="polite">
      {METRIC_CONFIG.map((metric) => (
        <article key={metric.key} className="steam-key-summary-item">
          <p className="steam-key-summary-label">{metric.label}</p>
          <p className="steam-key-summary-value">
            {isLoading ? '...' : safeSummary[metric.key]}
          </p>
        </article>
      ))}
    </div>
  );
};
