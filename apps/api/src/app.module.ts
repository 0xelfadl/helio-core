import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
// add config module globale because the apps/api/.env read from that file 
// and appmodule will intecrate it to prismamodule and this last one will integrate in prismaservice and we have prismapg adapter that will have pg pool connecting to connect this one with postgressql 
// we do all this shit because we need ticketservice for example use a only the constructor to reach the prisma service and we will succed to connect with same database
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
