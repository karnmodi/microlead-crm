import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { SearchService } from "./search.service";

class SearchQuery {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

@Controller("search")
@UseGuards(TeamGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  lookup(@CurrentTeam() team: TeamContext, @Query() query: SearchQuery) {
    return this.searchService.quickSearch(team.teamId, query.q, query.limit ?? 8);
  }
}
