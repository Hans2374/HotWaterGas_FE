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

export const getAdminDevelopers = async (params = {}) => {
  try {
    const requestParams = {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 10
    };
    if (params.search) {
      requestParams.search = params.search;
    }
    const response = await axiosClient.get('/api/admin/developers', { params: requestParams });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load developers.');
  }
};

export const getDeveloperById = async (id) => {
  try {
    const response = await axiosClient.get(`/api/admin/developers/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to load developer.');
  }
};

export const createDeveloper = async (payload) => {
  try {
    const response = await axiosClient.post('/api/admin/developers', payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to create developer.');
  }
};

export const updateDeveloper = async (id, payload) => {
  try {
    const response = await axiosClient.put(`/api/admin/developers/${id}`, payload);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'Failed to update developer.');
  }
};

export const deleteDeveloper = async (id) => {
  try {
    await axiosClient.delete(`/api/admin/developers/${id}`);
  } catch (error) {
    throw toApiError(error, 'Failed to delete developer.');
  }
};

export const getDevelopers = async (params = {}) => {
  try {
    const requestParams = {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 100
    };
    if (params.search) {
      requestParams.search = params.search;
    }
    const response = await axiosClient.get('/api/admin/developers', { params: requestParams });
    return response.data.items || [];
  } catch (error) {
    throw toApiError(error, 'Failed to load developers.');
  }
};
