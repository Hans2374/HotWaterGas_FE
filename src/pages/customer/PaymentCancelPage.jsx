import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';

const PaymentCancelPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <div className="payment-return-container">
        <div className="payment-return-content payment-return-cancelled">
          <div className="payment-return-icon cancelled-icon">✕</div>
          <h2 className="payment-return-title">Payment Cancelled</h2>
          <p className="payment-return-message">Your payment was not completed. Your cart has been preserved.</p>
          <div className="payment-return-actions">
            <Button onClick={() => navigate('/', { replace: true })}>Back to Home</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
