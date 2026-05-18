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

const isCancelledStatus = (status) => ['cancelled', 'canceled'].includes(String(status || '').toLowerCase());
const isSuccessStatus = (status) => ['paid', 'success', 'completed'].includes(String(status || '').toLowerCase());

const PaymentReturnPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const refreshCartRef = useRef(refreshCart);
  refreshCartRef.current = refreshCart;

  // Guard against React StrictMode double-execution.
  // StrictMode runs effects twice in development. Without this guard,
  // processPaymentReturn() fires twice, causing duplicate API calls and
  // interleaved setState calls (race conditions).
  const hasProcessedRef = useRef(false);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasRouted, setHasRouted] = useState(false);

  useEffect(() => {
    // Skip if StrictMode already ran this effect and called the cleanup.
    if (hasProcessedRef.current) {
      console.log('[PaymentReturnPage] StrictMode second mount detected — skipping duplicate useEffect execution');
      return;
    }
    hasProcessedRef.current = true;

    let cancelled = false;

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

        // Guard: abort if component unmounted while awaiting.
        if (cancelled) {
          console.log('[PaymentReturnPage] Component unmounted during API call — aborting');
          return;
        }

        setResult(paymentResult);

        // Mutually exclusive routing — all paths return/return early.
        // No fallthrough possible.

        if (isSuccessStatus(paymentResult.status) || paymentResult.success) {
          console.log('[PaymentReturnPage] SUCCESS path — clearing state, refreshing cart, routing to success page');

          clearCheckoutPaymentTransientState();

          try {
            await refreshCartRef.current();
            console.log('[PaymentReturnPage] Cart refreshed after success');
          } catch {
            console.warn('[PaymentReturnPage] Cart refresh failed (best effort)');
          }

          const navigateUrl = paymentResult.orderCode
            ? `/purchase/success?orderCode=${encodeURIComponent(paymentResult.orderCode)}&status=${encodeURIComponent(paymentResult.status || 'PAID')}`
            : '/purchase/success';

          navigate(navigateUrl, { replace: true });
          setHasRouted(true);
          return;
        }

        // All non-success paths land on the cancel page.
        console.log('[PaymentReturnPage] NON-SUCCESS path — routing to cancel page. status:', paymentResult.status);
        navigate('/purchase/cancel', { replace: true });
        setHasRouted(true);
      } catch (apiError) {
        if (cancelled) {
          console.log('[PaymentReturnPage] Component unmounted during error — aborting');
          return;
        }

        if (apiError.status === 401) {
          console.log('[PaymentReturnPage] 401 received — redirecting to login');
          navigate('/login', { replace: true });
          setHasRouted(true);
          return;
        }

        setError(apiError.message || 'Failed to retrieve payment status. Please try again.');
        console.error('[PaymentReturnPage] Payment return error:', apiError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    processPaymentReturn();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, hasRouted]);

  // Loading state — show while verifying payment.
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

  // Error state — show only if routing failed.
  if (error && !hasRouted) {
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

  // Fallback — should not normally render since we always route.
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
