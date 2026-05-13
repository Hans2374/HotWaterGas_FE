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

export const getAdminTags = async (params = {}) => {
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

    const response = await axiosClient.get('/api/admin/tags', { params: requestParams });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load tags.');
  }
};

export const getTagById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/admin/tags/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load tag.');
  }
};

export const createTag = async (payload) => {
  try {
    const response = await axiosClient.post('/api/admin/tags', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to create tag.');
  }
};

export const updateTag = async (id, payload) => {
  try {
    const response = await axiosClient.put(`/api/admin/tags/${id}`, payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to update tag.');
  }
};

export const deleteTag = async (id) => {
  try {
    await axiosClient.delete(`/api/admin/tags/${id}`);
  } catch (error) {
    throw toApiError(error, 'Failed to delete tag.');
  }
};
