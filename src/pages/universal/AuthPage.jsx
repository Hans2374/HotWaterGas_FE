// ── DEPRECATED ───────────────────────────────────────────────────────────────
//
// AuthPage has been superseded by the Login.jsx and Register.jsx page
// wrappers. Both pages now render AuthLayout directly with the appropriate
// activeCard prop ("login" or "register"). This file is kept only as a
// placeholder to prevent import errors if anything still references it.
// All actual auth UI now lives in:
//   - src/pages/universal/Login.jsx        → AuthLayout + activeCard="login"
//   - src/pages/universal/Register.jsx    → AuthLayout + activeCard="register"
//   - src/components/layout/AuthLayout.jsx → the shared shell component
//
// This file will be removed in a future cleanup pass.
// ────────────────────────────────────────────────────────────────────────────

// This component intentionally renders nothing to avoid stale UI.
export const AuthPage = () => null;
export default AuthPage;
