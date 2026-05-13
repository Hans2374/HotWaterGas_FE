import React, { useState } from 'react';
import { Pencil, Power, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { SteamKeyStatusBadge } from './SteamKeyStatusBadge';
import './AdminSteamKeyTable.css';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const getActionsForItem = (item) => {
  const status = Number(item.status);
  if (status === 0) return { edit: true, disable: true, delete: true };
  if (status === 1) return { edit: true, enable: true, delete: true };
  if (status === 2) return {};
  return {};
};

const maskSteamKey = (key) => {
  if (!key) return '—';
  if (key.length <= 8) return key;
  return key.slice(0, 5) + '************';
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Steam key copied.');
  }).catch(() => {
    toast.error('Failed to copy key.');
  });
};

const KeyCell = ({ item, isRevealed, onToggle, onCopy }) => {
  const keyValue = item.key || '—';
  const displayKey = isRevealed ? keyValue : maskSteamKey(keyValue);

  return (
    <div className="key-cell">
      <code className={`key-value ${isRevealed ? '' : 'masked'}`}>{displayKey}</code>
      <button
        type="button"
        className="key-action-btn"
        onClick={() => onCopy(keyValue)}
        title="Copy key"
      >
        <Copy size={14} />
      </button>
      <button
        type="button"
        className="key-action-btn"
        onClick={onToggle}
        title={isRevealed ? 'Hide key' : 'Reveal key'}
      >
        {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

export const AdminSteamKeyTable = ({
  items,
  isLoading,
  error,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDisable,
  onEnable,
  onDelete
}) => {
  const [revealedKeys, setRevealedKeys] = useState(new Set());

  const toggleReveal = (keyId) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  if (isLoading) {
    return <div className="key-table-empty">Loading Steam keys...</div>;
  }

  if (error) {
    return <div className="key-table-empty error">{error}</div>;
  }

  if (!items.length) {
    return (
      <div className="key-table-empty">
        <p className="empty-title">No keys found</p>
        <p className="empty-hint">Add Steam keys to manage inventory</p>
      </div>
    );
  }

  const from = totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="key-table-shell">
      <div className="key-table-wrap">
        <table className="key-table">
          <thead>
            <tr>
              <th className="col-key">Key</th>
              <th className="col-status">Status</th>
              <th className="col-date">Imported</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const actions = getActionsForItem(item);
              const hasActions = actions.edit || actions.disable || actions.enable || actions.delete;
              const isRevealed = revealedKeys.has(item.id);

              return (
                <tr key={item.id}>
                  <td>
                    <KeyCell
                      item={item}
                      isRevealed={isRevealed}
                      onToggle={() => toggleReveal(item.id)}
                      onCopy={copyToClipboard}
                    />
                  </td>
                  <td><SteamKeyStatusBadge status={item.status} /></td>
                  <td className="col-date">{formatDate(item.createdAt)}</td>
                  <td>
                    {hasActions ? (
                      <div className="key-row-actions">
                        {actions.edit && (
                          <button type="button" className="key-icon-btn" onClick={() => onEdit?.(item)} title="Edit">
                            <Pencil size={14} />
                          </button>
                        )}
                        {actions.disable && (
                          <button type="button" className="key-icon-btn warn" onClick={() => onDisable?.(item)} title="Disable">
                            <Power size={14} />
                          </button>
                        )}
                        {actions.enable && (
                          <button type="button" className="key-icon-btn" onClick={() => onEnable?.(item)} title="Enable">
                            <Power size={14} />
                          </button>
                        )}
                        {actions.delete && (
                          <button type="button" className="key-icon-btn danger" onClick={() => onDelete?.(item)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="key-no-actions">Sold</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="key-pagination">
        <div className="key-pagination-info">
          Showing {from}-{to} of {totalItems}
        </div>
        <div className="key-pagination-controls">
          <select
            className="key-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
            <option value={50}>50 rows</option>
          </select>
          <button
            type="button"
            className="key-page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="key-page-indicator">{page} / {totalPages}</span>
          <button
            type="button"
            className="key-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
