import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader } from '../../components/common/Loader';
import { useCart } from '../../hooks/useCart';
import './PaymentReturnPage.css';

const isCancelledStatus = (status) =>
  ['cancelled', 'canceled'].includes(String(status || '').toLowerCase());
const isSuccessStatus = (status) =>
  ['paid', 'success', 'completed'].includes(String(status || '').toLowerCase());

const PaymentCancelPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const hasProcessedRef = useRef(false);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processError, setProcessError] = useState('');

  useEffect(() => {
    // Simple guard: only process once per mount. Accepts StrictMode double-execution
    // as a non-issue — both API calls have idempotent backend handling.
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processCancellation = async () => {
      const orderCode = searchParams.get('orderCode');
      const status = searchParams.get('status');
      const success = searchParams.get('success') === 'true';
      const transactionId = searchParams.get('transactionId');
      const amountPaidStr = searchParams.get('amountPaid');
      const amountPaid = amountPaidStr ? parseFloat(amountPaidStr) : undefined;

      console.log('[PaymentCancelPage] Processing. orderCode:', orderCode, 'status:', status);

      if (!orderCode) {
        console.log('[PaymentCancelPage] No orderCode — skip backend call');
        setIsLoading(false);
        return;
      }

      try {
        const { getPaymentReturn } = await import('../../api/paymentApi');
        const res = await getPaymentReturn(orderCode, status, success, transactionId, amountPaid);

        console.log('[PaymentCancelPage] Backend result:', res);
        setResult(res);

        // Edge case: PayOS status changed between cancel and now — redirect to success.
        if (isSuccessStatus(res.status) || res.success) {
          console.log('[PaymentCancelPage] Backend confirmed SUCCESS — redirecting to success page');
          navigate(
            `/purchase/success?orderCode=${encodeURIComponent(res.orderCode || '')}&status=${encodeURIComponent(res.status || 'PAID')}`,
            { replace: true }
          );
          return;
        }

        if (isCancelledStatus(res.status)) {
          console.log('[PaymentCancelPage] Cancellation confirmed — refreshing cart');
          await refreshCart();
          console.log('[PaymentCancelPage] Cart refreshed');
        } else {
          console.log('[PaymentCancelPage] Non-cancel status from backend:', res.status);
          setProcessError('Không thể xác minh thanh toán. Giỏ hàng của bạn vẫn được bảo toàn.');
        }
      } catch (err) {
        console.error('[PaymentCancelPage] Backend call failed:', err);
        if (err.status !== 401) {
          setProcessError('Không thể xác minh thanh toán. Giỏ hàng của bạn vẫn được bảo toàn.');
        }
      } finally {
        // ALWAYS resolve loading. This is the critical fix — no conditional, no abort guard.
        setIsLoading(false);
      }
    };

    processCancellation();
    // Intentionally no cleanup return. No cancelled flag, no abort logic.
    // The async function completes fully regardless of StrictMode double-mount.
  }, [searchParams, navigate, refreshCart]);

  const handleRetryCheckout = () => {
    navigate('/checkout', { replace: true });
  };

  const handleBackToCart = () => {
    navigate('/cart', { replace: true });
  };

  const handleContinueShopping = () => {
    navigate('/', { replace: true });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-pending">
            <Loader text="Đang xử lý hủy..." />
            <p className="payment-return-message" style={{ marginTop: 16 }}>
              Đang xác minh thanh toán của bạn.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-cancel-page">
      <div className="payment-cancel-container">
        <div className="payment-cancel-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" stroke="#6b7280" strokeWidth="4" fill="none"/>
            <path d="M28 28L52 52M52 28L28 52" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        <h1 className="payment-cancel-title">Thanh toán đã bị hủy</h1>

        <p className="payment-cancel-subtitle">
          Đơn hàng chưa được thanh toán. Các sản phẩm vẫn được giữ trong giỏ hàng của bạn.
        </p>

        {processError && (
          <p className="payment-cancel-subtitle" style={{ color: 'var(--customer-accent-hover)' }}>
            {processError}
          </p>
        )}

        <div className="payment-cancel-info">
          <div className="payment-cancel-info-item">
            <span className="payment-cancel-check">&#10003;</span>
            <span>Giỏ hàng của bạn vẫn còn đầy đủ</span>
          </div>
          <div className="payment-cancel-info-item">
            <span className="payment-cancel-check">&#10003;</span>
            <span>Không có khoản phí nào được trừ</span>
          </div>
          <div className="payment-cancel-info-item">
            <span className="payment-cancel-check">&#10003;</span>
            <span>Bạn có thể thử lại thanh toán bất cứ lúc nào</span>
          </div>
        </div>

        <div className="payment-cancel-actions">
          <button
            type="button"
            className="payment-cancel-btn primary"
            onClick={handleRetryCheckout}
          >
            Thử lại thanh toán
          </button>
          <button
            type="button"
            className="payment-cancel-btn secondary"
            onClick={handleBackToCart}
          >
            Quay lại giỏ hàng
          </button>
          <button
            type="button"
            className="payment-cancel-btn tertiary"
            onClick={handleContinueShopping}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
