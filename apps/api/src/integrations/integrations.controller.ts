import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { TeamRole } from "@prisma/client";
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { RequireTeamMinimumRole } from "../common/decorators/require-team-minimum-role.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { IntegrationsService } from "./integrations.service";

class ConfigureCompaniesHouseBody {
  @IsString()
  @IsNotEmpty()
  apiKey!: string;
}

class CompaniesHousePreferencesBody {
  @IsArray()
  @IsString({ each: true })
  fields!: string[];
}

class EnrichCompaniesHouseBody {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

class CompaniesHouseLookupBody {
  @IsString()
  @IsNotEmpty()
  companyNumber!: string;
}

@Controller("integrations")
@UseGuards(TeamGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  getStatus(@CurrentTeam() team: TeamContext) {
    return this.integrations.getStatus(team.teamId);
  }

  @Get("companies-house/preferences")
  getCompaniesHousePreferences(@CurrentTeam() team: TeamContext) {
    return this.integrations.getCompaniesHouseFieldPreferences(team.teamId);
  }

  @Patch("companies-house/preferences")
  @RequireTeamMinimumRole(TeamRole.ADMIN)
  patchCompaniesHousePreferences(
    @CurrentTeam() team: TeamContext,
    @Body() body: CompaniesHousePreferencesBody,
  ) {
    return this.integrations.setCompaniesHouseFieldPreferences(team.teamId, body.fields);
  }

  @Post("companies-house/lookup")
  lookupCompaniesHouse(@CurrentTeam() team: TeamContext, @Body() body: CompaniesHouseLookupBody) {
    return this.integrations.lookupCompaniesHouseForForm(team.teamId, body.companyNumber);
  }

  @Post("companies-house/enrich")
  enrichCompany(@CurrentTeam() team: TeamContext, @Body() body: EnrichCompaniesHouseBody) {
    return this.integrations.enrichCompany(team.teamId, body.companyId, body.fields);
  }

  @Post("companies-house/sync")
  syncCompaniesHouse(@CurrentTeam() team: TeamContext) {
    return this.integrations.runCompaniesHouseSync(team.teamId);
  }

  @Post("companies-house/configure")
  configure(@CurrentTeam() team: TeamContext, @Body() body: ConfigureCompaniesHouseBody) {
    void team; void body;
    return { ok: true, message: "Set COMPANIES_HOUSE_API_KEY in your server environment to enable enrichment." };
  }
}
