import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { TasksModule } from "../tasks/tasks.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [TasksModule, MailModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
