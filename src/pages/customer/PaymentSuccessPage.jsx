import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import { useCart } from '../../hooks/useCart';
import './PaymentReturnPage.css';

const LAST_ORDER_ID_KEY = 'hotwatergas.checkout.lastOrderId';

const PAYMENT_STATUS_VI = {
  PAID: 'Đã thanh toán',
  PENDING: 'Đang chờ',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thất bại',
  PROCESSING: 'Đang xử lý',
};

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const orderCode = searchParams.get('orderCode') || '';
  const status = PAYMENT_STATUS_VI[searchParams.get('status')] ?? (searchParams.get('status') || 'PAID');

  const handleViewPurchaseHistory = () => {
    // Try to get the last order ID from session storage
    const orderId = sessionStorage.getItem(LAST_ORDER_ID_KEY);
    sessionStorage.removeItem(LAST_ORDER_ID_KEY);

    if (orderId) {
      refreshCart().catch(() => {});
      navigate(`/account/orders/${orderId}`, { replace: true });
    } else {
      refreshCart().catch(() => {});
      navigate('/account/orders', { replace: true });
    }
  };

  const handleContinueShopping = () => {
    refreshCart().catch(() => {});
    navigate('/', { replace: true });
  };

  return (
    <div className="payment-success-page">
      <div className="payment-success-container">
        <div className="payment-success-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" stroke="#22c55e" strokeWidth="4" fill="none"/>
            <path d="M24 42L34 52L56 30" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>

        <h1 className="payment-success-title">Thanh toán thành công!</h1>

        <p className="payment-success-subtitle">
          Đơn hàng của bạn đã được xác nhận thành công.
        </p>

        <div className="payment-success-details">
          <div className="payment-success-detail-row">
            <span className="payment-success-detail-label">Mã đơn hàng:</span>
            <span className="payment-success-detail-value">{orderCode || 'N/A'}</span>
          </div>
          <div className="payment-success-detail-row">
            <span className="payment-success-detail-label">Trạng thái thanh toán:</span>
            <span className="payment-success-detail-value status-badge">{status}</span>
          </div>
        </div>

        <div className="payment-success-info">
          <div className="payment-success-info-item">
            <span className="payment-success-check">&#10003;</span>
            <span>Thanh toán đã được xác nhận</span>
          </div>
          <div className="payment-success-info-item">
            <span className="payment-success-check">&#10003;</span>
            <span>Đơn hàng đã được tạo thành công</span>
          </div>
          <div className="payment-success-info-item">
            <span className="payment-success-check">&#10003;</span>
            <span>Đang xử lý đơn hàng và lấy Steam key</span>
          </div>
        </div>

        <p className="payment-success-note">
          Vui lòng chờ một khoảng thời gian ngắn để chúng tôi xử lý đơn hàng và cập nhật trạng thái.
          Nếu đơn hàng chưa hiển thị, hãy tải lại trang sau.
        </p>

        <div className="payment-success-actions">
          <button
            type="button"
            className="payment-success-btn primary"
            onClick={handleViewPurchaseHistory}
          >
            Xem lịch sử mua hàng
          </button>
          <button
            type="button"
            className="payment-success-btn secondary"
            onClick={handleContinueShopping}
          >
            Tiếp tục mua sắm
          </button>
      </div>
    </div>

    <ScrollToTop />
  </div>
);
};

export default PaymentSuccessPage;
