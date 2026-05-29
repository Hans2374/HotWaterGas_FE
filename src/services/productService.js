import axiosClient from '../api/axiosClient';

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.Data)) {
    return payload.Data;
  }

  return [];
};

const normalizePagedPayload = (payload) => {
  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.Data)
      ? payload.Data
      : [];

  const page = Number(payload?.page ?? payload?.Page ?? 1) || 1;
  const pageSize = Number(payload?.pageSize ?? payload?.PageSize ?? items.length ?? 0) || 1;
  const totalItems = Number(payload?.totalItems ?? payload?.TotalItems ?? items.length ?? 0) || 0;
  const totalPages = Number(payload?.totalPages ?? payload?.TotalPages ?? 1) || 1;

  return {
    data: items,
    page,
    pageSize,
    totalItems,
    totalPages
  };
};

const normalizeSteamKeySummary = (payload) => ({
  available: Number(payload?.available ?? payload?.Available ?? 0) || 0,
  disabled: Number(payload?.disabled ?? payload?.Disabled ?? 0) || 0,
  sold: Number(payload?.sold ?? payload?.Sold ?? 0) || 0,
  total: Number(payload?.total ?? payload?.Total ?? 0) || 0
});

const toApiError = (error, fallbackMessage) => {
  if (error.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || fallbackMessage
    };
  }

  return {
    status: 0,
    message: 'Network error. Please check your backend connection.'
  };
};

export const getAdminProducts = async () => {
  try {
    const response = await axiosClient.get('/api/products/admin', {
      params: {
        page: 1,
        pageSize: 100
      }
    });

    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load products.');
  }
};

export const getAdminProductsFiltered = async (filters = {}) => {
  try {
    const params = {
      page: 1,
      pageSize: 100,
      ...filters
    };

    const response = await axiosClient.get('/api/products/admin', { params });

    // Handle paginated response - extract data array from the paginated response
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    // Fallback for backward compatibility
    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load products.');
  }
};

export const getDeletedAdminProducts = async () => {
  try {
    const response = await axiosClient.get('/api/products/deleted', {
      params: {
        page: 1,
        pageSize: 100
      }
    });

    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load deleted products.');
  }
};

export const getAdminProductDetail = async (id) => {
  try {
    const response = await axiosClient.get(`/api/products/${id}`);
    // DEBUG: raw API response for admin product detail
    // eslint-disable-next-line no-console
    console.log('[ProductDetail] Raw API response (by id):', response.data);

    const normalized = response.data;
    // eslint-disable-next-line no-console
    console.log('[ProductDetail] Normalized product (by id):', normalized);

    return normalized;
  } catch (error) {
    throw toApiError(error, 'Failed to load product.');
  }
};

export const createAdminProduct = async (payload) => {
  try {
    await axiosClient.post('/api/products', payload);
  } catch (error) {
    throw toApiError(error, 'Failed to create product.');
  }
};

export const updateAdminProduct = async (id, payload) => {
  try {
    console.groupCollapsed('[AdminProductEdit] API request payload');
    console.log('productId', id);
    console.log('imagesLength', Array.isArray(payload?.images) ? payload.images.length : 0);
    console.log('images', Array.isArray(payload?.images)
      ? payload.images.map((image, index) => ({
          id: image?.id ?? null,
          imageUrl: image?.url ?? image?.imageUrl ?? '',
          isPrimary: index === 0,
          displayOrder: index
        }))
      : []);
    console.log('requestBody', payload);
    console.groupEnd();

    await axiosClient.put(`/api/products/${id}`, payload);
  } catch (error) {
    throw toApiError(error, 'Failed to update product.');
  }
};

export const deleteAdminProduct = async (id) => {
  try {
    await axiosClient.patch(`/api/products/${id}/disable`);
  } catch (error) {
    throw toApiError(error, 'Failed to disable product.');
  }
};

