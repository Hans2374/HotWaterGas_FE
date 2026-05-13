import axiosClient from './axiosClient';

const myOrdersApi = {
  getMyOrders: async () => {
    try {
      const response = await axiosClient.get('/api/me/orders');
      console.log('[myOrdersApi.getMyOrders] response', response.data);
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
