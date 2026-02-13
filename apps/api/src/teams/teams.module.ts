import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { TeamMemberParamGuard } from "../common/guards/team-member-param.guard";
import { TeamOwnerOrAdminParamGuard } from "../common/guards/team-owner-or-admin-param.guard";
import { InvitesController } from "./invites.controller";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [MailModule],
  controllers: [TeamsController, InvitesController],
  providers: [TeamsService, TeamMemberParamGuard, TeamOwnerOrAdminParamGuard],
})
export class TeamsModule {}
