import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { register } from '../../api/authApi';
import {
  getEmailError,
  getPasswordError,
  getConfirmPasswordError
} from '../../utils/validation';

export const RegisterForm = ({ onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};
    const emailError = getEmailError(formData.email);
    if (emailError) newErrors.email = emailError;
    const passwordError = getPasswordError(formData.password);
    if (passwordError) newErrors.password = passwordError;
    const confirmPasswordError = getConfirmPasswordError(
      formData.password,
      formData.confirmPassword
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const response = await register(formData.email, formData.password);
      onRegisterSuccess?.(formData.email);
    } catch (error) {
      const msg = error?.message || error?.Message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="auth-card-title">Tạo tài khoản</h2>
      <p className="auth-card-subtitle">Đăng ký để trải nghiệm ngay hôm nay!</p>

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
        type={showPassword ? 'text' : 'password'}
        name="password"
        placeholder="Ít nhất 8 ký tự"
        value={formData.password}
        onChange={handleInputChange}
        error={errors.password}
        autoComplete="new-password"
        rightIcon={
          <button
            type="button"
            className="input-icon-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={16} strokeWidth={1.75} />
            ) : (
              <Eye size={16} strokeWidth={1.75} />
            )}
          </button>
        }
      />

      <Input
        label="Xác nhận mật khẩu"
        type={showConfirmPassword ? 'text' : 'password'}
        name="confirmPassword"
        placeholder="Nhập lại mật khẩu"
        value={formData.confirmPassword}
        onChange={handleInputChange}
        error={errors.confirmPassword}
        autoComplete="new-password"
        rightIcon={
          <button
            type="button"
            className="input-icon-btn"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff size={16} strokeWidth={1.75} />
            ) : (
              <Eye size={16} strokeWidth={1.75} />
            )}
          </button>
        }
      />

      <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
        {isLoading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
      </Button>

      <div className="auth-divider">hoặc</div>

      <GoogleAuthButton />
      </form>

      <div className="auth-footer">
        <p>
          Đã có tài khoản?{' '}
          <Link to="/login" className="auth-link">Đăng nhập ngay</Link>
        </p>
      </div>
    </>
  );
};
