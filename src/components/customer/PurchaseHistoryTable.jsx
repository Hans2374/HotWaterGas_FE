import { useNavigate } from 'react-router-dom';
import PurchaseHistoryRow from './PurchaseHistoryRow';
import './PurchaseHistoryTable.css';

/**
 * PurchaseHistoryTable - Displays table of customer's orders
 */
export default function PurchaseHistoryTable({ orders, onOrderClick, isLoading, isEmpty, error, onRetry }) {
  const navigate = useNavigate();
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
        <div className="history-empty-glow" aria-hidden="true" />
        <div className="history-empty-card">
          <div className="history-empty-illustration" aria-hidden="true">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="history-empty-icon">
              <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
              <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
              <path
                d="M44 82H76L70 66H50L44 82Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M40 58C40 53.5817 43.5817 50 48 50H72C76.4183 50 80 53.5817 80 58V62H40V58Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M40 62H80"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M46 50V44C46 41.7909 47.7909 40 50 40H70C72.2091 40 74 41.7909 74 44V50"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M52 72H68"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeOpacity="0.5"
              />
              <circle cx="60" cy="36" r="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M48 36H72"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.12"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="history-empty-content">
            <h3 className="history-empty-title">Chưa có đơn hàng nào</h3>
            <p className="history-empty-description">
              Hãy bắt đầu khám phá thế giới game và tìm cho mình những tựa game yêu thích.
            </p>
          </div>

          <div className="history-empty-actions">
            <button
              type="button"
              className="history-empty-cta-primary"
              onClick={() => navigate('/products/search')}
            >
              Khám phá sản phẩm
            </button>
          </div>
        </div>
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