export const disableAdminProduct = async (id) => {
  try {
    await axiosClient.patch(`/api/products/${id}/disable`);
  } catch (error) {
    throw toApiError(error, 'Failed to disable product.');
  }
};

export const restoreAdminProduct = async (id) => {
  try {
    await axiosClient.patch(`/api/products/${id}/restore`);
  } catch (error) {
    throw toApiError(error, 'Failed to restore product.');
  }
};

export const hardDeleteAdminProduct = async (id) => {
  try {
    await axiosClient.delete(`/api/products/${id}/hard-delete`);
  } catch (error) {
    throw toApiError(error, 'Failed to permanently delete product.');
  }
};

export const getCategories = async () => {
  try {
    const response = await axiosClient.get('/api/categories');
    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load categories.');
  }
};

export const getTags = async () => {
  try {
    const response = await axiosClient.get('/api/tags');
    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load tags.');
  }
};

export const uploadProductImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('File', file);

    const response = await axiosClient.post('/api/uploads/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data?.url || response.data?.Url || '';
  } catch (error) {
    throw toApiError(error, 'Failed to upload image.');
  }
};

export const uploadCategoryImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('File', file);

    const response = await axiosClient.post('/api/uploads/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data?.url || response.data?.Url || '';
  } catch (error) {
    throw toApiError(error, 'Failed to upload category image.');
  }
};

export const getAdminSteamKeySummary = async (productId) => {
  try {
    const response = await axiosClient.get(`/api/products/${productId}/keys/summary`);
    return normalizeSteamKeySummary(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load Steam key summary.');
  }
};

export const getAdminSteamKeys = async (productId, query = {}) => {
  try {
    const params = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20
    };

    if (query.status) {
      params.status = query.status;
    }

    const response = await axiosClient.get(`/api/products/${productId}/keys`, { params });
    return normalizePagedPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load Steam keys.');
  }
};

export const createAdminSteamKeys = async (productId, keyValues) => {
  try {
    const payload = {
      keyValues: Array.isArray(keyValues) ? keyValues : []
    };

    const response = await axiosClient.post(`/api/products/${productId}/keys`, payload);

    return {
      insertedCount: Number(response.data?.insertedCount ?? response.data?.InsertedCount ?? 0) || 0,
      skippedDuplicateCount: Number(response.data?.skippedDuplicateCount ?? response.data?.SkippedDuplicateCount ?? 0) || 0,
      invalidRowCount: Number(response.data?.invalidRowCount ?? response.data?.InvalidRowCount ?? 0) || 0
    };
  } catch (error) {
    throw toApiError(error, 'Failed to add Steam keys.');
  }
};

export const updateAdminSteamKey = async (productId, keyId, keyValue) => {
  try {
    const payload = {
      keyValue
    };

    const response = await axiosClient.put(`/api/products/${productId}/keys/${keyId}`, payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to update Steam key.');
  }
};

export const invalidateAdminSteamKey = async (productId, keyId) => {
  try {
    const response = await axiosClient.patch(`/api/products/${productId}/keys/${keyId}/disable`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to disable Steam key.');
  }
};

export const restoreAdminSteamKey = async (productId, keyId) => {
  try {
    const response = await axiosClient.patch(`/api/products/${productId}/keys/${keyId}/enable`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to enable Steam key.');
  }
};

export const deleteAdminSteamKey = async (productId, keyId) => {
  try {
    const response = await axiosClient.delete(`/api/products/${productId}/keys/${keyId}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to delete Steam key.');
  }
};

export const getAdminFeaturedProducts = async () => {
  try {
    const response = await axiosClient.get('/api/admin/products/featured');
    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to load featured products.');
  }
};

export const updateAdminFeaturedProducts = async (productIds) => {
  try {
    const response = await axiosClient.put('/api/admin/products/featured', { productIds });
    return normalizeListPayload(response.data);
  } catch (error) {
    throw toApiError(error, 'Failed to update featured products.');
  }
};
