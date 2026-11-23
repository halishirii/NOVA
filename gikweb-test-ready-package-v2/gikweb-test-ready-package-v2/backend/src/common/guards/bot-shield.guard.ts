import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class BotShieldGuard implements CanActivate {
  private readonly blockedAgents = [
    /curl/i, /wget/i, /python-requests/i, /scrapy/i,
    /headlesschrome/i, /phantomjs/i, /selenium/i, /puppeteer/i, /playwright/i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userAgent: string = req.headers['user-agent'] || '';
    if (!userAgent || userAgent.trim().length < 6) {
      throw new ForbiddenException('درخواست نامعتبر تشخیص داده شد.');
    }
    if (this.blockedAgents.some((p) => p.test(userAgent))) {
      throw new ForbiddenException('دسترسی خودکار مسدود شده است.');
    }
    return true;
  }
}
