import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CompaniesHouseService } from "./companies-house.service";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, CompaniesHouseService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
