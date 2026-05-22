import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout';
import { LoginForm } from '../LoginForm';
import { RegisterForm } from '../RegisterForm';
import './AuthPage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   AuthPage — Single-page auth shell

   Mounts once per session (or once per browser tab). Both LoginForm and
   RegisterForm are always rendered; only CSS classes change to show/hide
   them. This completely eliminates route-change unmount/remount as a source
   of animation instability.

   Dual-source-of-truth pattern for active mode:

     1. mode prop  — set by the Route (route = source of truth on first mount
                     and on direct URL navigation / refresh)
     2. localMode — React state (source of truth after the component has
                     mounted and the user starts clicking links)

   onMount:  localMode ← mode prop   (preserves mode on direct URL navigation)
   onChange: localMode ← mode prop   (preserves mode on browser back/forward)
   onClick:  navigate('/...')        (triggers re-render via props → localMode)

   The result is that navigating from /login → /register via clicking a link
   does NOT reset the animation because AuthPage never unmounts.
   ───────────────────────────────────────────────────────────────────────────── */
export const AuthPage = ({ mode: modeFromRoute }) => {
  const navigate = useNavigate();

  /* Initialise from the route prop. On direct URL navigation (e.g. refreshing
     at /register) this is the only source of truth. */
  const [activeMode, setActiveMode] = useState(() =>
    modeFromRoute === 'register' ? 'register' : 'login'
  );

  /* Keep local state in sync when the route changes externally (e.g. browser
     back/forward). We use a ref to detect "external" vs "internal" changes:
     if modeFromRoute changed but we are already showing that mode, skip the
     re-render. This prevents a double-trigger when the user navigates via Link
     (navigate() changes URL → React Router re-renders with new prop → we call
     setActiveMode again, which would replay the animation). */
  const pendingModeRef = useRef(null);
  const prevRouteModeRef = useRef(modeFromRoute);
  const isInternalNavigationRef = useRef(false);

  useEffect(() => {
    const incoming = modeFromRoute === 'register' ? 'register' : 'login';

    if (incoming === prevRouteModeRef.current) return;
    prevRouteModeRef.current = incoming;

    /* If an internal navigation is already pending, the Link click handler
       will update activeMode — don't override it here. */
    if (pendingModeRef.current === incoming) {
      pendingModeRef.current = null;
      return;
    }

    setActiveMode(incoming);
  }, [modeFromRoute]);

  /* ── Navigation helpers ──────────────────────────────────────────── */
  const goToLogin = () => {
    isInternalNavigationRef.current = true;
    pendingModeRef.current = 'login';
    setActiveMode('login');
    navigate('/login');
  };

  const goToRegister = () => {
    isInternalNavigationRef.current = true;
    pendingModeRef.current = 'register';
    setActiveMode('register');
    navigate('/register');
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <AuthLayout
      activeMode={activeMode}
      onSwitchToLogin={goToLogin}
      onSwitchToRegister={goToRegister}
      loginForm={<LoginForm />}
      registerForm={<RegisterForm />}
    />
  );
};
