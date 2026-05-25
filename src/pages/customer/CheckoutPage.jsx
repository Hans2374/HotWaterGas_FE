import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader } from '../../components/common/Loader';
import { Button } from '../../components/common/Button';
import { createPayment } from '../../api/paymentApi';
import { previewCheckout } from '../../api/checkoutApi';
import { useAuth } from '../../hooks/useAuth';
import EmailVerificationModal from '../../components/auth/EmailVerificationModal';
import './CheckoutPage.css';

const CHECKOUT_SELECTION_KEY = 'hotwatergas.checkout.selectedCartItemIds';
const CHECKOUT_PREVIEW_KEY = 'hotwatergas.checkout.preview';

const formatCurrency = (value) => Number(value || 0).toLocaleString();

const readSelectedCartItemIds = (locationState) => {
  if (Array.isArray(locationState?.selectedCartItemIds)) {
    return locationState.selectedCartItemIds;
  }

  try {
    const stored = sessionStorage.getItem(CHECKOUT_SELECTION_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readCheckoutPreview = () => {
  try {
    const stored = sessionStorage.getItem(CHECKOUT_PREVIEW_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const CheckoutLineItem = ({ item }) => {
  const navigate = useNavigate();
  const finalPrice = Number(item.unitPrice ?? item.finalPrice ?? item.price ?? 0);
  const quantity = Number(item.quantity || 0);
  const subtotal = Number(item.lineTotal ?? item.subtotal ?? finalPrice * quantity ?? 0);
  const hasProductSlug = Boolean(item.productSlug);

  return (
    <div className="checkout-line-item">
      <div className="checkout-line-item-image-wrap">
        {item.productImage ? (
          <img className="checkout-line-item-image" src={item.productImage} alt={item.productName} />
        ) : (
          <div className="checkout-line-item-image-placeholder">Không có hình ảnh</div>
        )}
      </div>
      <div className="checkout-line-item-body">
        {hasProductSlug ? (
          <button
            type="button"
            className="checkout-line-item-title-link"
            onClick={() => navigate(`/products/${item.productSlug}`)}
          >
            <h3 className="checkout-line-item-title">{item.productName}</h3>
          </button>
        ) : (
          <h3 className="checkout-line-item-title">{item.productName}</h3>
        )}
        <p className="checkout-line-item-price-line">
          {formatCurrency(finalPrice)} × {quantity}
        </p>
        <p className="checkout-line-item-subtotal">Tổng cộng: {formatCurrency(subtotal)}</p>
      </div>
    </div>
  );
};

const CheckoutIssueItem = ({ item }) => {
  return (
    <div className="checkout-issue-item">
      <div className="checkout-issue-item-badge">{item.reasonCode || 'Không hợp lệ'}</div>
      <div>
        <h4 className="checkout-issue-item-title">{item.productName || 'Mục không khả dụng'}</h4>
        <p className="checkout-issue-item-message">{item.message}</p>
      </div>
    </div>
  );
};

export const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, isEmailVerified, updateIsEmailVerified } = useAuth();
  const selectedCartItemIds = useMemo(() => readSelectedCartItemIds(location.state), [location.state]);
  const [preview, setPreview] = useState(readCheckoutPreview());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  /* Email verification modal state. */
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  /* Ref to hold the pending payment action so we can replay it after verification. */
  const paymentAfterVerifyRef = useRef(null);

  useEffect(() => {
    if (selectedCartItemIds.length === 0) {
      navigate('/cart', { replace: true });
      return;
    }

    const loadPreview = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await previewCheckout(selectedCartItemIds);
        setPreview(result);
        sessionStorage.setItem(CHECKOUT_PREVIEW_KEY, JSON.stringify(result));
      } catch (apiError) {
        if (apiError.status === 401) {
          navigate('/login', { replace: true });
          return;
        }

        setError(apiError.message || 'Failed to validate checkout.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [navigate, selectedCartItemIds]);

  const handleContinueToPayment = async () => {
    if (!preview?.canProceed) {
      return;
    }

    if (isSubmittingPayment) {
      console.log('[Checkout] payment create blocked: already submitting');
      return;
    }

    const paymentCartItemIds = [...selectedCartItemIds];
    console.log('[Checkout] payment create clicked', {
      selectedCartItemIds: paymentCartItemIds,
      canProceed: preview?.canProceed === true
    });

    /* ── Email verification gate ─────────────────────────────────────── */
    if (!isEmailVerified) {
      console.log('[Checkout] email not verified — opening verification modal');
      /* Reset submitting flag so the replay can proceed without hitting the guard. */
      setIsSubmittingPayment(false);
      paymentAfterVerifyRef.current = () => handleContinueToPayment();
      setShowVerifyModal(true);
      return;
    }

    /* ── Proceed to payment ─────────────────────────────────────────── */
    setIsSubmittingPayment(true);
    setError('');

    try {
      const response = await createPayment(paymentCartItemIds);
      console.log('[Checkout] payment create response', {
        checkoutUrl: response.checkoutUrl,
        orderId: response.orderId,
        paymentTransactionId: response.paymentTransactionId,
        status: response.status
      });

      if (!response.checkoutUrl) {
        throw new Error('Dịch vụ thanh toán không trả lại URL thanh toán. Vui lòng thử lại.');
      }

      console.log('[Checkout] redirecting to PayOS', { checkoutUrl: response.checkoutUrl });
      window.location.href = response.checkoutUrl;
    } catch (apiError) {
      console.log('[Checkout] payment create failed', {
        status: apiError?.status,
        message: apiError?.message
      });

      if (apiError.status === 401) {
        navigate('/login', { replace: true });
        return;
      }

      setError(apiError.message || 'Không thể bắt đầu thanh toán. Vui lòng thử lại.');
      setIsSubmittingPayment(false);
    }
  };

  const canProceed = Boolean(preview?.canProceed);

  /* ── Email verification callback ─────────────────────────────────────── */
  const handleVerifySuccess = async () => {
    setShowVerifyModal(false);
    await updateIsEmailVerified();
    /* Replay the pending payment after context is updated. */
    if (paymentAfterVerifyRef.current) {
      paymentAfterVerifyRef.current();
      paymentAfterVerifyRef.current = null;
    }
  };

  const handleVerifyClose = () => {
    setShowVerifyModal(false);
    paymentAfterVerifyRef.current = null;
  };

  return (
    <>
      <div className="checkout-shell">
        <div className="checkout-main">
          <div className="checkout-header">
            <h2>Thanh toán</h2>
            <p className="checkout-subtitle">Kiểm tra xác thực máy chủ uy tín trước khi thanh toán.</p>
          </div>

        {isLoading && <Loader text="Đang xác thực thanh toán..." />}

        {!isLoading && error && <p className="checkout-message checkout-error">{error}</p>}

        {!isLoading && !error && preview && (
          <>
            {preview.validItems.length > 0 && (
              <section className="checkout-section">
                <h3 className="checkout-section-title">Items</h3>
                <div className="checkout-item-list">
                  {preview.validItems.map((item) => (
                    <CheckoutLineItem key={item.cartItemId} item={item} />
                  ))}
                </div>
              </section>
            )}

            {preview.invalidItems.length > 0 && (
              <section className="checkout-section checkout-section-warning">
                <h3 className="checkout-section-title">Blocked Items</h3>
                <p className="checkout-warning-text">
                  Some selected items are no longer valid and must be removed before payment.
                </p>
                <div className="checkout-issue-list">
                  {preview.invalidItems.map((item) => (
                    <CheckoutIssueItem key={item.cartItemId} item={item} />
                  ))}
                </div>
                {preview.blockingMessages.length > 0 && (
                  <ul className="checkout-blocking-list">
                    {preview.blockingMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {preview.validItems.length === 0 && preview.invalidItems.length === 0 && (
              <p className="checkout-message">No checkout items were returned.</p>
            )}
          </>
        )}
        </div>

        <aside className="checkout-summary">
          <h3 className="checkout-summary-title">Order Summary</h3>
          <div className="checkout-summary-row">
            <span>Total</span>
            <strong>{formatCurrency(preview?.finalTotal)}</strong>
          </div>
          <div className="checkout-summary-panel">
            <span className="checkout-summary-label">Payment Method</span>
            <div className="checkout-summary-value">PayOS QR</div>
            <p className="checkout-summary-note">Steam key will be sent to your email after successful payment.</p>
          </div>
          {!canProceed && preview?.blockingMessages?.length > 0 && (
            <div className="checkout-summary-blocker">
              <strong>Thanh toán bị chặn</strong>
              <p>{preview.blockingMessages[0]}</p>
            </div>
          )}
          <Button
            type="button"
            className="checkout-continue-button"
            disabled={!canProceed || isSubmittingPayment}
            onClick={handleContinueToPayment}
          >
            {isSubmittingPayment ? 'Đang chuyển hướng...' : 'Tiếp tục thanh toán'}
          </Button>
          {!canProceed && (
            <p className="checkout-summary-helper">Giải quyết các mục bị chặn trước khi tiếp tục.</p>
          )}
        </aside>
      </div>

      <EmailVerificationModal
        isOpen={showVerifyModal}
        email={email}
        onClose={handleVerifyClose}
        onSuccess={handleVerifySuccess}
      />
    </>
  );
};
