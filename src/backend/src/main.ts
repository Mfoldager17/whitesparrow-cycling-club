import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global pipes, filters & interceptors ────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,        // auto-transform payloads to DTO instances
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── CORS ────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // ── Swagger ─────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Whitesparrow Cycling Club API')
    .setDescription('REST API for the Whitesparrow Cycling Club platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  // ── Start ───────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚴 Whitesparrow API running on http://localhost:${port}`);
  console.log(`📖 Swagger UI at http://localhost:${port}/api/docs`);
}

bootstrap();
