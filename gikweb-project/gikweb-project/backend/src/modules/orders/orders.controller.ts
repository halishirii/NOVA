import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsString()
  userId!: string;

  @IsString()
  serviceName!: string;

  @IsString()
  gatewayCode!: string;
}

class ConfirmPaymentDto {
  @IsString()
  authority!: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createOrder({ ...dto, idempotencyKey });
  }

  @Post(':id/confirm-payment')
  confirm(@Param('id') id: string, @Body() dto: ConfirmPaymentDto) {
    return this.ordersService.confirmPayment(id, dto.authority);
  }
}
