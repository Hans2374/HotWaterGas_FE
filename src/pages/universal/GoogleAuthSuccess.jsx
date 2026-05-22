import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile } from '../../api/authApi';
import { setSessionMessage } from '../../utils/authSessionMessage';

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, isInitializing } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('initializing');

  useEffect(() => {
    const syncAuthState = async () => {
      try {
        // Check if token was passed in query string
        const params = new URLSearchParams(location.search);
        const tokenFromQuery = params.get('token');

        if (tokenFromQuery) {
          // Case A: Backend returns token in query string
          setStatus('syncing');
          setToken(tokenFromQuery);

          // Small delay to let AuthContext update
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          // Case B: Token should already be in localStorage (set by refresh cookie)
          // Wait for AuthContext session restoration
          setStatus('restoring');
        }

        // Verify auth state by fetching profile
        try {
          await getMyProfile();
        } catch (profileError) {
          // If profile fetch fails, token might be missing
          if (tokenFromQuery) {
            // We had a token but profile failed - try refresh
            setStatus('refreshing');
          } else {
            throw profileError;
          }
        }

        // Store success message for display after redirect
        setSessionMessage('Đăng nhập Google thành công! Chào mừng bạn quay trở lại.');

        // Get previous route from session storage or default to home
        const previousRoute = sessionStorage.getItem('hotwatergas.previousRoute') || '/';
        sessionStorage.removeItem('hotwatergas.previousRoute');

        // Small delay for smooth UX
        await new Promise((resolve) => setTimeout(resolve, 300));

        navigate(previousRoute, { replace: true });
      } catch (err) {
        setError('Không thể khôi phục phiên đăng nhập. Vui lòng thử đăng nhập lại.');
        setStatus('error');
      }
    };

    if (!isInitializing) {
      syncAuthState();
    }
  }, [isInitializing, location, navigate, setToken]);

  if (status === 'error') {
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
          <h2>Đăng nhập không thành công</h2>
          <p>{error}</p>
          <button
            className="btn-google-callback-action"
            onClick={() => navigate('/login', { replace: true })}
          >
            Quay lại trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="google-auth-callback">
      <div className="google-auth-callback-card">
        <div className="google-auth-icon loading">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2>Đang xác thực...</h2>
        <p>
          {status === 'syncing' && 'Đang đồng bộ phiên đăng nhập Google của bạn.'}
          {status === 'restoring' && 'Đang khôi phục phiên đăng nhập của bạn.'}
          {status === 'refreshing' && 'Đang làm mới phiên đăng nhập.'}
          {status === 'initializing' && 'Đang khởi tạo...'}
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
