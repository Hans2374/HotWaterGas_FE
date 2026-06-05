import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from '../pages/universal/AuthPage/AuthPage';
import VerifyEmail from '../pages/universal/VerifyEmail';
import GoogleAuthSuccess from '../pages/universal/GoogleAuthSuccess';
import GoogleAuthError from '../pages/universal/GoogleAuthError';
import { Home } from '../pages/universal/Home';
import { SearchResultsPage } from '../pages/universal/SearchResultsPage';
import { CategoryPage } from '../pages/universal/CategoryPage';
import { ProductDetailPage } from '../pages/universal/ProductDetailPage';
import { PublisherPage } from '../pages/universal/PublisherPage';
import { DeveloperPage } from '../pages/universal/DeveloperPage';
import { PublisherDetailPage } from '../pages/universal/PublisherDetailPage';
import { DeveloperDetailPage } from '../pages/universal/DeveloperDetailPage';
import { Cart } from '../pages/customer/Cart';
import { WishlistPage } from '../pages/customer/WishlistPage';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { CheckoutPaymentHandoff } from '../pages/customer/CheckoutPaymentHandoff';
import PaymentReturnPage from '../pages/customer/PaymentReturnPage';
import PaymentSuccessPage from '../pages/customer/PaymentSuccessPage';
import PaymentCancelPage from '../pages/customer/PaymentCancelPage';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminProductCreatePage } from '../pages/admin/AdminProductCreatePage';
import { AdminProductEditPage } from '../pages/admin/AdminProductEditPage';
import { AdminProductSteamKeysPage } from '../pages/admin/AdminProductSteamKeysPage';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { AdminTagsPage } from '../pages/admin/AdminTagsPage';
import { AdminPublishersPage } from '../pages/admin/AdminPublishersPage';
import { AdminDevelopersPage } from '../pages/admin/AdminDevelopersPage';
import { AdminOrderDetailPage } from '../pages/admin/AdminOrderDetailPage';
import PurchaseHistoryPage from '../pages/customer/PurchaseHistoryPage';
import PurchaseDetailPage from '../pages/customer/PurchaseDetailPage';
import { ProfilePage } from '../pages/customer/ProfilePage';
import { Loader } from '../components/common/Loader';
import { AdminLayout } from '../components/layout/AdminLayout';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';

const AccessDenied = () => (
  <div style={{ padding: '24px', textAlign: 'center' }}>
    <h2>Access Denied</h2>
    <p>You do not have permission to access this page.</p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { token, isInitializing } = useAuth();

  if (isInitializing) {
    return <Loader text="Restoring session..." />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { token, isInitializing, isAdmin } = useAuth();

  if (isInitializing) {
    return <Loader text="Restoring session..." />;
  }

  if (token) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/'} replace />;
  }

  return children;
};

const StorefrontRoute = ({ children }) => {
  const { token, isInitializing, isAdmin } = useAuth();

  if (isInitializing) {
    return <Loader text="Restoring session..." />;
  }

  if (token && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

const CustomerRoute = ({ children }) => {
  const { token, isInitializing, isAdmin } = useAuth();

  if (isInitializing) {
    return <Loader text="Restoring session..." />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <AccessDenied />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { token, isInitializing, isAdmin } = useAuth();

  if (isInitializing) {
    return <Loader text="Restoring session..." />;
  }

  if (!token) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[Auth.RouteGuard] role= authenticated=false reason=no_token');
    }
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[Auth.RouteGuard] role= authenticated=true reason=not_admin');
    }
    return <AccessDenied />;
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[Auth.RouteGuard] role=Admin authenticated=true');
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public auth routes — both render the same AuthPage with different mode */}
      <Route
        path="/login"
        element={(
          <PublicRoute>
            <AuthPage mode="login" />
          </PublicRoute>
        )}
      />
      <Route
        path="/register"
        element={(
          <PublicRoute>
            <AuthPage mode="register" />
          </PublicRoute>
        )}
      />
      <Route
        path="/verify-email"
        element={(
          <PublicRoute>
            <VerifyEmail />
          </PublicRoute>
        )}
      />

      {/* Google OAuth callback routes — no auth guard needed */}
      <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
      <Route path="/auth/google/error" element={<GoogleAuthError />} />

      {/* Customer routes wrapped in MainLayout */}
      <Route
        path="/"
        element={<MainLayout />}
      >
        <Route index element={
          <StorefrontRoute>
            <Home />
          </StorefrontRoute>
        } />
        <Route
          path="products/search"
          element={(
            <StorefrontRoute>
              <SearchResultsPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="categories"
          element={(
            <StorefrontRoute>
              <CategoryPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="products/:slug"
          element={(
            <StorefrontRoute>
              <ProductDetailPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="publishers"
          element={(
            <StorefrontRoute>
              <PublisherPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="publishers/:id"
          element={(
            <StorefrontRoute>
              <PublisherDetailPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="developers"
          element={(
            <StorefrontRoute>
              <DeveloperPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="developers/:id"
          element={(
            <StorefrontRoute>
              <DeveloperDetailPage />
            </StorefrontRoute>
          )}
        />
        <Route
          path="cart"
          element={(
            <CustomerRoute>
              <Cart />
            </CustomerRoute>
          )}
        />
        <Route
          path="wishlist"
          element={(
            <CustomerRoute>
              <WishlistPage />
            </CustomerRoute>
          )}
        />
        <Route
          path="checkout"
          element={(
            <CustomerRoute>
              <CheckoutPage />
            </CustomerRoute>
          )}
        />
        <Route
          path="checkout/payment"
          element={(
            <CustomerRoute>
              <CheckoutPaymentHandoff />
            </CustomerRoute>
          )}
        />
        <Route
          path="account/orders"
          element={(
            <CustomerRoute>
              <PurchaseHistoryPage />
            </CustomerRoute>
          )}
        />
        <Route
          path="account/orders/:orderId"
          element={(
            <CustomerRoute>
              <PurchaseDetailPage />
            </CustomerRoute>
          )}
        />
        <Route
          path="account/profile"
          element={(
            <CustomerRoute>
              <ProfilePage />
            </CustomerRoute>
          )}
        />
      </Route>

      {/* Public payment routes (no layout needed) */}
      <Route
        path="/purchase/success"
        element={<PaymentSuccessPage />}
      />
      <Route
        path="/purchase/cancel"
        element={<PaymentCancelPage />}
      />
      <Route
        path="/checkout/payment-success"
        element={<PaymentSuccessPage />}
      />
      <Route
        path="/checkout/payment-cancel"
        element={<PaymentCancelPage />}
      />
      <Route
        path="/payment/return"
        element={<PaymentReturnPage />}
      />

      {/* Admin routes - nested under AdminLayout */}
      <Route
        path="/admin"
        element={(
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        )}
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/create" element={<AdminProductCreatePage />} />
        <Route path="products/:id/edit" element={<AdminProductEditPage />} />
        <Route path="products/:id/keys" element={<AdminProductSteamKeysPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="tags" element={<AdminTagsPage />} />
        <Route path="publishers" element={<AdminPublishersPage />} />
        <Route path="developers" element={<AdminDevelopersPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
};
