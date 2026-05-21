import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthLayout.css';

export const AuthLayout = ({ activeCard, loginForm, registerForm }) => {
  const navigate = useNavigate();
  const prevCardRef = useRef(activeCard);
  // Track whether we've completed the initial mount animation so we only
  // apply the one-shot card-appear-login keyframe once.
  const didInitialMountRef = useRef(false);

  // ── Animation state ────────────────────────────────────────────────────────
  //   exiting  — the old card (sliding out)
  //   entering — the new card (sliding in)
  //   enterDone — the entering card has finished animating in
  const [exiting, setExiting] = useState(null);
  const [entering, setEntering] = useState(null);
  const [enterDone, setEnterDone] = useState(null);

  useEffect(() => {
    if (activeCard === prevCardRef.current) return;

    const prevCard = prevCardRef.current;
    const nextCard = activeCard;

    // Fire both animations simultaneously so the two cards cross-fade.
    setEntering(nextCard);
    setExiting(prevCard);

    // Clear enterDone so the entering card re-enters the enter animation
    // even if it was the same card visiting again (e.g. navigating back).
    setEnterDone(null);

    const timer = setTimeout(() => {
      setExiting(null);
      setEntering(null);
      setEnterDone(nextCard); // commit: card has landed in its resting state
      prevCardRef.current = activeCard;

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[Auth.Card] animation complete', {
          pathname: window.location.pathname,
          activeCard,
          enterDone: nextCard
        });
      }
    }, 450); // must exceed CSS animation duration (400ms)

    return () => clearTimeout(timer);
  }, [activeCard]);

  // Mark initial mount as done after the first animation cycle.
  useEffect(() => {
    if (didInitialMountRef.current) return;
    didInitialMountRef.current = true;
    // Login card is the default, so mark it done immediately on mount.
    setEnterDone('login');
  }, []);

  const handleLogoClick = () => navigate('/');

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[Auth.Card.Render]', {
      pathname: window.location.pathname,
      activeCard,
      exiting,
      entering,
      enterDone
    });
  }

  // ── Class builders ──────────────────────────────────────────────────────
  //
  // Priority order (highest wins):
  //   1. --exit          → card is sliding out (z1, fading, animation running)
  //   2. --enter         → card is sliding in (z2, appearing, animation running)
  //   3. --enter-done    → card has landed after animation (z2, visible)
  //   4. --initial       → login card's one-shot mount animation
  //   5. --active        → card is the current target when no animation is running
  //   6. --hidden        → inactive card at rest (z1, invisible, pointer-events none)
  //
  const loginClass = [
    'auth-card',
    'auth-card-login',
    exiting === 'login' ? 'auth-card--exit' : '',
    entering === 'login' ? 'auth-card--enter' : '',
    enterDone === 'login' ? 'auth-card--enter-done' : '',
    !didInitialMountRef.current ? 'auth-card--initial' : '',
    activeCard === 'login' && !exiting && !entering ? 'auth-card--active' : '',
    activeCard !== 'login' && !exiting && !entering ? 'auth-card--hidden' : '',
  ].filter(Boolean).join(' ');

  const registerClass = [
    'auth-card',
    'auth-card-register',
    exiting === 'register' ? 'auth-card--exit' : '',
    entering === 'register' ? 'auth-card--enter' : '',
    enterDone === 'register' ? 'auth-card--enter-done' : '',
    activeCard === 'register' && !exiting && !entering ? 'auth-card--active' : '',
    activeCard !== 'register' && !exiting && !entering ? 'auth-card--hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="auth-page">
      {/* ── Animated background ───────────────────────────────────────── */}
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-bg-grid" aria-hidden="true" />
      <div className="auth-bg-streak" aria-hidden="true" />

      {/* ── Shell ────────────────────────────────────────────────────── */}
      <div className="auth-shell">

        {/* ── LEFT: Brand showcase ─────────────────────────────────────── */}
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
              {[
                'Steam Key chính hãng 100%',
                'Giao key tức thì qua email',
                'Hỗ trợ 24/7',
                'Giá tốt nhất thị trường',
              ].map((f) => (
                <li key={f} className="auth-brand-feature">
                  <span className="auth-brand-feature-dot" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── RIGHT: Card deck ─────────────────────────────────────────── */}
        <main className="auth-deck">

          {/* Login card */}
          <div className={loginClass} aria-hidden={activeCard !== 'login'}>
            {loginForm}
          </div>

          {/* Register card */}
          <div className={registerClass} aria-hidden={activeCard !== 'register'}>
            {registerForm}
          </div>

        </main>
      </div>
    </div>
  );
};
