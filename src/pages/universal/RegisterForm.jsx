import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { register } from '../../api/authApi';
import {
  getEmailError,
  getPasswordError,
  getConfirmPasswordError
} from '../../utils/validation';

export const RegisterForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

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
      try {
        sessionStorage.setItem('hotwatergas.verify.email', formData.email);
      } catch (_) {}
      navigate('/verify-email', { replace: true, state: { email: formData.email, message: response?.message } });
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
        type="password"
        name="password"
        placeholder="Ít nhất 8 ký tự"
        value={formData.password}
        onChange={handleInputChange}
        error={errors.password}
        autoComplete="new-password"
      />

      <Input
        label="Xác nhận mật khẩu"
        type="password"
        name="confirmPassword"
        placeholder="Nhập lại mật khẩu"
        value={formData.confirmPassword}
        onChange={handleInputChange}
        error={errors.confirmPassword}
        autoComplete="new-password"
      />

      <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
        {isLoading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
      </Button>
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
