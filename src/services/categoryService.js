import axiosClient from '../api/axiosClient';

const toApiError = (error, fallbackMessage) => {
  if (error.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || fallbackMessage
    };
  }

  return {
    status: 0,
    message: 'Network error. Please check your connection.'
  };
};

export const getAdminCategories = async (params = {}) => {
  try {
    const requestParams = {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10
    };

    if (params.search) {
      requestParams.search = params.search;
    }

    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== '') {
      requestParams.isActive = params.isActive;
    }

    const response = await axiosClient.get('/api/admin/categories', { params: requestParams });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load categories.');
  }
};

export const getCategoryById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/admin/categories/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load category.');
  }
};

export const createCategory = async (payload) => {
  try {
    const response = await axiosClient.post('/api/admin/categories', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to create category.');
  }
};

export const updateCategory = async (id, payload) => {
  try {
    const response = await axiosClient.put(`/api/admin/categories/${id}`, payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to update category.');
  }
};

export const deleteCategory = async (id) => {
  try {
    await axiosClient.delete(`/api/admin/categories/${id}`);
  } catch (error) {
    throw toApiError(error, 'Failed to delete category.');
  }
};
