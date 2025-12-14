import { Body, Controller, Get, Post } from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TeamsService } from "./teams.service";

class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

@Controller("teams")
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.teams.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto.name);
  }
}
