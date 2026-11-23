export interface PaymentGatewayAdapter {
  readonly code: string;
  createPayment(params: { orderId: string; amountRial: number; callbackUrl: string }): Promise<{ authority: string; paymentUrl: string }>;
  verifyPayment(params: { authority: string; amountRial: number }): Promise<{ verified: boolean; refId: string }>;
}
