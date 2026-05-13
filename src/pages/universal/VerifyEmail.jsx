import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { verifyEmail, resendVerification } from '../../api/authApi';
import './AuthPage.css';

const RESEND_COOLDOWN_SECONDS = 60;

export const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const stateEmail = location.state?.email;

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const cooldownTimer = useRef(null);

  useEffect(() => {
    // Determine email from state, query param fallback, then sessionStorage
    let resolved = '';
    if (stateEmail) {
      resolved = stateEmail;
    } else {
      const params = new URLSearchParams(location.search);
      const q = params.get('email');
      if (q) {
        resolved = q;
      } else {
        try {
          const stored = sessionStorage.getItem('hotwatergas.verify.email');
          if (stored) resolved = stored;
        } catch (e) {
          // ignore
        }
      }
    }

    if (!resolved) {
      // No email context -> redirect to register to start flow
      navigate('/register', { replace: true });
      return;
    }

    setEmail(resolved);
  }, [location.search, stateEmail, navigate]);

  useEffect(() => {
    if (cooldownRemaining <= 0 && cooldownTimer.current) {
      clearInterval(cooldownTimer.current);
      cooldownTimer.current = null;
    }
  }, [cooldownRemaining]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const startCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => {
    setCooldownRemaining(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownRemaining((s) => {
        if (s <= 1) {
          clearInterval(cooldownTimer.current);
          cooldownTimer.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setApiError('');
    setIsLoading(true);

    try {
      await verifyEmail(email, code);
      setSuccessMessage('Email verified successfully. Redirecting to login...');
      // Prefill login email via state
      setTimeout(() => navigate('/login', { state: { email }, replace: true }), 1000);
    } catch (err) {
      const msg = err?.message || err?.Message || 'Verification failed. Please try again.';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setApiError('');
    try {
      await resendVerification(email);
      startCooldown();
      setSuccessMessage('Verification code resent. Check your email.');
      try {
        sessionStorage.setItem('hotwatergas.verify.lastSentAt', Date.now().toString());
      } catch (e) {}
    } catch (err) {
      const msg = err?.message || err?.Message || 'Resend failed. Please try again later.';
      setApiError(msg);
    }
  };

  return (
    <AuthLayout title="Verify Email">
      <form onSubmit={handleVerify} className="auth-form">
        {apiError && <div className="error-banner">{apiError}</div>}
        {successMessage && <div className="success-banner">{successMessage}</div>}

        <Input label="Email" type="email" name="email" value={email} readOnly />

        <Input
          label="Verification Code"
          type="text"
          name="code"
          placeholder="Enter verification code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <Button type="submit" variant="primary" fullWidth disabled={isLoading || !code}>
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </Button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <div>
            <Button type="button" variant="link" disabled={cooldownRemaining > 0} onClick={handleResend}>
              {cooldownRemaining > 0 ? `Resend (${cooldownRemaining}s)` : 'Resend code'}
            </Button>
          </div>
          <div>
            <Link to="/login" className="auth-link">Back to login</Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default VerifyEmail;
