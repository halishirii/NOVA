import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentGatewayAdapter } from './payment-gateway.interface';

@Injectable()
export class GatewayAAdapter implements PaymentGatewayAdapter {
  readonly code = 'GATEWAY_A';
  async createPayment(params: { orderId: string; amountRial: number; callbackUrl: string }) {
    const authority = `GWA-${crypto.randomBytes(10).toString('hex')}`;
    return { authority, paymentUrl: `${params.callbackUrl}?gateway=${this.code}&authority=${authority}` };
  }
  async verifyPayment() {
    return { verified: true, refId: `REF-A-${crypto.randomInt(100000, 999999)}` };
  }
}
