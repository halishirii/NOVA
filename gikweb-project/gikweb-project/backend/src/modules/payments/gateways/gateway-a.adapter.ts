import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreatePaymentResult, PaymentGatewayAdapter, VerifyPaymentResult } from './payment-gateway.interface';

@Injectable()
export class GatewayAAdapter implements PaymentGatewayAdapter {
  readonly code = 'GATEWAY_A';

  async createPayment(params: {
    orderId: string;
    amountRial: number;
    callbackUrl: string;
    description: string;
  }): Promise<CreatePaymentResult> {
    const authority = `GWA-${crypto.randomBytes(12).toString('hex')}`;
    return {
      authority,
      paymentUrl: `${params.callbackUrl}?gateway=${this.code}&authority=${authority}`,
      gatewayName: 'درگاه بانکی اول',
    };
  }

  async verifyPayment(params: { authority: string; amountRial: number }): Promise<VerifyPaymentResult> {
    return {
      verified: Boolean(params.authority && params.amountRial > 0),
      refId: `REF-A-${crypto.randomInt(10000000, 99999999)}`,
    };
  }
}
