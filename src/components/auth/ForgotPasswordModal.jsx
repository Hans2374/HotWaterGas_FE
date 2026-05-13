import React, { useState, useEffect } from 'react';
import { requestPasswordReset, verifyPasswordResetCode, resetPassword } from '../../api/authApi';
import '../../pages/universal/SearchResultsPage.css';
import './ForgotPasswordModal.css';

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('email'); // email, reset, success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep('email');
      setEmail('');
      setCode('');
      setCodeSent(false);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setResetToken(null);
      setResendCooldown(0);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const close = () => onClose && onClose();

  const sendCode = async () => {
    setError('');
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setCodeSent(true);
      setResendCooldown(60);
    } catch (e) {
      setError(e.message || 'Failed to send code');
    } finally { setLoading(false); }
  };

  const verifyCode = async () => {
    setError('');
    if (!/^[0-9]{6}$/.test(code)) { setError('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await verifyPasswordResetCode(email, code);
      setResetToken(res.resetToken);
      setStep('reset');
      setCodeSent(false);
    } catch (e) {
      setError(e.message || 'Invalid or expired code');
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    setError('');
    if (!newPassword) { setError('Password required'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await resetPassword(email, resetToken, newPassword);
      setStep('success');
    } catch (e) {
      setError(e.message || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  return (
    <div className="fp-modal-overlay" role="presentation">
      <div className="fp-modal" role="dialog" aria-modal="true">
        <button className="fp-close" onClick={close}>✕</button>

        {step === 'email' && (
          <div>
            <h3>Forgot Password</h3>
            <p>{codeSent ? 'Enter the 6-digit code sent to your email' : 'Enter your email to receive a verification code'}</p>
            
            <input
              className="fp-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              disabled={codeSent}
            />
            
            {codeSent && (
              <input
                className="fp-input"
                type="text"
                placeholder="123456"
                value={code}
                onChange={e=>setCode(e.target.value)}
                maxLength={6}
                autoFocus
              />
            )}
            
            {error && <div className="fp-error">{error}</div>}
            
            <div className="fp-actions">
              <button className="btn" onClick={close}>Cancel</button>
              {!codeSent ? (
                <button className="btn btn-primary" onClick={sendCode} disabled={loading}>
                  {loading ? 'Sending…' : 'Send Code'}
                </button>
              ) : (
                <>
                  <button className="btn" onClick={() => { setCodeSent(false); setCode(''); setError(''); }} disabled={resendCooldown > 0 || loading}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                  <button className="btn btn-primary" onClick={verifyCode} disabled={loading || !code}>
                    {loading ? 'Verifying…' : 'Verify Code'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'reset' && (
          <div>
            <h3>Reset Password</h3>
            <p>Enter your new password</p>
            <input className="fp-input" type="password" placeholder="New password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
            <input className="fp-input" type="password" placeholder="Confirm password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
            {error && <div className="fp-error">{error}</div>}
            <div className="fp-actions">
              <button className="btn" onClick={() => setStep('email')}>Back</button>
              <button className="btn btn-primary" onClick={submitReset} disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div>
            <h3>Password Reset Successful</h3>
            <p>Password reset successful. Please log in with your new password.</p>
            <div className="fp-actions">
              <button className="btn btn-primary" onClick={close}>Back to Login</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
