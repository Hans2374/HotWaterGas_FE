import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleAuthError = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('Đã xảy ra lỗi trong quá trình đăng nhập Google.');
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    // Extract error info from query params (sanitized)
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setErrorCode(error);

      // Map common OAuth errors to user-friendly messages
      const errorMessages = {
        'access_denied': 'Bạn đã từ chối quyền truy cập tài khoản Google.',
        'cancelled': 'Đăng nhập Google đã bị hủy.',
        'oauth_cancelled': 'Đăng nhập Google đã bị hủy.',
        'state_mismatch': 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',
        'server_error': 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
        'invalid_request': 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
        'unverified_email': 'Tài khoản Google chưa được xác minh.',
        'disabled_user': 'Tài khoản đã bị vô hiệu hóa.',
      };

      setErrorMessage(
        errorMessages[error] ||
        errorDescription ||
        'Đã xảy ra lỗi trong quá trình đăng nhập Google.'
      );
    }
  }, [searchParams]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="google-auth-callback">
      <div className="google-auth-callback-card">
        <div className="google-auth-icon error">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2>Đăng nhập Google thất bại</h2>
        <p className="google-auth-error-message">{errorMessage}</p>
        <div className="google-auth-error-actions">
          <button
            className="btn-google-callback-action primary"
            onClick={handleRetry}
          >
            Quay lại trang đăng nhập
          </button>
        </div>
        {errorCode && (
          <p className="google-auth-error-code">
            Mã lỗi: {errorCode}
          </p>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthError;
