import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMyProfile } from '../../api/authApi';
import { setSessionMessage } from '../../utils/authSessionMessage';

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, isInitializing, isAdmin } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('initializing');

  useEffect(() => {
    const syncAuthState = async () => {
      try {
        // Parse all query params from backend redirect
        const params = new URLSearchParams(location.search);
        const tokenFromQuery = params.get('token');
        const expiresAt = params.get('expiresAt');
        const roleFromQuery = params.get('role');
        const isNewUser = params.get('isNewUser') === 'true';

        if (!tokenFromQuery) {
          throw new Error('No authentication token received from server');
        }

        setStatus('syncing');

        // Store token in auth context
        setToken(tokenFromQuery, roleFromQuery || '');

        // Wait for auth context to update
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Verify auth by fetching profile
        try {
          await getMyProfile();
        } catch (profileError) {
          // Token might be invalid, try refresh
          setStatus('refreshing');
        }

        // Set welcome message
        if (isNewUser) {
          setSessionMessage('Đăng nhập Google thành công! Chào mừng bạn đến với HotWaterGas.');
        } else {
          setSessionMessage('Đăng nhập Google thành công! Chào mừng bạn quay trở lại.');
        }

        // Redirect based on role
        const redirectPath = roleFromQuery === 'Admin' ? '/admin/dashboard' : '/';

        await new Promise((resolve) => setTimeout(resolve, 300));

        navigate(redirectPath, { replace: true });
      } catch (err) {
        console.error('[GoogleAuthSuccess] Auth sync failed:', err);
        setError('Không thể hoàn tất đăng nhập. Vui lòng thử đăng nhập lại.');
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
          {status === 'syncing' && 'Đang đăng nhập với Google.'}
          {status === 'restoring' && 'Đang khôi phục phiên đăng nhập.'}
          {status === 'refreshing' && 'Đang làm mới phiên đăng nhập.'}
          {status === 'initializing' && 'Đang khởi tạo...'}
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
