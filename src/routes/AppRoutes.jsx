import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/universal/Login';
import { Register } from '../pages/universal/Register';
import VerifyEmail from '../pages/universal/VerifyEmail';
import { Home } from '../pages/universal/Home';
import { SearchResultsPage } from '../pages/universal/SearchResultsPage';
import { ProductDetailPage } from '../pages/universal/ProductDetailPage';
import { Cart } from '../pages/customer/Cart';
import { WishlistPage } from '../pages/customer/WishlistPage';
import { CheckoutPage } from '../pages/customer/CheckoutPage';
import { CheckoutPaymentHandoff } from '../pages/customer/CheckoutPaymentHandoff';
import PaymentReturnPage from '../pages/customer/PaymentReturnPage';
import PaymentSuccessPage from '../pages/customer/PaymentSuccessPage';
import PaymentCancelPage from '../pages/customer/PaymentCancelPage';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage';
import { AdminProductCreatePage } from '../pages/admin/AdminProductCreatePage';
import { AdminProductEditPage } from '../pages/admin/AdminProductEditPage';
import { AdminProductSteamKeysPage } from '../pages/admin/AdminProductSteamKeysPage';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { AdminTagsPage } from '../pages/admin/AdminTagsPage';
import PurchaseHistoryPage from '../pages/customer/PurchaseHistoryPage';
import PurchaseDetailPage from '../pages/customer/PurchaseDetailPage';
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
    return <Navigate to={isAdmin ? '/admin/products' : '/'} replace />;
  }

  return children;
};

const StorefrontRoute = ({ children }) => {
  const { token, isInitializing, isAdmin } = useAuth();

  if (isInitializing) {
    return <Loader text="Restoring session..." />;
  }

  if (token && isAdmin) {
    return <Navigate to="/admin/products" replace />;
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
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        path="/login"
        element={(
          <PublicRoute>
            <Login />
          </PublicRoute>
        )}
      />
      <Route
        path="/register"
        element={(
          <PublicRoute>
            <Register />
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
          path="products/:slug"
          element={(
            <StorefrontRoute>
              <ProductDetailPage />
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
        <Route index element={<Navigate to="/admin/products" replace />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/create" element={<AdminProductCreatePage />} />
        <Route path="products/:id/edit" element={<AdminProductEditPage />} />
        <Route path="products/:id/keys" element={<AdminProductSteamKeysPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="tags" element={<AdminTagsPage />} />
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
};
