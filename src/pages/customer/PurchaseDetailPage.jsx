import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader } from '../../components/common/Loader';
import myOrdersApi from '../../api/myOrdersApi';
import PurchaseDetailSummary from '../../components/customer/PurchaseDetailSummary';
import PurchaseLicenseTable from '../../components/customer/PurchaseLicenseTable';
import { formatOrderDate } from '../../utils/formatters';
import './PurchaseDetailPage.css';

/** Order status integer → badge CSS class */
const getDetailStatusClass = (status) => {
  switch (status) {
    case 4: return 'order-status-badge--success';
    case 0:
    case 1: return 'order-status-badge--error';
    case 2: return 'order-status-badge--warning';
    default: return 'order-status-badge--neutral';
  }
};

/** True when order status means no delivery occurred */
const isFulfilledOrder = (status) => status === 4;

/**
 * PurchaseDetailPage - Customer's order detail and key fulfillment
 *
 * Route: /account/orders/:orderId
 * Access: Authenticated customers only
 */
export default function PurchaseDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        const data = await myOrdersApi.getMyOrderDetail(orderId);
        if (!data) {
          setNotFound(true);
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to fetch order detail:', err);
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('Không thể tải chi tiết đơn hàng');
        }
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    const fetchOrderDetail = async () => {
      try {
        const data = await myOrdersApi.getMyOrderDetail(orderId);
        if (!data) {
          setNotFound(true);
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to fetch order detail:', err);
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('Không thể tải chi tiết đơn hàng');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetail();
  };

  if (loading) {
    return (
      <div className="order-detail-loading">
        <Loader text="Đang tải đơn hàng..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="orders-state-card orders-state-card--muted">
        <div className="orders-state-icon" aria-hidden>🔍</div>
        <h2 className="orders-state-title">Không tìm thấy đơn hàng</h2>
        <p className="orders-state-hint">
          Đơn hàng này không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <button type="button" className="orders-btn-secondary" onClick={() => navigate('/account/orders')}>
          Quay lại lịch sử
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-state-card orders-state-card--error">
        <div className="orders-state-icon orders-state-icon--error" aria-hidden>⚠️</div>
        <p className="orders-state-message">{error}</p>
        <div className="orders-state-actions">
          <button type="button" className="orders-btn-primary" onClick={handleRetry}>
            Thử lại
          </button>
          <button type="button" className="orders-btn-secondary" onClick={() => navigate('/account/orders')}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const fulfilled = isFulfilledOrder(order.status);
  const statusBadgeClass = getDetailStatusClass(order.status);

  return (
    <div className="order-detail-page">
      <button
          type="button"
          className="order-detail-back"
          onClick={() => navigate('/account/orders')}
        >
          ← Quay lại lịch sử
        </button>

        <header className="orders-page-header order-detail-header">
          <h2>Chi tiết đơn hàng</h2>
          <p className="order-detail-meta">
            <span>Đơn hàng #{order.orderNumber}</span>
            <span className="order-detail-meta-sep" aria-hidden>
              ·
            </span>
            <span>Đặt lúc {formatOrderDate(order.createdAt)}</span>
            <span className="order-detail-meta-sep" aria-hidden>
              ·
            </span>
            <span>
              Trạng thái:{' '}
              <span className={`order-status-badge ${statusBadgeClass}`}>
                {order.statusLabel}
              </span>
            </span>
          </p>
        </header>

        <PurchaseDetailSummary
          items={order.items}
          subtotal={order.subtotal}
          discountAmount={order.discountAmount}
          finalTotal={order.finalTotal}
          paymentMethodLabel={order.paymentMethodLabel}
        />

        {fulfilled && (
          <section className="order-license-card" aria-labelledby="order-license-heading">
            <h3 id="order-license-heading">Key bản quyền và giao hàng</h3>
            <PurchaseLicenseTable licenses={order.licenses} />
          </section>
        )}
      </div>
  );
}
