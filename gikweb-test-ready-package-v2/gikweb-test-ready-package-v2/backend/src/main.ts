import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { BotShieldGuard } from './common/guards/bot-shield.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalGuards(new BotShieldGuard());
  app.enableCors({ origin: true, credentials: true });
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
