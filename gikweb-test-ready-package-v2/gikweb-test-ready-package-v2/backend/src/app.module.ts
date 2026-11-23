import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { createKvStore } from './common/kv-store.provider';
import { CaptchaController } from './modules/captcha/captcha.controller';
import { CaptchaService } from './modules/captcha/captcha.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { UsersService } from './modules/users/users.service';
import { GatewayAAdapter } from './modules/payments/gateways/gateway-a.adapter';
import { GatewayBAdapter } from './modules/payments/gateways/gateway-b.adapter';
import { PaymentGatewayFactory } from './modules/payments/payment-gateway.factory';
import { OrdersController } from './modules/orders/orders.controller';
import { OrdersService } from './modules/orders/orders.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])],
  controllers: [CaptchaController, AuthController, OrdersController],
  providers: [
    {
      provide: 'KV_STORE',
      useFactory: () => createKvStore(),
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    CaptchaService, UsersService, AuthService, GatewayAAdapter, GatewayBAdapter, PaymentGatewayFactory, OrdersService,
  ],
})
export class AppModule {}
