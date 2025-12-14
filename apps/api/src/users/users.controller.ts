import { Body, Controller, Patch } from "@nestjs/common";
import { IsUUID } from "class-validator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";

class PreferredTeamDto {
  @IsUUID()
  teamId!: string;
}

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch("me/preferred-team")
  preferredTeam(@CurrentUser() user: AuthUser, @Body() dto: PreferredTeamDto) {
    return this.users.setPreferredTeam(user.id, dto.teamId);
  }
}
