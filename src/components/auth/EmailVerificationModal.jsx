import React, { useState, useEffect, useRef } from 'react';
import { Loader, RotateCcw, CheckCircle } from 'lucide-react';
import { verifyEmail, resendVerification } from '../../api/authApi';
import './EmailVerificationModal.css';

const RESEND_COOLDOWN = 60;

const EmailVerificationModal = ({
  isOpen,
  onClose,
  email,
  onSuccess
}) => {
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const cooldownTimerRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setCode('');
    setCodeSent(false);
    setCooldown(0);
    setLoading(false);
    setApiError('');
    setSuccess(false);

    // Send the verification email right away when the modal opens
    const sendOnOpen = async () => {
      try {
        await resendVerification(email);
        setCodeSent(true);
        setCooldown(RESEND_COOLDOWN);
      } catch {
        // Silently fail — user can still manually resend
      }
    };
    sendOnOpen();
  }, [isOpen, email]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      return;
    }
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldown]);

  if (!isOpen) return null;

  const close = () => onClose?.();

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setCode('');
    setApiError('');
    setLoading(true);
    try {
      await resendVerification(email);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setApiError(err?.message || 'Không thể gửi lại mã.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!/^[0-9]{6}$/.test(trimmed)) {
      setApiError('Vui lòng nhập đúng 6 chữ số của mã xác minh.');
      return;
    }
    setApiError('');
    setLoading(true);
    try {
      await verifyEmail(email, trimmed);
      setSuccess(true);
      // Small delay before calling onSuccess to show success state
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('hết hạn')) {
        setApiError('Mã đã hết hạn. Vui lòng gửi lại mã mới.');
      } else if (msg.toLowerCase().includes('không đúng')) {
        setApiError('Mã xác minh không đúng. Vui lòng kiểm tra lại email.');
      } else {
        setApiError(msg || 'Xác minh thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div
        className="ev-modal-overlay"
        onClick={(e) => e.target === e.currentTarget && close()}
        role="presentation"
      >
        <div className="ev-modal ev-modal--success" role="dialog" aria-modal="true">
          <div className="ev-success">
            <div className="ev-success-icon">
              <CheckCircle size={32} strokeWidth={2} />
            </div>
            <h2 className="ev-success-title">Xác minh thành công!</h2>
            <p className="ev-success-text">
              Email của bạn đã được xác minh thành công.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ev-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="presentation"
    >
      <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="ev-title">
        <button className="ev-close" onClick={close} aria-label="Đóng">✕</button>

        <div className="ev-header">
          <h2 className="ev-title" id="ev-title">Xác minh email</h2>
          <p className="ev-subtitle">
            Bạn cần xác minh email trước khi mua hàng. Mã xác minh 6 chữ số đã được gửi đến <strong>{email}</strong>
          </p>
        </div>

        {/* OTP input */}
        <div className="ev-field">
          <label className="ev-label" htmlFor="ev-otp">Mã xác minh</label>
          <input
            id="ev-otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="ev-input ev-otp-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && code.trim().length === 6 && !loading && handleVerify()}
            placeholder="Nhập 6 chữ số"
            maxLength={6}
            autoComplete="one-time-code"
            autoFocus
            disabled={loading}
          />
          <span className="ev-field-hint">Nhập 6 chữ số từ email của bạn</span>
        </div>

        {apiError && <div className="ev-alert ev-alert--error">{apiError}</div>}

        <div className="ev-footer">
          <button
            type="button"
            className="ev-btn ev-btn--ghost"
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
          >
            {loading && !codeSent ? (
              <Loader size={14} strokeWidth={2} />
            ) : cooldown > 0 ? (
              <span className="ev-cooldown-text">{cooldown}s</span>
            ) : (
              <RotateCcw size={14} strokeWidth={2} />
            )}
            {cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}
          </button>

          <button
            type="button"
            className="ev-btn ev-btn--primary"
            onClick={handleVerify}
            disabled={loading || code.trim().length < 6}
          >
            {loading ? (
              <>
                <Loader size={14} strokeWidth={2} />
                Đang xác minh...
              </>
            ) : (
              'Xác minh'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
