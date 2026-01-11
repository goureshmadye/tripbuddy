import { Config } from '@/constants/config';
import { Alert } from 'react-native';

// Safely import Razorpay - module may not exist in Expo Go
let RazorpayCheckout: any = null;
try {
  RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
  console.warn('[Payment] Razorpay native module not available');
}

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
    // Check if Razorpay is available (not in Expo Go)
    if (!RazorpayCheckout) {
      return new Promise((resolve, reject) => {
        Alert.alert(
          'Payment Not Available',
          'Native payment module is not available in Expo Go. Use a Development Build to test payments.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => reject({ code: 0, description: 'Payment not supported in Expo Go' }) },
            { text: 'Simulate Success', onPress: () => resolve({ razorpay_payment_id: 'mock_pay_123' }) }
          ]
        );
      });
    }

    const checkoutOptions = {
      key: Config.RAZORPAY_KEY_ID,
      amount: options.amount, 
      currency: options.currency,
      name: options.name,
      description: options.description,
      image: options.image || 'https://i.imgur.com/3g7nmJC.png', // Fallback logo
      prefill: options.prefill,
      theme: options.theme || { color: '#F37254' },
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
