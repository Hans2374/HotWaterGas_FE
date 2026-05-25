import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { useAuth } from '../../hooks/useAuth';
import { login } from '../../api/authApi';
import { normalizeLoginResponse } from '../../utils/authResponse';
import { getEmailError, getPasswordError } from '../../utils/validation';
import { consumeSessionMessage } from '../../utils/authSessionMessage';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';

export const LoginForm = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [isFpOpen, setIsFpOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sessionMessage, setSessionMessage] = useState(null);

  useEffect(() => {
    const msg = consumeSessionMessage();
    if (msg) setSessionMessage(msg);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};
    const emailError = getEmailError(formData.email);
    if (emailError) newErrors.email = emailError;
    const passwordError = getPasswordError(formData.password);
    if (passwordError) newErrors.password = passwordError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const response = await login(
        formData.email,
        formData.password,
        formData.rememberMe
      );
      const { accessToken, role } = normalizeLoginResponse(response);
      if (!accessToken) {
        setApiError('Đăng nhập thành công nhưng không nhận được access token.');
        return;
      }

      setToken(accessToken, role);

      if (role === 'Admin') {
        navigate('/admin/products', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      const msg = error?.message || error?.Message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      if (typeof msg === 'string' && msg.toLowerCase().includes('not verified')) {
        try { sessionStorage.setItem('hotwatergas.verify.email', formData.email); } catch (_) {}
        navigate('/verify-email', { state: { email: formData.email }, replace: true });
        return;
      }
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {sessionMessage && (
        <div className="session-message-banner">{sessionMessage}</div>
      )}

      <h2 className="auth-card-title">Đăng nhập</h2>
      <p className="auth-card-subtitle">Chào mừng bạn quay trở lại!</p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {apiError && <div className="error-banner">{apiError}</div>}

        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="email@example.com"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          autoComplete="email"
        />

        <Input
          label="Mật khẩu"
          type="password"
          name="password"
          placeholder="Nhập mật khẩu"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="auth-options-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              className="auth-checkbox-input"
            />
            <span className="auth-checkbox-custom" />
            <span className="auth-checkbox-text">Ghi nhớ đăng nhập</span>
          </label>
        </div>

        <div className="auth-forgot-row">
          <button
            type="button"
            onClick={() => setIsFpOpen(true)}
            className="forgot-password-link"
          >
            Quên mật khẩu?
          </button>
        </div>

        <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>

        <div className="auth-divider">hoặc</div>

        <GoogleAuthButton />
      </form>

      <div className="auth-footer">
        <p>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="auth-link">Đăng ký ngay</Link>
        </p>
      </div>

      <ForgotPasswordModal
        isOpen={isFpOpen}
        onClose={() => setIsFpOpen(false)}
        onSuccess={() => setIsFpOpen(false)}
      />
    </>
  );
};
