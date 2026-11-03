import { Controller, Get, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from "../auth/public.decorator.js";

interface HealthStatus {
  status: 'ok';
}

@Public ()
@Controller('health')
export class HealthController{
    private readonly logger = new Logger(HealthController.name);
    constructor(private readonly prisma: PrismaService) {}
    
    @Get('live')
    live(): HealthStatus {
        return { status: "ok"}
    }
    @Get('ready')
    async ready(): Promise<HealthStatus> {
       try{
         await this.prisma.$queryRaw`SELECT 1`;
       } catch(error){
          const reason = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Readiness check failed: ${reason}`);
          
          throw new ServiceUnavailableException();
       }
       return {status: "ok"};
    }
}