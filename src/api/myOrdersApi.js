import axiosClient from './axiosClient';

const myOrdersApi = {
  getMyOrders: async (pageNumber = 1, pageSize = 10) => {
    try {
      const response = await axiosClient.get('/api/me/orders', {
        params: { pageNumber, pageSize }
      });
      console.log('[myOrdersApi.getMyOrders] pageNumber=', pageNumber, 'pageSize=', pageSize, 'response', response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyOrderDetail: async (orderId) => {
    try {
      const response = await axiosClient.get(`/api/me/orders/${orderId}`);
      console.log('[myOrdersApi.getMyOrderDetail] orderId=', orderId, 'response=', response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default myOrdersApi;
