import { formatOrderDate, formatOrderSummary } from '../../utils/formatters';

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
        <div className="status-badge">{statusLabel}</div>
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
