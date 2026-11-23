import { Body, Controller, Post } from '@nestjs/common';
import { IsArray, IsNumber, IsString } from 'class-validator';
import { OrdersService } from './orders.service';

class CreateCartOrderDto {
  @IsString() userId!: string;
  @IsNumber() totalAmountRial!: number;
  @IsString() gatewayCode!: string;
  @IsArray() items!: unknown[];
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  @Post() create(@Body() dto: CreateCartOrderDto) { return this.ordersService.createOrder(dto); }
}
