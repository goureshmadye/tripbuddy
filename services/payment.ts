import { Config } from '@/constants/config';
import RazorpayCheckout from 'react-native-razorpay';

export interface PaymentOptions {
  description: string;
  image?: string;
  currency: string;
  amount: number; // in smallest unit (e.g. paise)
  name: string;
  prefill?: {
    email: string;
    contact: string;
    name: string;
  };
  theme?: {
    color: string;
  };
}

export interface PaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface PaymentErrorResponse {
  code: number;
  description: string;
}

export const PaymentService = {
  /**
   * Opens the Razorpay checkout modal
   */
  startPayment: async (options: PaymentOptions): Promise<PaymentSuccessResponse> => {
    const checkoutOptions = {
      key: Config.RAZORPAY_KEY_ID,
      amount: options.amount, 
      currency: options.currency,
      name: options.name,
      description: options.description,
      image: options.image || 'https://i.imgur.com/3g7nmJC.png', // Fallback logo
      prefill: options.prefill,
      theme: options.theme || { color: '#F37254' },
      // order_id: 'order_DslnoIgkIDL8Zt' // Generate this from backend in production
    };

    try {
      const data = await RazorpayCheckout.open(checkoutOptions);
      return data as PaymentSuccessResponse;
    } catch (error: any) {
      // Razorpay returns error in a specific format
      const errorResponse: PaymentErrorResponse = {
        code: error.code,
        description: error.description || 'Payment Cancelled or Failed',
      };
      throw errorResponse;
    }
  }
};
