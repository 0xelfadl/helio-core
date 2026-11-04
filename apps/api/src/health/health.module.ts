import { Module } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { HealthController } from "./health.controller.js";

@Module({
    imports: [PrismaModule],
    controllers: [HealthController],
})
export class HealthModule {}