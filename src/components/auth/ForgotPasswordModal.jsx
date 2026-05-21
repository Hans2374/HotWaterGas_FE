import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader, RotateCcw } from 'lucide-react';
import { requestPasswordReset, verifyPasswordResetCode, resetPassword } from '../../api/authApi';
import './ForgotPasswordModal.css';

// ─────────────────────────────────────────────────────────────────────────────
//  ForgotPasswordModal
//
//  Props:
//    isOpen           — controls visibility (passed by parent)
//    onClose          — called when user clicks close / backdrop
//    defaultEmail     — pre-filled email (optional)
//    onSuccess        — called after password reset succeeds; parent handles logout + redirect
//    logoutCountdown  — if set (seconds), success screen shows countdown and auto-calls
//                       onSuccess when timer reaches 0 (ProfilePage flow).
//                       If absent/undefined, success screen just shows "Đóng" (LoginPage flow).
//
//  Flow: verify → reset → success
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_COOLDOWN = 60;

const ForgotPasswordModal = ({
  isOpen,
  onClose,
  defaultEmail = '',
  onSuccess,
  logoutCountdown
}) => {
  // 'verify' | 'reset' | 'success'
  const [screen, setScreen] = useState('verify');
  const [email, setEmail] = useState(defaultEmail);
  const [resetToken, setResetToken] = useState(null);

  // Verify screen
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Reset screen
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  // Success screen — logout countdown (ProfilePage flow)
  const [logoutTimer, setLogoutTimer] = useState(0);

  // Shared
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // ── Reset all state when modal opens ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setScreen('verify');
    setEmail(defaultEmail);
    setResetToken(null);
    setCode('');
    setCodeSent(false);
    setCooldown(0);
    setNewPassword('');
    setConfirmPassword('');
    setLocalErrors({});
    setApiError('');
    setPwVisible(false);
    setConfirmVisible(false);
    setLogoutTimer(0);
  }, [isOpen, defaultEmail]);

  // ── OTP resend cooldown ticker ──────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Logout countdown ticker ────────────────────────────────────────────
  useEffect(() => {
    if (logoutTimer <= 0) return;
    const t = setTimeout(() => setLogoutTimer((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [logoutTimer]);

  // ── Auto-redirect when countdown hits 0 ───────────────────────────────
  useEffect(() => {
    if (logoutTimer !== 0) return;
    // Only auto-fire if we're on the success screen and countdown was started
    if (screen !== 'success' || logoutCountdown === undefined) return;
    onSuccess?.();
  }, [logoutTimer, screen, logoutCountdown, onSuccess]);

  if (!isOpen) return null;

  const close = () => onClose?.();

  // ── Send / Resend OTP ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!email.trim()) { setApiError('Vui lòng nhập địa chỉ email.'); return; }
    setApiError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setApiError(err?.message || 'Không thể gửi mã. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setCode('');
    setApiError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setApiError(err?.message || 'Không thể gửi lại mã.');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!/^[0-9]{6}$/.test(trimmed)) {
      setApiError('Vui lòng nhập đúng 6 chữ số của mã xác minh.');
      return;
    }
    setApiError('');
    setLoading(true);
    try {
      const res = await verifyPasswordResetCode(email.trim().toLowerCase(), trimmed);
      setResetToken(res.resetToken);
      setScreen('reset');
    } catch (err) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('hết hạn')) {
        setApiError('Mã đã hết hạn. Vui lòng gửi lại mã mới.');
      } else {
        setApiError(msg || 'Mã xác minh không đúng. Vui lòng kiểm tra lại email.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ────────────────────────────────────────────────────────
  const validateReset = () => {
    const errors = {};
    if (!newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu mới.';
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = 'Mật khẩu mới và xác nhận mật khẩu không khớp.';
    }
    return errors;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    const errors = validateReset();
    if (Object.keys(errors).length > 0) { setLocalErrors(errors); return; }
    setLocalErrors({});
    setApiError('');
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), resetToken, newPassword);
      setScreen('success');
      // Start logout countdown if ProfilePage (logoutCountdown is set)
      if (logoutCountdown !== undefined) {
        setLogoutTimer(logoutCountdown);
      }
    } catch (err) {
      setApiError(err?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  //  SCREEN 1 — Verify (email + OTP always visible together)
  // ───────────────────────────────────────────────────────────────────────
  if (screen === 'verify') {
    return (
      <div
        className="fp-modal-overlay"
        onClick={(e) => e.target === e.currentTarget && close()}
        role="presentation"
      >
        <div className="fp-modal" role="dialog" aria-modal="true" aria-labelledby="fp-title">

          <button className="fp-close" onClick={close} aria-label="Đóng">✕</button>

          <div className="fp-header">
            <h2 className="fp-title" id="fp-title">Quên mật khẩu?</h2>
            <p className="fp-subtitle">
              Nhập email đã đăng ký để nhận mã xác minh 6 chữ số.
            </p>
          </div>

          {/* Email field — send button inline */}
          <div className="fp-field">
            <label className="fp-label" htmlFor="fp-email">Email</label>
            <div className="fp-email-row">
              <input
                id="fp-email"
                type="email"
                className="fp-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !codeSent && handleSend()}
                placeholder="your@email.com"
                autoComplete="email"
                disabled={loading}
              />
              <button
                type="button"
                className={`fp-inline-btn${cooldown > 0 ? ' fp-inline-btn--cooldown' : ''}`}
                onClick={cooldown > 0 ? handleResend : handleSend}
                disabled={loading || !email.trim()}
                aria-label={cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi mã OTP'}
              >
                {loading ? (
                  <Loader size={14} strokeWidth={2} />
                ) : cooldown > 0 ? (
                  <span className="fp-cooldown-text">{cooldown}s</span>
                ) : codeSent ? (
                  <RotateCcw size={14} strokeWidth={2} />
                ) : (
                  <span>Gửi mã</span>
                )}
              </button>
            </div>
          </div>

          {/* OTP field — always visible after first send */}
          {codeSent && (
            <div className="fp-field fp-field--fadein">
              <label className="fp-label" htmlFor="fp-otp">Mã OTP</label>
              <input
                id="fp-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="fp-input fp-otp-input"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && code.trim().length === 6 && handleVerify()}
                placeholder="Nhập mã OTP"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
              <span className="fp-field-hint">Nhập 6 chữ số từ email của bạn</span>
            </div>
          )}

          {apiError && <div className="fp-alert fp-alert--error">{apiError}</div>}

          <div className="fp-footer">
            <button type="button" className="fp-btn fp-btn--ghost" onClick={close}>Hủy</button>
            <button
              type="button"
              className="fp-btn fp-btn--primary"
              onClick={handleVerify}
              disabled={loading || !codeSent || code.trim().length < 6}
            >
              {loading ? <><Loader size={14} strokeWidth={2} /> Đang xác minh...</> : 'Xác minh OTP'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  //  SCREEN 2 — Reset Password
  // ───────────────────────────────────────────────────────────────────────
  if (screen === 'reset') {
    return (
      <div
        className="fp-modal-overlay"
        onClick={(e) => e.target === e.currentTarget && close()}
        role="presentation"
      >
        <div className="fp-modal" role="dialog" aria-modal="true" aria-labelledby="fp-title-reset">

          <button className="fp-close" onClick={close} aria-label="Đóng">✕</button>

          <div className="fp-header">
            <h2 className="fp-title" id="fp-title-reset">Đặt lại mật khẩu</h2>
            <p className="fp-subtitle">
              Nhập mật khẩu mới cho tài khoản <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleReset} noValidate>

            {/* New password with eye toggle */}
            <div className="fp-field">
              <label className="fp-label" htmlFor="fp-new-pw">Mật khẩu mới</label>
              <div className="fp-pw-row">
                <input
                  id="fp-new-pw"
                  type={pwVisible ? 'text' : 'password'}
                  className={`fp-input${localErrors.newPassword ? ' fp-input--error' : ''}`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="fp-pw-toggle"
                  onClick={() => setPwVisible((v) => !v)}
                  aria-label={pwVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {pwVisible
                    ? <EyeOff size={16} strokeWidth={1.75} />
                    : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
              {localErrors.newPassword && (
                <span className="fp-field-error">{localErrors.newPassword}</span>
              )}
            </div>

            {/* Confirm password with eye toggle */}
            <div className="fp-field">
              <label className="fp-label" htmlFor="fp-confirm-pw">Nhập lại mật khẩu mới</label>
              <div className="fp-pw-row">
                <input
                  id="fp-confirm-pw"
                  type={confirmVisible ? 'text' : 'password'}
                  className={`fp-input${localErrors.confirmPassword ? ' fp-input--error' : ''}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="fp-pw-toggle"
                  onClick={() => setConfirmVisible((v) => !v)}
                  aria-label={confirmVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {confirmVisible
                    ? <EyeOff size={16} strokeWidth={1.75} />
                    : <Eye size={16} strokeWidth={1.75} />}
                </button>
              </div>
              {localErrors.confirmPassword && (
                <span className="fp-field-error">{localErrors.confirmPassword}</span>
              )}
            </div>

            {apiError && <div className="fp-alert fp-alert--error">{apiError}</div>}

            <div className="fp-footer">
              <button
                type="button"
                className="fp-btn fp-btn--ghost"
                onClick={() => { setScreen('verify'); setApiError(''); }}
              >
                ← Quay lại
              </button>
              <button type="submit" className="fp-btn fp-btn--primary" disabled={loading}>
                {loading
                  ? <><Loader size={14} strokeWidth={2} /> Đang lưu...</>
                  : 'Lưu mật khẩu'}
              </button>
            </div>
          </form>

        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  //  SCREEN 3 — Success
  // ───────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fp-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="presentation"
    >
      <div className="fp-modal fp-modal--success" role="dialog" aria-modal="true">
        <button className="fp-close" onClick={close} aria-label="Đóng">✕</button>
        <div className="fp-header">
          <h2 className="fp-title">Đặt lại mật khẩu thành công</h2>
        </div>
        <div className="fp-success">
          <div className="fp-success-icon">&#10003;</div>
          <p className="fp-success-text">
            Mật khẩu của bạn đã được cập nhật thành công.{' '}
            Bạn sẽ được đăng xuất và chuyển về trang đăng nhập để đăng nhập lại.
          </p>

          {logoutCountdown !== undefined ? (
            /* ── ProfilePage: countdown redirect button ── */
            <button
              className="fp-btn fp-btn--primary fp-btn--full"
              onClick={() => { setLogoutTimer(0); onSuccess?.(); }}
            >
              Đăng nhập lại ({logoutTimer > 0 ? logoutTimer : 0}s)
            </button>
          ) : (
            /* ── LoginPage: simple close button ── */
            <button className="fp-btn fp-btn--primary fp-btn--full" onClick={close}>
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
