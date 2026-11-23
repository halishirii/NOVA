import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentGatewayFactory } from '../payments/payment-gateway.factory';

export interface OrderRecord {
  id: string;
  userId: string;
  serviceName: string;
  amountRial: number;
  gatewayCode: string;
  authority?: string;
  status: 'PENDING_PAYMENT' | 'PAID';
}

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, OrderRecord>();
  private readonly idempotencyStore = new Map<string, string>();

  private readonly serviceCatalog: Record<string, number> = {
    'طراحی UI/UX': 180000000,
    'طراحی سایت وردپرسی': 220000000,
    'اجرای سایت وردپرسی': 150000000,
    'وب اپلیکیشن': 450000000,
  };

  constructor(private readonly gatewayFactory: PaymentGatewayFactory) {}

  async createOrder(input: {
    userId: string;
    serviceName: string;
    gatewayCode: string;
    idempotencyKey?: string;
  }) {
    if (input.idempotencyKey && this.idempotencyStore.has(input.idempotencyKey)) {
      const existingId = this.idempotencyStore.get(input.idempotencyKey)!;
      return this.orders.get(existingId);
    }

    const amountRial = this.serviceCatalog[input.serviceName] ?? 180000000;
    const gateway = this.gatewayFactory.getGateway(input.gatewayCode);
    const orderId = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const payment = await gateway.createPayment({
      orderId,
      amountRial,
      callbackUrl: 'https://panel.gikweb.com/payment/callback',
      description: `سفارش ${input.serviceName} در گیک‌وب`,
    });

    const record: OrderRecord = {
      id: orderId,
      userId: input.userId,
      serviceName: input.serviceName,
      amountRial,
      gatewayCode: gateway.code,
      authority: payment.authority,
      status: 'PENDING_PAYMENT',
    };

    this.orders.set(orderId, record);
    if (input.idempotencyKey) {
      this.idempotencyStore.set(input.idempotencyKey, orderId);
    }

    return { order: record, paymentUrl: payment.paymentUrl };
  }

  async confirmPayment(orderId: string, authority: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new NotFoundException('سفارش یافت نشد.');
    const gateway = this.gatewayFactory.getGateway(order.gatewayCode);
    const verified = await gateway.verifyPayment({ authority, amountRial: order.amountRial });
    if (verified.verified) {
      order.status = 'PAID';
    }
    return { order, verification: verified };
  }
}
