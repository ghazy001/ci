import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { join } from 'path';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  console.log('1. Creating app...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser());

  console.log('2. Enabling CORS...');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  console.log('3. Setting global pipes...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  console.log('4. Getting Prisma service...');
  const prismaService = app.get(PrismaService);

  console.log('5. Enabling shutdown hooks...');
  prismaService.enableShutdownHooks(app);

  console.log('6. Starting server...');
  await app.listen(3001);

  console.log('7. Server started on port 3001');
  /*
  // Log memory usage every 3 seconds
  setInterval(() => {
    const used = process.memoryUsage();
    console.log('Heap:', Math.round(used.heapUsed / 1024 / 1024), 'MB');
  }, 3000);
   */
}
bootstrap();
