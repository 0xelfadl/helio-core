import { NestFactory } from '@nestjs/core';
import { Request, Response} from 'express'
import { ApiErrorBody } from '@helio/shared';
import { AppModule} from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
  await app.init();
  const routeNotFound: ApiErrorBody = {
      error: { 
        code: 'NOT_FOUND',
        message: 'Route not found' 
      },
  };
  app.
  getHttpAdapter().
  getInstance().
  use((_req: Request, res: Response)=>{
    res.status(404).json(routeNotFound);
  })
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
