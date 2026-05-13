import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { getPaymentReturn } from '../../api/paymentApi';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasTriggered = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const finalize = async () => {
      if (hasTriggered.current) return;
      hasTriggered.current = true;

      const orderCode = searchParams.get('orderCode');
      const status = searchParams.get('status');
      const success = searchParams.get('success') === 'true';
      const transactionId = searchParams.get('transactionId');
      const amountPaidStr = searchParams.get('amountPaid');
      const amountPaid = amountPaidStr ? parseFloat(amountPaidStr) : undefined;

      if (!orderCode) {
        setError('Missing order code in return URL.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const res = await getPaymentReturn(orderCode, status, success, transactionId, amountPaid);
        setResult(res);
      } catch (err) {
        setError(err.message || 'Failed to confirm payment');
      } finally {
        setIsLoading(false);
      }
    };

    finalize();
  }, [searchParams]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-pending">
            <Loader text="Confirming your payment..." />
            <p style={{ marginTop: 16 }}>Please wait while we confirm and finalize your order.</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-error">
            <div className="payment-return-icon error-icon">!</div>
            <h2 className="payment-return-title">Payment Confirmation Failed</h2>
            <p className="payment-return-message">We received your return but could not confirm the payment.</p>
            <p className="payment-return-message">{error}</p>
            <div className="payment-return-actions">
              <Button onClick={() => navigate('/', { replace: true })}>Back to Home</Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </div>
      );
    }

    // success
    if (result?.success) {
      return (
        <div className="payment-return-container">
          <div className="payment-return-content payment-return-success">
            <div className="payment-return-icon success-icon">✓</div>
            <h2 className="payment-return-title">Payment successful</h2>
            <p className="payment-return-message">Your order has been completed successfully.</p>
            <div className="payment-return-actions">
              <Button onClick={() => navigate('/', { replace: true })}>Back to Home</Button>
              <Button onClick={() => navigate('/account/orders', { replace: true })}>View Purchase History</Button>
            </div>
          </div>
        </div>
      );
    }

    // fallback
    return (
      <div className="payment-return-container">
        <div className="payment-return-content payment-return-error">
          <h2 className="payment-return-title">Payment status unknown</h2>
          <p className="payment-return-message">Unable to determine payment result.</p>
          <div className="payment-return-actions">
            <Button onClick={() => navigate('/', { replace: true })}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>{renderBody()}</div>
  );
};

export default PaymentSuccessPage;
