import { Body, Controller, Post } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TeamsService } from "./teams.service";

class AcceptInviteDto {
  @IsString()
  @MinLength(16)
  token!: string;
}

@Controller("invites")
export class InvitesController {
  constructor(private readonly teams: TeamsService) {}

  @Post("accept")
  accept(@CurrentUser() user: AuthUser, @Body() dto: AcceptInviteDto) {
    return this.teams.acceptInvite(user.id, user.email, dto.token);
  }
}
