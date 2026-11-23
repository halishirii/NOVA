import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreatePaymentResult, PaymentGatewayAdapter, VerifyPaymentResult } from './payment-gateway.interface';

@Injectable()
export class GatewayBAdapter implements PaymentGatewayAdapter {
  readonly code = 'GATEWAY_B';

  async createPayment(params: {
    orderId: string;
    amountRial: number;
    callbackUrl: string;
    description: string;
  }): Promise<CreatePaymentResult> {
    const authority = `GWB-${crypto.randomBytes(12).toString('hex')}`;
    return {
      authority,
      paymentUrl: `${params.callbackUrl}?gateway=${this.code}&authority=${authority}`,
      gatewayName: 'درگاه بانکی دوم',
    };
  }

  async verifyPayment(params: { authority: string; amountRial: number }): Promise<VerifyPaymentResult> {
    return {
      verified: Boolean(params.authority && params.amountRial > 0),
      refId: `REF-B-${crypto.randomInt(10000000, 99999999)}`,
    };
  }
}
