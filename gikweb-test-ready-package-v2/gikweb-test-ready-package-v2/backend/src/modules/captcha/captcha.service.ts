import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { KvStore } from '../../common/kv-store.provider';

@Injectable()
export class CaptchaService {
  private readonly ttlSeconds = 180;
  constructor(@Inject('KV_STORE') private readonly kv: KvStore) {}

  async createChallenge() {
    const a = crypto.randomInt(2, 10);
    const b = crypto.randomInt(1, 9);
    const answer = String(a + b);
    const captchaId = crypto.randomUUID();
    const answerHash = crypto
      .createHash('sha256')
      .update(`${captchaId}:${answer}:${process.env.CAPTCHA_SECRET || 'dev-captcha-secret'}`)
      .digest('hex');

    await this.kv.set(`captcha:${captchaId}`, JSON.stringify({ answerHash, attempts: 0 }), this.ttlSeconds);
    return { captchaId, question: `حاصل جمع ${a} + ${b} چند می‌شود؟`, expiresIn: this.ttlSeconds };
  }

  async verifyAndConsume(captchaId: string, userAnswer: string): Promise<void> {
    const raw = await this.kv.get(`captcha:${captchaId}`);
    if (!raw) throw new BadRequestException('کد امنیتی منقضی یا نامعتبر است.');
    const parsed = JSON.parse(raw) as { answerHash: string; attempts: number };
    const candidateHash = crypto
      .createHash('sha256')
      .update(`${captchaId}:${userAnswer.trim()}:${process.env.CAPTCHA_SECRET || 'dev-captcha-secret'}`)
      .digest('hex');
    const isMatch = crypto.timingSafeEqual(Buffer.from(parsed.answerHash, 'hex'), Buffer.from(candidateHash, 'hex'));
    if (!isMatch) {
      parsed.attempts += 1;
      await this.kv.set(`captcha:${captchaId}`, JSON.stringify(parsed), this.ttlSeconds);
      throw new BadRequestException('پاسخ کپچا اشتباه است.');
    }
    await this.kv.del(`captcha:${captchaId}`);
  }
}
