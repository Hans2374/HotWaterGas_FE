import { formatOrderDate, formatOrderSummary } from '../../utils/formatters';
import PurchaseHistoryRow from './PurchaseHistoryRow';
import './PurchaseHistoryTable.css';

/**
 * PurchaseHistoryTable - Displays table of customer's orders
 */
export default function PurchaseHistoryTable({ orders, onOrderClick, isLoading, isEmpty, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Đơn hàng</th>
              <th>Ngày</th>
              <th>Trạng thái</th>
              <th>Tổng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, idx) => (
              <tr key={idx} className="skeleton-row">
                <td><div className="skeleton skeleton-text"></div></td>
                <td><div className="skeleton skeleton-text"></div></td>
                <td><div className="skeleton skeleton-text"></div></td>
                <td><div className="skeleton skeleton-text"></div></td>
                <td><div className="skeleton skeleton-button"></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-error-state">
        <div className="error-icon">⚠️</div>
        <div className="error-message">Có lỗi khi tải đơn hàng của bạn</div>
        <button className="error-retry-btn" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }

  if (isEmpty || !orders || orders.length === 0) {
    return (
      <div className="history-empty-state">
        <div className="empty-icon">📦</div>
        <div className="empty-message">Bạn chưa có đơn hàng nào.</div>
        <p className="empty-hint">Bắt đầu mua sắm ngay để thấy lịch sử đơn hàng của bạn tại đây.</p>
      </div>
    );
  }

  return (
    <div className="history-table-container">
      <table className="history-table">
        <thead>
          <tr>
            <th>Đơn hàng</th>
            <th>Ngày</th>
            <th>Trạng thái</th>
            <th>Tổng</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <PurchaseHistoryRow
              key={order.orderId}
              orderNumber={order.orderNumber}
              createdAt={order.createdAt}
              statusLabel={order.statusLabel}
              total={order.total}
              itemCount={order.itemCount}
              onViewClick={() => onOrderClick(order.orderId)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
