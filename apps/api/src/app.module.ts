import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { join } from "path";
import { ActivitiesModule } from "./activities/activities.module";
import { AiModule } from "./ai/ai.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AttachmentsModule } from "./attachments/attachments.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { TeamMinimumRoleGuard } from "./common/guards/team-minimum-role.guard";
import { CompaniesModule } from "./companies/companies.module";
import { ContactsModule } from "./contacts/contacts.module";
import { LeadsModule } from "./leads/leads.module";
import { NotesModule } from "./notes/notes.module";
import { PipelineStagesModule } from "./pipeline-stages/pipeline-stages.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SearchModule } from "./search/search.module";
import { TasksModule } from "./tasks/tasks.module";
import { TeamsModule } from "./teams/teams.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), ".env"), join(process.cwd(), "..", "..", ".env")],
    }),
    PrismaModule,
    ActivitiesModule,
    AuthModule,
    TeamsModule,
    UsersModule,
    CompaniesModule,
    ContactsModule,
    PipelineStagesModule,
    LeadsModule,
    TasksModule,
    NotesModule,
    AttachmentsModule,
    AiModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TeamMinimumRoleGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
