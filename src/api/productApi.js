import axiosClient from './axiosClient';

export const getProducts = async (
  page = 1,
  pageSize = 10,
  categoryId = null,
  search = null,
  sortBy = null,
  sortDirection = null,
  filters = {}
) => {
  try {
    const params = { page, pageSize };
    if (categoryId) {
      params.categoryId = categoryId;
    }
    if (search) {
      params.search = search.trim();
    }
    if (sortBy) {
      params.sortBy = sortBy;
    }
    if (sortDirection) {
      params.sortDirection = sortDirection;
    }

    if (filters?.minPrice !== undefined && filters?.minPrice !== null && filters?.minPrice !== '') {
      params.minPrice = Number(filters.minPrice);
    }

    if (filters?.maxPrice !== undefined && filters?.maxPrice !== null && filters?.maxPrice !== '') {
      params.maxPrice = Number(filters.maxPrice);
    }

    if (Array.isArray(filters?.tagIds) && filters.tagIds.length > 0) {
      // Keep both shapes for backend compatibility (ids and slugs)
      params.tagIds = filters.tagIds.join(',');
    }

    if (Array.isArray(filters?.tagSlugs) && filters.tagSlugs.length > 0) {
      params.tags = filters.tagSlugs.join(',');
    }
    
    // Also accept `filters.tags` (common name used by searchFilters and UI)
    if (Array.isArray(filters?.tags) && filters.tags.length > 0) {
      params.tags = filters.tags.join(',');
    }
    
    // Also accept `filters.tags` (common name used by searchFilters and UI)
    if (Array.isArray(filters?.tags) && filters.tags.length > 0) {
      params.tags = filters.tags.join(',');
    }

    const response = await axiosClient.get('/api/products', { params });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch products.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getProductDetailBySlug = async (slug) => {
  try {
    const response = await axiosClient.get(`/api/products/slug/${encodeURIComponent(slug)}`);
    // DEBUG: raw API response
    // eslint-disable-next-line no-console
    // console.log('[ProductDetail] Raw API response (by slug):', response.data);

    // Normalized product (no additional mapping currently)
    const normalized = response.data;
    // eslint-disable-next-line no-console
    // console.log('[ProductDetail] Normalized product (by slug):', normalized);

    return normalized;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch product detail.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getProductRecommendations = async (productId, limit = 4) => {
  try {
    // lightweight debug log
    // eslint-disable-next-line no-console
    // console.log(`[Recommendations] Fetching recommendations for product ${productId} limit=${limit}`);

    const response = await axiosClient.get(`/api/products/${productId}/recommendations`, {
      params: { limit }
    });

    // eslint-disable-next-line no-console
    // console.log('[Recommendations] Raw API response:', response.data);

    return response.data || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Recommendations] Failed to load recommendations', error);
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch recommendations.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getFeaturedProducts = async () => {
  try {
    const response = await axiosClient.get('/api/products/featured');
    return response.data || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[FeaturedProducts] Failed to load featured products', error);
    return [];
  }
};
