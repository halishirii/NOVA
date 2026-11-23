import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { CaptchaService } from '../captcha/captcha.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds = 120;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly captchaService: CaptchaService,
    private readonly usersService: UsersService,
  ) {}

  private hashOtp(phone: string, otp: string): string {
    return crypto
      .createHmac('sha256', process.env.OTP_SECRET || 'gikweb-dev-otp-secret')
      .update(`${phone}:${otp}`)
      .digest('hex');
  }

  async requestOtp(input: { phone: string; captchaId: string; captchaAnswer: string }) {
    await this.captchaService.verifyAndConsume(input.captchaId, input.captchaAnswer);

    const normalizedPhone = input.phone.trim();
    const cooldownKey = `otp:cooldown:${normalizedPhone}`;
    if (await this.redis.get(cooldownKey)) {
      throw new BadRequestException('لطفاً پیش از درخواست مجدد کد کمی صبر کنید.');
    }

    const otpCode = String(crypto.randomInt(100000, 999999));
    await this.redis.set(
      `otp:code:${normalizedPhone}`,
      JSON.stringify({ hash: this.hashOtp(normalizedPhone, otpCode), wrongAttempts: 0 }),
      'EX',
      this.otpTtlSeconds,
    );
    await this.redis.set(cooldownKey, '1', 'EX', 60);

    return {
      message: 'کد تایید ۶ رقمی ایجاد شد.',
      expiresIn: this.otpTtlSeconds,
      // فقط در محیط توسعه/آزمایش برای تست سریع برگردانده می‌شود؛ در تولید حذف شود
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const normalizedPhone = phone.trim();
    const key = `otp:code:${normalizedPhone}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('کد یک‌بار مصرف منقضی یا نامعتبر است.');
    }

    const record = JSON.parse(raw) as { hash: string; wrongAttempts: number };
    if (record.wrongAttempts >= 5) {
      await this.redis.del(key);
      throw new UnauthorizedException('تعداد تلاش‌های ناموفق بیش از حد مجاز بود.');
    }

    const incomingHash = this.hashOtp(normalizedPhone, otp.trim());
    const valid = crypto.timingSafeEqual(
      Buffer.from(record.hash, 'hex'),
      Buffer.from(incomingHash, 'hex'),
    );

    if (!valid) {
      record.wrongAttempts += 1;
      await this.redis.set(key, JSON.stringify(record), 'EX', this.otpTtlSeconds);
      throw new UnauthorizedException('کد واردشده اشتباه است.');
    }

    await this.redis.del(key);
    const user = await this.usersService.findOrCreateByPhone(normalizedPhone);

    return {
      userId: user.id,
      phoneMasked: `${normalizedPhone.slice(0, 4)}***${normalizedPhone.slice(-3)}`,
      authenticated: true,
    };
  }
}
