import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class BotShieldGuard implements CanActivate {
  private readonly blockedAgents = [
    /curl/i,
    /wget/i,
    /python-requests/i,
    /scrapy/i,
    /headlesschrome/i,
    /phantomjs/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userAgent: string = req.headers['user-agent'] || '';

    if (!userAgent || userAgent.trim().length < 8) {
      throw new ForbiddenException('درخواست نامعتبر تشخیص داده شد.');
    }

    if (this.blockedAgents.some((pattern) => pattern.test(userAgent))) {
      throw new ForbiddenException('دسترسی خودکار مسدود شده است.');
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.headers['origin'] || '';
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
        throw new ForbiddenException('مبدأ درخواست مجاز نیست.');
      }
    }

    return true;
  }
}
