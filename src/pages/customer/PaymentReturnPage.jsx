import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { getPaymentReturn } from '../../api/paymentApi';
import { useCart } from '../../hooks/useCart';
import './PaymentReturnPage.css';

const CHECKOUT_SELECTION_KEY = 'hotwatergas.checkout.selectedCartItemIds';
const CHECKOUT_PREVIEW_KEY = 'hotwatergas.checkout.preview';
const LAST_ORDER_ID_KEY = 'hotwatergas.checkout.lastOrderId';
const CHECKOUT_PAYMENT_TRANSIENT_PREFIXES = ['hotwatergas.checkout.', 'hotwatergas.payment.'];

const clearCheckoutPaymentTransientState = () => {
  const keysToRemove = [];

  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (!key) {
      continue;
    }

    if (CHECKOUT_PAYMENT_TRANSIENT_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  if (!keysToRemove.includes(CHECKOUT_SELECTION_KEY)) {
    keysToRemove.push(CHECKOUT_SELECTION_KEY);
  }

  if (!keysToRemove.includes(CHECKOUT_PREVIEW_KEY)) {
    keysToRemove.push(CHECKOUT_PREVIEW_KEY);
  }

  keysToRemove.forEach((key) => {
    sessionStorage.removeItem(key);
  });

  return keysToRemove.length;
};

const isCancelledStatus = (status) => ['cancelled', 'canceled'].includes(String(status || '').toLowerCase());

const isProcessingStatus = (status) => ['pending', 'processing'].includes(String(status || '').toLowerCase());

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const hasSyncedSuccessfulReturn = useRef(false);
  const hasLoggedSuccessRender = useRef(false);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      setIsLoading(true);
      setError('');

        try {
        const orderCode = searchParams.get('orderCode');
        const status = searchParams.get('status');
        const success = searchParams.get('success') === 'true';
        const transactionId = searchParams.get('transactionId');
        const amountPaidStr = searchParams.get('amountPaid');
        const amountPaid = amountPaidStr ? parseFloat(amountPaidStr) : undefined;

        if (!orderCode) {
          setError('Payment return is missing required information. Please contact support.');
          setIsLoading(false);
          return;
        }
        console.log('[PaymentReturnPage] received query', { orderCode, status, success, transactionId, amountPaid });

        const paymentResult = await getPaymentReturn(
          orderCode,
          status,
          success,
          transactionId,
          amountPaid
        );

        console.log('[PaymentReturnPage] backend payment return result', paymentResult);
        setResult(paymentResult);
      } catch (apiError) {
        if (apiError.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setError(apiError.message || 'Failed to retrieve payment status. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [searchParams, navigate]);

  useEffect(() => {
    const syncCartAfterSuccess = async () => {
      if (!result?.success || hasSyncedSuccessfulReturn.current) {
        return;
      }

      hasSyncedSuccessfulReturn.current = true;
      console.log('[PaymentReturnPage] payment success confirmed');

      try {
        const removedCount = clearCheckoutPaymentTransientState();
        console.log('[PaymentReturnPage] checkout transient state cleared', { removedKeyCount: removedCount });
        console.log('[PaymentReturnPage] cart refresh triggered');
        await refreshCart();

        const orderId = sessionStorage.getItem(LAST_ORDER_ID_KEY);
        if (orderId) {
          sessionStorage.removeItem(LAST_ORDER_ID_KEY);
          navigate(`/account/orders/${orderId}`, { replace: true });
          return;
        }

        navigate('/account/orders', { replace: true });
      } catch {
        // Best effort only; the backend is authoritative for cart cleanup.
        const orderId = sessionStorage.getItem(LAST_ORDER_ID_KEY);
        if (orderId) {
          sessionStorage.removeItem(LAST_ORDER_ID_KEY);
          navigate(`/account/orders/${orderId}`, { replace: true });
          return;
        }

        navigate('/account/orders', { replace: true });
      }
    };

    syncCartAfterSuccess();
  }, [result, refreshCart]);

  useEffect(() => {
    if (!isLoading && !error && result?.success && !hasLoggedSuccessRender.current) {
      hasLoggedSuccessRender.current = true;
      console.log('[PaymentReturnPage] success state rendered');
    }
  }, [isLoading, error, result]);

  const getStatusDisplay = () => {
    if (isLoading) {
      return <Loader text="Checking payment status..." />;
    }

    if (error) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-error">
            <div className="payment-return-icon error-icon">!</div>
            <h2 className="payment-return-title">Payment Error</h2>
            <p className="payment-return-message">{error}</p>
            <div className="payment-return-actions">
              <Button
                type="button"
                className="payment-return-button"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Return to Cart
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-error">
            <h2 className="payment-return-title">Payment Status Unknown</h2>
            <p className="payment-return-message">
              Unable to determine your payment status. Please contact support.
            </p>
            <div className="payment-return-actions">
              <Button
                type="button"
                className="payment-return-button"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Return to Cart
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Success state
    if (result.success) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-success">
            <div className="payment-return-icon success-icon">✓</div>
            <h2 className="payment-return-title">Đơn hàng đã hoàn tất</h2>
            <p className="payment-return-message">
              Thanh toán đã thành công. Bạn sẽ được chuyển tới lịch sử mua hàng để xem đơn hàng và Steam key.
            </p>
            <div className="payment-return-details">
              <div className="payment-return-detail">
                <span className="payment-return-label">Order Code:</span>
                <span className="payment-return-value">{result.orderCode}</span>
              </div>
              <div className="payment-return-detail">
                <span className="payment-return-label">Delivery Channel:</span>
                <span className="payment-return-value">In-app purchase history</span>
              </div>
            </div>

            <div className="payment-return-checklist">
              <p className="payment-return-checklist-item">Payment successful</p>
              <p className="payment-return-checklist-item">Order confirmed and fulfilled</p>
              <p className="payment-return-checklist-item">Steam keys are available in your account</p>
              <p className="payment-return-checklist-item">Order history refreshed from the server</p>
            </div>

            <div className="payment-return-help">
              <p>
                If you are not redirected automatically, use the button below to open your purchase history.
              </p>
            </div>

            <div className="payment-return-actions">
              <Button
                type="button"
                className="payment-return-button primary"
                onClick={() => {
                  const orderId = sessionStorage.getItem(LAST_ORDER_ID_KEY);
                  if (orderId) {
                    sessionStorage.removeItem(LAST_ORDER_ID_KEY);
                    navigate(`/account/orders/${orderId}`, { replace: true });
                    return;
                  }

                  navigate('/account/orders', { replace: true });
                }}
              >
                Open Purchase History
              </Button>
              <Button
                type="button"
                className="payment-return-button secondary"
                onClick={() => navigate('/', { replace: true })}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Cancelled state
    if (isCancelledStatus(result.status)) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-cancelled">
            <div className="payment-return-icon cancelled-icon">✕</div>
            <h2 className="payment-return-title">Payment Cancelled</h2>
            <p className="payment-return-message">
              Your payment was cancelled. Your cart has been preserved.
            </p>
            <div className="payment-return-details">
              <div className="payment-return-detail">
                <span className="payment-return-label">Order Code:</span>
                <span className="payment-return-value">{result.orderCode}</span>
              </div>
            </div>
            <div className="payment-return-actions">
              <Button
                type="button"
                className="payment-return-button primary"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Return to Cart
              </Button>
              <Button
                type="button"
                className="payment-return-button secondary"
                onClick={() => navigate('/', { replace: true })}
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Processing fallback
    if (isProcessingStatus(result.status)) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-pending">
            <Loader text="Finalizing your order..." />
            <p className="payment-return-message" style={{ marginTop: 16 }}>
              We are confirming payment and fulfillment status. This page can take a moment to update.
            </p>
            <div className="payment-return-actions">
              <Button
                type="button"
                className="payment-return-button primary"
                onClick={() => window.location.reload()}
              >
                Refresh Status
              </Button>
              <Button
                type="button"
                className="payment-return-button secondary"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Back to Cart
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Failed state
    if (!result.success) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-failed">
            <div className="payment-return-icon failed-icon">!</div>
            <h2 className="payment-return-title">Payment Failed</h2>
            <p className="payment-return-message">
              {result.message || 'Your payment could not be processed. Please try again.'}
            </p>
            <div className="payment-return-details">
              <div className="payment-return-detail">
                <span className="payment-return-label">Order Code:</span>
                <span className="payment-return-value">{result.orderCode}</span>
              </div>
            </div>
            <div className="payment-return-actions">
              <Button
                type="button"
                className="payment-return-button primary"
                onClick={() => navigate('/checkout', { replace: true })}
              >
                Try Again
              </Button>
              <Button
                type="button"
                className="payment-return-button secondary"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Back to Cart
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Pending state - should rarely reach here
    return (
      <div className="payment-return-container">
        <div className="payment-return-content payment-return-pending">
          <Loader text="Your payment is being processed..." />
          <p className="payment-return-message" style={{ marginTop: 16 }}>
            Please wait while we confirm your payment status.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {getStatusDisplay()}
    </div>
  );
};

export default PaymentReturnPage;
