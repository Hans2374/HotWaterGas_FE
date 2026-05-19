import { formatOrderDate, formatOrderSummary } from '../../utils/formatters';

/**
 * Maps status labels to semantic CSS classes for badge styling.
 * Green = success/positive. Red = error/negative. Amber = warning/pending. Gray = neutral.
 */
const getStatusClass = (statusLabel) => {
  if (!statusLabel) return 'status-neutral';
  const lower = statusLabel.toLowerCase();

  if (
    lower === 'delivered' ||
    lower === 'completed' ||
    lower === 'success' ||
    lower === 'đã giao' ||
    lower === 'hoàn thành' ||
    lower === 'thành công'
  ) {
    return 'status-success';
  }
  if (
    lower === 'failed' ||
    lower === 'cancelled' ||
    lower === 'refunded' ||
    lower === 'failed' ||
    lower === 'thất bại' ||
    lower === 'đã hủy' ||
    lower === 'đã hoàn tiền'
  ) {
    return 'status-error';
  }
  if (
    lower === 'pending' ||
    lower === 'processing' ||
    lower === 'shipped' ||
    lower === 'đang xử lý' ||
    lower === 'đang giao'
  ) {
    return 'status-warning';
  }

  return 'status-neutral';
};

/**
 * PurchaseHistoryRow - Single row in purchase history table
 */
export default function PurchaseHistoryRow({
  orderNumber,
  createdAt,
  statusLabel,
  total,
  itemCount,
  onViewClick
}) {
  return (
    <tr className="history-row">
      <td className="order-col">
        <div className="order-number">#{orderNumber}</div>
      </td>
      <td className="date-col">
        <div className="order-date">{formatOrderDate(createdAt)}</div>
      </td>
      <td className="status-col">
        <div className={`status-badge ${getStatusClass(statusLabel)}`}>{statusLabel}</div>
      </td>
      <td className="total-col">
        <div className="order-total">{formatOrderSummary(total, itemCount)}</div>
      </td>
      <td className="action-col">
        <button className="view-btn" onClick={onViewClick}>
          Xem
        </button>
      </td>
    </tr>
  );
}
