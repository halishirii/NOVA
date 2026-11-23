import { Body, Controller, Post } from '@nestjs/common';
import { IsString, Matches, Length } from 'class-validator';
import { AuthService } from './auth.service';

class RequestOtpDto {
  @IsString() @Matches(/^09\d{9}$/) phone!: string;
  @IsString() captchaId!: string;
  @IsString() captchaAnswer!: string;
}

class VerifyOtpDto {
  @IsString() @Matches(/^09\d{9}$/) phone!: string;
  @IsString() @Length(6, 6) otp!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('request-otp') requestOtp(@Body() dto: RequestOtpDto) { return this.authService.requestOtp(dto); }
  @Post('verify-otp') verifyOtp(@Body() dto: VerifyOtpDto) { return this.authService.verifyOtp(dto.phone, dto.otp); }
}
