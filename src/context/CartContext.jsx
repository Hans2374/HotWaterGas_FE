import React, { createContext, useCallback, useEffect, useState } from 'react';
import {
  getMyCart,
  addToCart as addToCartApi,
  removeFromCart as removeFromCartApi,
  updateCartItemQuantity as updateCartItemQuantityApi
} from '../api/cartApi';
import { useAuth } from '../hooks/useAuth';

export const CartContext = createContext();

const emptyCart = {
  cartId: '',
  items: [],
  subtotal: 0,
  totalAmount: 0
};

const normalizeCartItem = (item) => ({
  cartItemId: item?.cartItemId || item?.CartItemId || '',
  productId: item?.productId || item?.ProductId || '',
  productName: item?.productName || item?.ProductName || '',
  productSlug: item?.productSlug || item?.ProductSlug || item?.slug || item?.Slug || '',
  productImageUrl: item?.productImageUrl || item?.ProductImageUrl || item?.productImage || item?.ProductImage || '',
  finalPrice: item?.finalPrice ?? item?.FinalPrice ?? item?.discountPrice ?? item?.DiscountPrice ?? item?.unitPrice ?? item?.UnitPrice ?? 0,
  quantity: item?.quantity ?? item?.Quantity ?? 0,
  subtotal: item?.subtotal ?? item?.Subtotal ?? 0,
  inStock: item?.inStock ?? item?.InStock ?? true
});

const normalizeCart = (payload) => ({
  cartId: payload?.cartId || payload?.CartId || '',
  items: (payload?.items || payload?.Items || []).map(normalizeCartItem),
  subtotal: payload?.subtotal ?? payload?.Subtotal ?? payload?.totalAmount ?? payload?.TotalAmount ?? 0,
  totalAmount: payload?.totalAmount ?? payload?.TotalAmount ?? 0
});

export const CartProvider = ({ children }) => {
  const { token, isLoading: authLoading, isAdmin, userId } = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshCart = useCallback(async () => {
    // Only hydrate when we have an authenticated non-admin user
    if (!token || isAdmin) {
      setCart(emptyCart);
      return emptyCart;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getMyCart();
      const normalized = normalizeCart(response);
      setCart(normalized);
      return normalized;
    } catch (apiError) {
      // On unauthorized, clear cart
      if (apiError.status === 401) {
        setCart(emptyCart);
      }

      setError(apiError.message || 'Failed to load cart.');
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [token, isAdmin]);

  // Ensure cart state is cleared immediately on any auth identity change
  // and only hydrate after auth has resolved and user is a customer
  useEffect(() => {
    // Clear in-memory cart immediately to avoid leaking previous user's data
    setCart(emptyCart);
    setError('');

    // If auth is unresolved, wait until resolved
    if (authLoading) {
      return;
    }

    // Do not hydrate for admin or unauthenticated users
    if (!token || isAdmin) {
      setIsLoading(false);
      return;
    }

    // Hydrate for the currently authenticated customer
    refreshCart().catch(() => undefined);
  }, [token, authLoading, isAdmin, userId, refreshCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    const response = await addToCartApi(productId, quantity);
    const normalized = normalizeCart(response);
    setCart(normalized);
    return normalized;
  }, []);

  const updateCartItemQuantity = useCallback(async (productId, quantity) => {
    // Call the API to update quantity, then refresh the full cart.
    // NOTE: updateCartItemQuantityApi returns a CartItemResponse (single item),
    // NOT a CartResponse. Normalizing it as a full cart produces { items: [] }
    // which would clear the cart. Using refreshCart() instead ensures the
    // cart context is always set with the complete, authoritative cart state.
    await updateCartItemQuantityApi(productId, quantity);
    return refreshCart();
  }, [refreshCart]);

  const removeFromCart = useCallback(async (productId) => {
    await removeFromCartApi(productId);
    return refreshCart();
  }, [refreshCart]);

  const isProductInCart = useCallback((productId) => {
    return cart.items.some((item) => item.productId === productId);
  }, [cart.items]);

  const getCartItemByProductId = useCallback((productId) => {
    return cart.items.find((item) => item.productId === productId) || null;
  }, [cart.items]);

  const value = {
    cart,
    isLoading,
    error,
    refreshCart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    isProductInCart,
    getCartItemByProductId
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
