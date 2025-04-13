import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    // TODO: Change this to your frontend URL
    origin: '*',
  });
  await app.listen(5000);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
