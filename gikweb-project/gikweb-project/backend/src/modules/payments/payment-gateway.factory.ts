import { BadRequestException, Injectable } from '@nestjs/common';
import { GatewayAAdapter } from './gateways/gateway-a.adapter';
import { GatewayBAdapter } from './gateways/gateway-b.adapter';
import { PaymentGatewayAdapter } from './gateways/payment-gateway.interface';

@Injectable()
export class PaymentGatewayFactory {
  private readonly gateways = new Map<string, PaymentGatewayAdapter>();

  constructor(gatewayA: GatewayAAdapter, gatewayB: GatewayBAdapter) {
    this.gateways.set(gatewayA.code, gatewayA);
    this.gateways.set(gatewayB.code, gatewayB);
  }

  getGateway(code: string): PaymentGatewayAdapter {
    const adapter = this.gateways.get(code);
    if (!adapter) {
      throw new BadRequestException('درگاه بانکی انتخاب‌شده معتبر نیست.');
    }
    return adapter;
  }

  listGateways(): string[] {
    return Array.from(this.gateways.keys());
  }
}
