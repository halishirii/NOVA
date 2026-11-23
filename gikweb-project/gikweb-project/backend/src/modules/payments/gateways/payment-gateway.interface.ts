export interface CreatePaymentResult {
  authority: string;
  paymentUrl: string;
  gatewayName: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  refId: string;
}

export interface PaymentGatewayAdapter {
  readonly code: string;
  createPayment(params: {
    orderId: string;
    amountRial: number;
    callbackUrl: string;
    description: string;
  }): Promise<CreatePaymentResult>;

  verifyPayment(params: {
    authority: string;
    amountRial: number;
  }): Promise<VerifyPaymentResult>;
}
