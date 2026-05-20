import axiosClient from './axiosClient';

export const getCategories = async () => {
  try {
    const response = await axiosClient.get('/api/categories');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch categories.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};

export const getHomepageCategories = async () => {
  try {
    const response = await axiosClient.get('/api/categories/homepage');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch homepage categories.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
