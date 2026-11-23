import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class CaptchaService {
  private readonly ttlSeconds = 180;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async createChallenge() {
    const a = crypto.randomInt(2, 10);
    const b = crypto.randomInt(1, 9);
    const answer = String(a + b);
    const captchaId = crypto.randomUUID();
    const answerHash = crypto
      .createHash('sha256')
      .update(`${captchaId}:${answer}:${process.env.CAPTCHA_SECRET || 'dev-captcha-secret'}`)
      .digest('hex');

    await this.redis.set(
      `captcha:${captchaId}`,
      JSON.stringify({ answerHash, attempts: 0 }),
      'EX',
      this.ttlSeconds,
    );

    return {
      captchaId,
      question: `حاصل جمع ${a} + ${b} چند می‌شود؟`,
      expiresIn: this.ttlSeconds,
    };
  }

  async verifyAndConsume(captchaId: string, userAnswer: string): Promise<void> {
    const key = `captcha:${captchaId}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('کد امنیتی منقضی یا نامعتبر است.');
    }

    const parsed = JSON.parse(raw) as { answerHash: string; attempts: number };
    if (parsed.attempts >= 3) {
      await this.redis.del(key);
      throw new BadRequestException('تعداد تلاش‌های کپچا بیش از حد مجاز بود.');
    }

    const candidateHash = crypto
      .createHash('sha256')
      .update(`${captchaId}:${userAnswer.trim()}:${process.env.CAPTCHA_SECRET || 'dev-captcha-secret'}`)
      .digest('hex');

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(parsed.answerHash, 'hex'),
      Buffer.from(candidateHash, 'hex'),
    );

    if (!isMatch) {
      parsed.attempts += 1;
      await this.redis.set(key, JSON.stringify(parsed), 'EX', this.ttlSeconds);
      throw new BadRequestException('پاسخ کپچا اشتباه است.');
    }

    await this.redis.del(key);
  }
}
