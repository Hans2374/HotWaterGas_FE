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

    if (filters?.publisherId) {
      params.publisherId = filters.publisherId;
    }

    if (filters?.developerId) {
      params.developerId = filters.developerId;
    }

    if (filters?.maxPrice !== undefined && filters?.maxPrice !== null && filters?.maxPrice !== '') {
      params.maxPrice = Number(filters.maxPrice);
    }

    if (Array.isArray(filters?.tagIds) && filters.tagIds.length > 0) {
      params.tagIds = filters.tagIds.join(',');
    }

    if (Array.isArray(filters?.tagSlugs) && filters.tagSlugs.length > 0) {
      params.tags = filters.tagSlugs.join(',');
    }

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

export const getSearchSuggestions = async (query, signal) => {
  const trimmedQuery = String(query || '').trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  try {
    const response = await axiosClient.get('/api/products/search/suggestions', {
      params: { q: trimmedQuery },
      signal
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      throw error;
    }

    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch search suggestions.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getPublisherDetailById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/publishers/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch publisher detail.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getPublishers = async () => {
  try {
    const response = await axiosClient.get('/api/publishers');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch publishers.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getDeveloperDetailById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/developers/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch developer detail.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getDevelopers = async () => {
  try {
    const response = await axiosClient.get('/api/developers');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch developers.'
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
    const normalized = response.data;
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
    const response = await axiosClient.get(`/api/products/${productId}/recommendations`, {
      params: { limit }
    });

    return response.data || [];
  } catch (error) {
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
    console.error('[FeaturedProducts] Failed to load featured products', error);
    return [];
  }
};
