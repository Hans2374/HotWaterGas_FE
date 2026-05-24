import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const OAUTH_TOAST_KEY = 'hotwatergas.oauth.toast';

/**
 * Stores OAuth success/error message for homepage to display.
 * Uses sessionStorage so the toast survives the redirect.
 */
const setOAuthToast = (type, message) => {
  try {
    sessionStorage.setItem(
      OAUTH_TOAST_KEY,
      JSON.stringify({ type, message, timestamp: Date.now() })
    );
  } catch {
    // sessionStorage unavailable
  }
};

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, isInitializing } = useAuth();

  useEffect(() => {
    const processOAuth = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const tokenFromQuery = params.get('token');
        const roleFromQuery = params.get('role');
        const isNewUser = params.get('isNewUser') === 'true';

        if (!tokenFromQuery) {
          setOAuthToast('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
          navigate('/login', { replace: true });
          return;
        }

        setToken(tokenFromQuery, roleFromQuery || '');

        const welcomeMessage = isNewUser
          ? 'Đăng ký thành công bằng Google. Chào mừng tới HotWaterGas.'
          : 'Đăng nhập thành công bằng Google. Chào mừng trở lại HotWaterGas.';

        setOAuthToast('success', welcomeMessage);

        const redirectPath = roleFromQuery === 'Admin' ? '/admin/dashboard' : '/';
        navigate(redirectPath, { replace: true });
      } catch (err) {
        console.error('[GoogleAuthSuccess] Auth sync failed:', err);
        setOAuthToast('error', 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        navigate('/login', { replace: true });
      }
    };

    if (!isInitializing) {
      processOAuth();
    }
  }, [isInitializing, location, navigate, setToken]);

  return null;
};

export default GoogleAuthSuccess;
