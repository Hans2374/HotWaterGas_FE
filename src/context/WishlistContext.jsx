import React, { createContext, useCallback, useEffect, useState } from 'react';
import {
  getWishlist,
  addToWishlist as addToWishlistApi,
  removeFromWishlist as removeFromWishlistApi
} from '../api/wishlistApi';
import { useAuth } from '../hooks/useAuth';

export const WishlistContext = createContext();

const emptyWishlist = {
  items: [],
  productIds: new Set()
};

const normalizeWishlistItem = (item) => ({
  productId: item?.productId || item?.ProductId || '',
  productName: item?.productName || item?.ProductName || '',
  productSlug: item?.productSlug || item?.ProductSlug || '',
  headerImageUrl: item?.headerImageUrl || item?.HeaderImageUrl || '',
  price: item?.price ?? item?.Price ?? 0,
  discountPercentage: item?.discountPercentage ?? item?.DiscountPercentage ?? 0,
  discountPrice: item?.discountPrice ?? item?.DiscountPrice ?? item?.finalPrice ?? item?.FinalPrice ?? null,
  hasDiscount: item?.hasDiscount ?? item?.HasDiscount ?? false,
  isInStock: item?.isInStock ?? item?.IsInStock ?? false,
  addedAt: item?.addedAt || item?.AddedAt || new Date().toISOString()
});

const normalizeWishlist = (payload) => {
  const items = (payload?.items || payload?.Items || []).map(normalizeWishlistItem);
  const productIds = new Set(items.map((item) => item.productId));
  return { items, productIds };
};

export const WishlistProvider = ({ children }) => {
  const { token, isAdmin } = useAuth();
  const [wishlist, setWishlist] = useState(emptyWishlist);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Skip loading wishlist for admin users
  const shouldLoadWishlist = token && !isAdmin;

  const refreshWishlist = useCallback(async () => {
    if (!shouldLoadWishlist) {
      setWishlist(emptyWishlist);
      return emptyWishlist;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getWishlist();
      const normalized = normalizeWishlist(response);
      setWishlist(normalized);
      return normalized;
    } catch (apiError) {
      if (apiError.status === 401) {
        setWishlist(emptyWishlist);
      }

      setError(apiError.message || 'Failed to load wishlist.');
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, [shouldLoadWishlist]);

  useEffect(() => {
    if (shouldLoadWishlist) {
      refreshWishlist().catch(() => undefined);
    } else {
      setWishlist(emptyWishlist);
      setError('');
    }
  }, [shouldLoadWishlist, refreshWishlist]);

  const addToWishlist = useCallback(
    async (productId) => {
      // Optimistic update
      setWishlist((prev) => {
        if (prev.productIds.has(productId)) {
          return prev; // Already in wishlist
        }

        const newProductIds = new Set(prev.productIds);
        newProductIds.add(productId);
        return { ...prev, productIds: newProductIds };
      });

      try {
        await addToWishlistApi(productId);
        // Refresh to get full item data
        await refreshWishlist();
      } catch (apiError) {
        // Rollback optimistic update
        setWishlist((prev) => {
          const newProductIds = new Set(prev.productIds);
          newProductIds.delete(productId);
          return { ...prev, productIds: newProductIds };
        });

        throw apiError;
      }
    },
    [refreshWishlist]
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      // Optimistic update
      const prevWishlist = wishlist;
      setWishlist((prev) => {
        const newProductIds = new Set(prev.productIds);
        newProductIds.delete(productId);
        return {
          ...prev,
          items: prev.items.filter((item) => item.productId !== productId),
          productIds: newProductIds
        };
      });

      try {
        await removeFromWishlistApi(productId);
      } catch (apiError) {
        // Rollback optimistic update
        setWishlist(prevWishlist);
        throw apiError;
      }
    },
    [wishlist]
  );

  const isWishlisted = useCallback((productId) => {
    return wishlist.productIds.has(productId);
  }, [wishlist.productIds]);

  const value = {
    wishlist: wishlist.items,
    isLoading,
    error,
    refreshWishlist,
    addToWishlist,
    removeFromWishlist,
    isWishlisted
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
