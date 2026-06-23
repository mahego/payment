import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const isDev = config.get<string>('NODE_ENV') !== 'production';

  // ── Security headers ─────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
    }),
  );

  // ── Cookie parser (for HttpOnly refresh-token cookie) ──
  app.use(cookieParser());

  // ── CORS ────────────────────────────────────────────
  const allowedOrigins = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isDev ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  });

  // ── Global validation pipe ───────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global class-serializer (respects @Exclude) ──
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ── API prefix ───────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger ──────────────────────────────────────
  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Deluxnet API')
      .setDescription('Platform for rural ISP / WISP management')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Session management')
      .addTag('users', 'User management')
      .addTag('collectors', 'Collector management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
  console.log(`🚀 Deluxnet API running on port ${port}`);
}

bootstrap();
