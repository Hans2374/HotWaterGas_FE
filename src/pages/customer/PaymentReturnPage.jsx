import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader } from '../../components/common/Loader';
import { useCart } from '../../hooks/useCart';
import './PaymentReturnPage.css';

const CHECKOUT_SELECTION_KEY = 'hotwatergas.checkout.selectedCartItemIds';
const CHECKOUT_PREVIEW_KEY = 'hotwatergas.checkout.preview';
const CHECKOUT_PAYMENT_TRANSIENT_PREFIXES = ['hotwatergas.checkout.', 'hotwatergas.payment.'];

const clearCheckoutPaymentTransientState = () => {
  console.log('[PaymentReturnPage] clearCheckoutPaymentTransientState called');

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

  console.log('[PaymentReturnPage] Clearing sessionStorage keys:', keysToRemove);

  keysToRemove.forEach((key) => {
    sessionStorage.removeItem(key);
  });

  return keysToRemove.length;
};

const isCancelledStatus = (status) =>
  ['cancelled', 'canceled'].includes(String(status || '').toLowerCase());
const isSuccessStatus = (status) =>
  ['paid', 'success', 'completed'].includes(String(status || '').toLowerCase());

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const refreshCartRef = useRef(refreshCart);
  refreshCartRef.current = refreshCart;

  // Single guard: process at most once per page visit.
  // Accepts StrictMode double-mount as a non-issue — the backend is idempotent
  // and the hasProcessedRef ensures the effect body runs at most once.
  const hasProcessedRef = useRef(false);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeTarget, setRouteTarget] = useState(null);

  useEffect(() => {
    // StrictMode first mount: runs the effect.
    // StrictMode second mount (after cleanup): skipped — effect body does NOT run.
    // No cleanup returned, so cancelled flag is NOT set on second mount.
    if (hasProcessedRef.current) {
      console.log('[PaymentReturnPage] StrictMode double-mount — second mount skipped by ref guard');
      return;
    }
    hasProcessedRef.current = true;

    const processPaymentReturn = async () => {
      setIsLoading(true);
      setError('');

      try {
        const orderCode = searchParams.get('orderCode');
        const status = searchParams.get('status');
        const success = searchParams.get('success') === 'true';
        const transactionId = searchParams.get('transactionId');
        const amountPaidStr = searchParams.get('amountPaid');
        const amountPaid = amountPaidStr ? parseFloat(amountPaidStr) : undefined;

        console.log('[PaymentReturnPage] Received query:', { orderCode, status, success, transactionId, amountPaid });

        if (!orderCode) {
          setError('Payment return is missing required information. Please contact support.');
          setIsLoading(false);
          return;
        }

        const { getPaymentReturn } = await import('../../api/paymentApi');
        const paymentResult = await getPaymentReturn(
          orderCode,
          status,
          success,
          transactionId,
          amountPaid
        );

        console.log('[PaymentReturnPage] Backend result:', paymentResult);
        setResult(paymentResult);

        if (isSuccessStatus(paymentResult.status) || paymentResult.success) {
          console.log('[PaymentReturnPage] SUCCESS — refreshing cart and routing to success page');

          clearCheckoutPaymentTransientState();

          try {
            await refreshCartRef.current();
            console.log('[PaymentReturnPage] Cart refreshed');
          } catch {
            console.warn('[PaymentReturnPage] Cart refresh failed (best-effort)');
          }

          const targetUrl = paymentResult.orderCode
            ? `/purchase/success?orderCode=${encodeURIComponent(paymentResult.orderCode)}&status=${encodeURIComponent(paymentResult.status || 'PAID')}`
            : '/purchase/success';

          setRouteTarget(targetUrl);
        } else if (isCancelledStatus(paymentResult.status)) {
          console.log('[PaymentReturnPage] CANCELLED — routing to cancel page. status:', paymentResult.status);
          setRouteTarget('/purchase/cancel');
        } else {
          console.log('[PaymentReturnPage] FAILED/OTHER — routing to cancel page. status:', paymentResult.status);
          setRouteTarget('/purchase/cancel');
        }
      } catch (apiError) {
        if (apiError.status === 401) {
          console.log('[PaymentReturnPage] 401 — redirecting to login');
          setRouteTarget('/login');
          return;
        }

        setError(apiError.message || 'Failed to retrieve payment status. Please try again.');
        console.error('[PaymentReturnPage] Payment return error:', apiError);
      } finally {
        // ALWAYS resolve loading. No cancelled flag, no abort guard.
        // Navigation is handled via routeTarget state to avoid setState-after-navigate issues.
        setIsLoading(false);
      }
    };

    processPaymentReturn();
    // Intentionally no cleanup return. No cancelled flag. No abort logic.
    // The async function completes fully regardless of StrictMode double-mount.
  }, [searchParams]);

  // Handle navigation separately from the async effect.
  // This separates concerns: effect handles data, this effect handles routing.
  useEffect(() => {
    if (routeTarget) {
      navigate(routeTarget, { replace: true });
    }
  }, [routeTarget, navigate]);

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-pending">
            <Loader text="Verifying payment status..." />
            <p className="payment-return-message" style={{ marginTop: 16 }}>
              Please wait while we confirm your payment with PayOS.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-error">
            <div className="payment-return-icon error-icon">!</div>
            <h2 className="payment-return-title">Payment Verification Failed</h2>
            <p className="payment-return-message">{error}</p>
            <div className="payment-return-actions">
              <button
                type="button"
                className="payment-return-button"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Return to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div className="payment-return-container">
        <div className="payment-return-content payment-return-pending">
          <Loader text="Redirecting..." />
        </div>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
