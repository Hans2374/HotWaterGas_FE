import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ScrollToTop } from '../../components/common/ScrollToTop';
import { getMyProfile, updateMyProfile, changeMyPassword, verifyEmail, resendVerification } from '../../api/authApi';
import { AUTH_TOKEN_UPDATED_LISTENER } from '../../utils/authEventBridge';
import { setAccessToken } from '../../utils/tokenManager';
import { useAuth } from '../../hooks/useAuth';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';
import EmailVerificationModal from '../../components/auth/EmailVerificationModal';
import './ProfilePage.css';

// ── Password input with show/hide toggle ───────────────────────────────────────

const PasswordInput = ({ id, label, value, onChange, error, placeholder, autoComplete, disabled }) => {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="profile-field">
      <label className="profile-label" htmlFor={id}>{label}</label>
      <div className="profile-password-wrapper">
        <input
          id={id}
          ref={inputRef}
          type={visible ? 'text' : 'password'}
          className={`profile-input${error ? ' profile-input--error' : ''}${disabled ? ' profile-input--disabled' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          className="profile-password-toggle"
          onClick={() => setVisible((v) => !v)}
          tabIndex={disabled ? -1 : 0}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
        </button>
      </div>
      {error && <span className="profile-field-error">{error}</span>}
    </div>
  );
};

// ── Main Profile Page ──────────────────────────────────────────────────────────

export const ProfilePage = () => {
  const { email: authEmail, logout } = useAuth();
  const navigate = useNavigate();

  // Profile section state
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // Password section state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Email verification modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const handleVerificationSuccess = () => {
    setIsEmailVerified(true);
    setShowVerifyModal(false);
    toast.success('Xác minh email thành công');
  };

  // ── Forgot password success — log out and redirect to login ──────────────
  const handleForgotPasswordSuccess = async () => {
    // Modal countdown has finished (or user clicked early); execute logout + redirect
    await logout();
    navigate('/login', { replace: true });
  };

  // Fetch profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        const profile = await getMyProfile();
        setDisplayName(profile.displayName || '');
        setSavedDisplayName(profile.displayName || '');
        setIsEmailVerified(profile.isEmailVerified || false);
      } catch (err) {
        setProfileError('Không thể tải thông tin hồ sơ.');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  // ── Display name update ────────────────────────────────────────────────────

  const hasDisplayNameChanged = displayName.trim() !== savedDisplayName.trim();

  const handleUpdateDisplayName = async () => {
    if (!hasDisplayNameChanged || !displayName.trim()) return;

    try {
      const updated = await updateMyProfile(displayName.trim());
      if (updated.accessToken) {
        // Store the new token so AuthContext can pick it up and decode the updated displayName.
        setAccessToken(updated.accessToken);
        window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATED_LISTENER));
      }
      setSavedDisplayName(displayName.trim());
      toast.success('Cập nhật thông tin thành công.');
    } catch (err) {
      toast.error(err?.message || 'Cập nhật thông tin thất bại.');
    }
  };

  // ── Password change ────────────────────────────────────────────────────────

  const validatePasswordForm = useCallback(() => {
    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Mật khẩu hiện tại là bắt buộc.';
    }
    if (!newPassword) {
      errors.newPassword = 'Mật khẩu mới là bắt buộc.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu mới là bắt buộc.';
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = 'Mật khẩu mới và xác nhận mật khẩu không khớp.';
    }
    return errors;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordSubmitting(true);
    setPasswordErrors({});

    try {
      await changeMyPassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Mật khẩu đã được thay đổi thành công.');
    } catch (err) {
      if (err?.status === 400) {
        toast.error(err?.message || 'Mật khẩu hiện tại không đúng.');
      } else {
        toast.error(err?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      }
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Re-validate confirm password when new password changes
  const handleNewPasswordChange = (val) => {
    setNewPassword(val);
    if (passwordErrors.confirmPassword && val === confirmPassword) {
      setPasswordErrors((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));
    } else if (passwordErrors.confirmPassword) {
      setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
    }
  };

  if (profileLoading) {
    return (
      <div className="profile-loading">
        <Loader size={24} strokeWidth={2} />
        <span>Đang tải thông tin...</span>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-page-title">Hồ sơ tài khoản</h1>
      </div>

      <div className="profile-grid">
        {/* ── Account Information Card ─────────────────────────────────── */}
        <section className="profile-card" aria-labelledby="section-info">
          <h2 className="profile-card-title" id="section-info">
            Thông tin tài khoản
          </h2>

          {profileError && (
            <p className="profile-card-error">{profileError}</p>
          )}

          <div className="profile-field">
            <label className="profile-label" htmlFor="email">Email</label>
            <div className="profile-email-row">
              <input
                id="email"
                type="email"
                className="profile-input profile-input--readonly"
                value={authEmail || ''}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
              {isEmailVerified ? (
                <div className="profile-verified-badge">
                  <CheckCircle size={16} strokeWidth={2} />
                  <span>Đã xác minh</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="profile-btn profile-btn--warning profile-btn--sm"
                  onClick={() => setShowVerifyModal(true)}
                >
                  <AlertCircle size={14} strokeWidth={2} />
                  Xác minh email
                </button>
              )}
            </div>
          </div>

          <div className="profile-field">
            <label className="profile-label" htmlFor="display-name">Tên hiển thị</label>
            <div className="profile-display-name-row">
              <input
                id="display-name"
                type="text"
                className="profile-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                placeholder="Tên hiển thị của bạn"
              />
              <button
                type="button"
                className="profile-btn profile-btn--primary profile-btn--sm"
                onClick={handleUpdateDisplayName}
                disabled={!hasDisplayNameChanged || !displayName.trim()}
              >
                Lưu
              </button>
            </div>
            <span className="profile-field-hint">Đây là tên hiển thị trên đơn hàng và đánh giá của bạn.</span>
          </div>
        </section>

        {/* ── Change Password Card ─────────────────────────────────────── */}
        <section className="profile-card" aria-labelledby="section-password">
          <h2 className="profile-card-title" id="section-password">
            Đổi mật khẩu
          </h2>

          <form onSubmit={handleChangePassword} noValidate>
            <PasswordInput
              id="current-password"
              label="Mật khẩu hiện tại"
              value={currentPassword}
              onChange={setCurrentPassword}
              error={passwordErrors.currentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              autoComplete="current-password"
            />

            <PasswordInput
              id="new-password"
              label="Mật khẩu mới"
              value={newPassword}
              onChange={handleNewPasswordChange}
              error={passwordErrors.newPassword}
              placeholder="Ít nhất 8 ký tự"
              autoComplete="new-password"
            />

            <PasswordInput
              id="confirm-password"
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(val) => {
                setConfirmPassword(val);
                if (passwordErrors.confirmPassword) {
                  setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              error={passwordErrors.confirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
            />

            <div className="profile-password-footer">
              <button
                type="button"
                className="profile-btn-link"
                onClick={() => setShowForgotModal(true)}
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              className="profile-btn profile-btn--primary profile-btn--full"
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? (
                <span className="profile-btn-loading">
                  <Loader size={16} strokeWidth={2} />
                  Đang xử lý...
                </span>
              ) : 'Đổi mật khẩu'}
            </button>
          </form>
        </section>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        defaultEmail={authEmail || ''}
        onSuccess={handleForgotPasswordSuccess}
        logoutCountdown={5}
      />

      <EmailVerificationModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        email={authEmail || ''}
        onSuccess={handleVerificationSuccess}
      />

      <ScrollToTop />
    </div>
  );
};
