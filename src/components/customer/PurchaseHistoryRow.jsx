import { formatOrderDate, formatOrderSummary } from '../../utils/formatters';

/**
 * Maps raw order status integer to semantic CSS class for badge styling.
 * Status values (from backend OrderService.GetStatusLabel):
 *   0 = Cancelled  -> status-error (red)
 *   1 = Failed     -> status-error (red)
 *   2 = Pending    -> status-warning (amber)
 *   4 = Completed  -> status-success (green)
 *   _ = Unknown    -> status-neutral (gray)
 */
const getStatusClass = (status) => {
  switch (status) {
    case 4: return 'status-success'; // Hoàn tất / Completed
    case 0:
    case 1: return 'status-error';   // Đã hủy / Thất bại / Cancelled / Failed
    case 2: return 'status-warning'; // Đang chờ / Pending
    default: return 'status-neutral';
  }
};

/**
 * PurchaseHistoryRow - Single row in purchase history table
 */
export default function PurchaseHistoryRow({
  orderNumber,
  createdAt,
  status,
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
        <div className={`status-badge ${getStatusClass(status)}`}>{statusLabel}</div>
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
