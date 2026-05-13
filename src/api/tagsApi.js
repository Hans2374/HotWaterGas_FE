import axiosClient from './axiosClient';

export const getTags = async () => {
  try {
    const response = await axiosClient.get('/api/tags');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.message || 'Failed to fetch tags.'
      };
    }

    throw {
      status: 0,
      message: 'Network error. Please check your backend connection.'
    };
  }
};
