import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthLayout.css';

/* ─────────────────────────────────────────────────────────────────────────────
   AuthLayout — Brand showcase shell

   Renders the left-side brand panel. The card deck (Login / Register forms)
   is rendered by the parent AuthPage component.

   Props:
     activeMode         — 'login' | 'register'  (drives which card is visible)
     onSwitchToLogin    — called when the brand-side "switch to login" action fires
     onSwitchToLogin    — called when the brand-side "switch to register" action fires
     loginForm          — <LoginForm />  element
     registerForm       — <RegisterForm /> element
   ───────────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  'Steam Key chính hãng 100%',
  'Giao key tức thì qua email',
  'Hỗ trợ 24/7',
  'Giá tốt nhất thị trường',
];

export const AuthLayout = ({ activeMode, onSwitchToLogin, onSwitchToRegister, loginForm, registerForm }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => navigate('/');

  const isLogin = activeMode === 'login';

  const loginCardClass = [
    'auth-card',
    'auth-card-login',
    isLogin ? 'auth-card--active' : 'auth-card--inactive',
  ].filter(Boolean).join(' ');

  const registerCardClass = [
    'auth-card',
    'auth-card-register',
    !isLogin ? 'auth-card--active' : 'auth-card--inactive',
  ].filter(Boolean).join(' ');

  return (
    <div className="auth-page">
      {/* ── Animated background ───────────────────────────────────────── */}
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-bg-vignette" aria-hidden="true" />
      <div className="auth-bg-grid" aria-hidden="true" />
      <div className="auth-bg-streak" aria-hidden="true" />
      <div className="auth-bg-streak-2" aria-hidden="true" />
      <div className="auth-bg-geo" aria-hidden="true" />

      {/* ── Shell ───────────────────────────────────────────────────── */}
      <div className="auth-shell">

        {/* ── LEFT: Brand showcase ───────────────────────────────────── */}
        <aside className="auth-brand" aria-label="Thương hiệu">
          <div className="auth-brand-glow" aria-hidden="true" />
          <div className="auth-brand-grid" aria-hidden="true" />

          <div className="auth-brand-content">
            <button
              className="auth-logo-btn"
              onClick={handleLogoClick}
              aria-label="Quay về trang chủ HotWaterGas"
              type="button"
            >
              <div className="auth-logo-icon">
                <img src="/icon.png" alt="HotWaterGas" />
              </div>
              <span className="auth-brand-name">
                HotWater<span className="auth-brand-name-gas">Gas</span>
              </span>
            </button>

            <p className="auth-brand-motto">
              Nền tảng Steam Key chính hãng<br />dành cho game thủ Việt Nam.
            </p>

            <ul className="auth-brand-features" aria-label="Tính năng">
              {FEATURES.map((f) => (
                <li key={f} className="auth-brand-feature">
                  <span className="auth-brand-feature-dot" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── RIGHT: Card deck ───────────────────────────────────────── */}
        <main className="auth-deck">
          {/* Login card — always in DOM */}
          <div className={loginCardClass} aria-hidden={!isLogin}>
            {loginForm}
          </div>

          {/* Register card — always in DOM */}
          <div className={registerCardClass} aria-hidden={isLogin}>
            {registerForm}
          </div>
        </main>
      </div>
    </div>
  );
};
