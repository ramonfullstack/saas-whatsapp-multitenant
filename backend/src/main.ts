import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('SaaS CRM WhatsApp API')
    .setDescription('API Multi-Tenant para CRM WhatsApp - Chat, Tickets, Kanban, Evolution API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT',
    )
    .addTag('auth', 'Login e autenticação')
    .addTag('companies', 'Empresa do usuário logado')
    .addTag('users', 'Usuários da empresa')
    .addTag('contacts', 'Contatos')
    .addTag('funnels', 'Funis e etapas (Kanban)')
    .addTag('tickets', 'Atendimentos / conversas')
    .addTag('messages', 'Mensagens do chat')
    .addTag('whatsapp', 'Contas WhatsApp')
    .addTag('webhook', 'Evolution API (mensagens recebidas / connection)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
