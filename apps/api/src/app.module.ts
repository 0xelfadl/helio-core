import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';

// add config module globale because the apps/api/.env read from that file 
// and appmodule will intecrate it to prismamodule and this last one will integrate in prismaservice and we have prismapg adapter that will have pg pool connecting to connect this one with postgressql 
// we do all this shit because we need ticketservice for example use a only the constructor to reach the prisma service and we will succed to connect with same database
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    AuthModule,
  ],
  providers: [{
    provide: APP_FILTER, 
    useClass: AllExceptionsFilter
  }], 
})
export class AppModule {}
