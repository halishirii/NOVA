import { BadRequestException, Injectable } from '@nestjs/common';
import { GatewayAAdapter } from './gateways/gateway-a.adapter';
import { GatewayBAdapter } from './gateways/gateway-b.adapter';
import { PaymentGatewayAdapter } from './gateways/payment-gateway.interface';

@Injectable()
export class PaymentGatewayFactory {
  private readonly map = new Map<string, PaymentGatewayAdapter>();
  constructor(a: GatewayAAdapter, b: GatewayBAdapter) {
    this.map.set(a.code, a);
    this.map.set(b.code, b);
  }
  getGateway(code: string): PaymentGatewayAdapter {
    const g = this.map.get(code);
    if (!g) throw new BadRequestException('درگاه بانکی معتبر نیست.');
    return g;
  }
}
