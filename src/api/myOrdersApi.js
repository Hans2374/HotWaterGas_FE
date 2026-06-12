import axiosClient from './axiosClient';

const myOrdersApi = {
  getMyOrders: async (pageNumber = 1, pageSize = 10) => {
    try {
      const response = await axiosClient.get('/api/me/orders', {
        params: { pageNumber, pageSize }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyOrderDetail: async (orderId) => {
    try {
      const response = await axiosClient.get(`/api/me/orders/${orderId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default myOrdersApi;
