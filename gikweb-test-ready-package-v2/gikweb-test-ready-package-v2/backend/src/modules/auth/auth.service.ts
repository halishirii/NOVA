import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { KvStore } from '../../common/kv-store.provider';
import { CaptchaService } from '../captcha/captcha.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds = 120;
  constructor(
    @Inject('KV_STORE') private readonly kv: KvStore,
    private readonly captchaService: CaptchaService,
    private readonly usersService: UsersService,
  ) {}

  private hashOtp(phone: string, otp: string): string {
    return crypto.createHmac('sha256', process.env.OTP_SECRET || 'gikweb-dev-otp-secret').update(`${phone}:${otp}`).digest('hex');
  }

  async requestOtp(input: { phone: string; captchaId: string; captchaAnswer: string }) {
    await this.captchaService.verifyAndConsume(input.captchaId, input.captchaAnswer);
    const otpCode = String(crypto.randomInt(100000, 999999));
    await this.kv.set(`otp:code:${input.phone.trim()}`, JSON.stringify({ hash: this.hashOtp(input.phone.trim(), otpCode) }), this.otpTtlSeconds);
    return {
      message: 'کد یک‌بار مصرف ایجاد شد.',
      expiresIn: this.otpTtlSeconds,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const raw = await this.kv.get(`otp:code:${phone.trim()}`);
    if (!raw) throw new UnauthorizedException('کد منقضی یا نامعتبر است.');
    const { hash } = JSON.parse(raw) as { hash: string };
    const incoming = this.hashOtp(phone.trim(), otp.trim());
    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(incoming, 'hex'))) {
      throw new UnauthorizedException('کد اشتباه است.');
    }
    await this.kv.del(`otp:code:${phone.trim()}`);
    const user = await this.usersService.findOrCreateByPhone(phone.trim());
    return { userId: user.id, authenticated: true };
  }
}
