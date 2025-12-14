import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { TeamRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, preferredTeamId: true },
    });
  }

  async register(email: string, password: string, name?: string) {
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { name: name ? `${name}'s workspace` : "My workspace" },
      });
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          preferredTeamId: team.id,
          memberships: {
            create: { teamId: team.id, role: TeamRole.OWNER },
          },
        },
        select: { id: true, email: true, name: true, preferredTeamId: true },
      });
      return user;
    });

    const accessToken = await this.signToken(result.id, result.email);
    return { accessToken, user: result };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const accessToken = await this.signToken(user.id, user.email);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        preferredTeamId: user.preferredTeamId,
      },
    };
  }

  private signToken(sub: string, email: string) {
    return this.jwt.signAsync({ sub, email });
  }
}
