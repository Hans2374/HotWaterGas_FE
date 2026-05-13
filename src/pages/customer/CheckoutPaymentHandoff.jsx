import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { createPayment } from '../../api/paymentApi';

const STORAGE_KEY_PREVIEW = 'hotwatergas.checkout.preview';
const STORAGE_KEY_SELECTED_IDS = 'hotwatergas.checkout.selectedCartItemIds';
const STORAGE_KEY_LAST_ORDER_ID = 'hotwatergas.checkout.lastOrderId';

const readPreview = (locationState) => {
  if (locationState?.preview) {
    return locationState.preview;
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PREVIEW);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const readSelectedCartItemIds = (locationState) => {
  if (Array.isArray(locationState?.selectedCartItemIds)) {
    return locationState.selectedCartItemIds;
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_SELECTED_IDS);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CheckoutPaymentHandoff = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const preview = useMemo(() => readPreview(location.state), [location.state]);
  const selectedCartItemIds = useMemo(() => readSelectedCartItemIds(location.state), [location.state]);

  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [error, setError] = useState('');
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const initiatePayment = async () => {
    if (!selectedCartItemIds || selectedCartItemIds.length === 0) {
      setError('No items selected for payment. Redirecting to cart...');
      const timer = setTimeout(() => {
        navigate('/cart', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (!preview?.canProceed) {
      setError('Checkout is not valid. Redirecting to checkout...');
      const timer = setTimeout(() => {
        navigate('/checkout', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (isInitiatingPayment || paymentInitiated) {
      console.log('[CheckoutPaymentHandoff] payment create blocked', {
        isInitiatingPayment,
        paymentInitiated
      });
      return;
    }

    const paymentCartItemIds = [...selectedCartItemIds];
    console.log('[CheckoutPaymentHandoff] payment create clicked', {
      selectedCartItemIds: paymentCartItemIds,
      canProceed: preview?.canProceed === true
    });

    setIsInitiatingPayment(true);
    setError('');

    try {
      const response = await createPayment(paymentCartItemIds);

      console.log('[CheckoutPaymentHandoff] payment create response', {
        checkoutUrl: response.checkoutUrl,
        orderId: response.orderId,
        paymentTransactionId: response.paymentTransactionId,
        status: response.status
      });

      if (!response.checkoutUrl) {
        setError('Payment service did not return checkout URL. Please try again.');
        setIsInitiatingPayment(false);
        return;
      }

      if (response.orderId) {
        try {
          sessionStorage.setItem(STORAGE_KEY_LAST_ORDER_ID, response.orderId);
        } catch {
          // Best effort only; return page can still fall back to the history list.
        }
      }

      setPaymentInitiated(true);
      console.log('[CheckoutPaymentHandoff] redirecting to PayOS', { checkoutUrl: response.checkoutUrl });
      window.location.href = response.checkoutUrl;
    } catch (apiError) {
      console.log('[CheckoutPaymentHandoff] payment create failed', {
        status: apiError?.status,
        message: apiError?.message
      });

      if (apiError.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      const errorMessage = apiError.message || 'Failed to initiate payment. Please try again.';
      setError(errorMessage);
      setIsInitiatingPayment(false);
    }
  };

  return (
    <section className="cart-message" style={{ textAlign: 'center' }}>
        {isInitiatingPayment && !error && (
          <>
            <Loader text="Redirecting to payment..." />
            <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-light)' }}>
              Please do not close this window.
            </p>
          </>
        )}

        {error && (
          <>
            <h2 style={{ color: 'var(--error-color)' }}>Payment Error</h2>
            <p style={{ marginTop: 8, color: 'var(--error-color)' }}>{error}</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button
                type="button"
                onClick={() => {
                  setError('');
                  setIsInitiatingPayment(false);
                  window.location.reload();
                }}
              >
                Try Again
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/cart', { replace: true })}
              >
                Back to Cart
              </Button>
            </div>
          </>
        )}

        {!isInitiatingPayment && !error && (
          <>
            <h2>Preparing Payment</h2>
            <p style={{ marginTop: 8, fontSize: 14, color: 'var(--text-light)' }}>
              Setting up your payment session...
            </p>
            <div style={{ marginTop: 16 }}>
              <Button
                type="button"
                onClick={initiatePayment}
                disabled={isInitiatingPayment || paymentInitiated}
              >
                {isInitiatingPayment ? 'Redirecting...' : 'Continue to PayOS'}
              </Button>
            </div>
          </>
        )}
      </section>
  );
};
