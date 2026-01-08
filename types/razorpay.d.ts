declare module 'react-native-razorpay' {
  export interface CheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
  }

  export interface PaymentSuccess {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }

  export interface PaymentError {
    code: number;
    description: string;
  }

  const RazorpayCheckout: {
    open: (options: CheckoutOptions) => Promise<PaymentSuccess>;
  };

  export default RazorpayCheckout;
}
