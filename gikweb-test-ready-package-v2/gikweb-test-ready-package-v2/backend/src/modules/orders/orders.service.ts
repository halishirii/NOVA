import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentGatewayFactory } from '../payments/payment-gateway.factory';

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, unknown>();
  constructor(private readonly gatewayFactory: PaymentGatewayFactory) {}

  async createOrder(input: { userId: string; totalAmountRial: number; gatewayCode: string; items: unknown[] }) {
    const gateway = this.gatewayFactory.getGateway(input.gatewayCode);
    const orderId = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const payment = await gateway.createPayment({
      orderId,
      amountRial: input.totalAmountRial,
      callbackUrl: 'https://panel.gikweb.com/payment/callback',
    });
    const record = { id: orderId, ...input, authority: payment.authority, status: 'PENDING_PAYMENT' };
    this.orders.set(orderId, record);
    return { order: record, paymentUrl: payment.paymentUrl };
  }
}
