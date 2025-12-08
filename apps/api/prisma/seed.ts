import { PrismaClient, TeamRole, LeadPriority, ParentEntityType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Wipe tenant data in FK-safe order (Postgres). */
async function wipeAll() {
  await prisma.activity.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.updateMany({ data: { preferredTeamId: null } });
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
}

async function main() {
  await wipeAll();

  const email = "karan@microlead.com";
  const password = "12345678";
  const hash = await bcrypt.hash(password, 10);

  const team = await prisma.team.create({
    data: { name: "Microlead" },
  });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      name: "Karan",
      preferredTeamId: team.id,
      memberships: {
        create: { teamId: team.id, role: TeamRole.OWNER },
      },
    },
  });

  const stages = await prisma.$transaction([
    prisma.pipelineStage.create({
      data: { teamId: team.id, name: "New", sortOrder: 0 },
    }),
    prisma.pipelineStage.create({
      data: { teamId: team.id, name: "Qualified", sortOrder: 1 },
    }),
    prisma.pipelineStage.create({
      data: { teamId: team.id, name: "Won", sortOrder: 2 },
    }),
  ]);

  const [newStage, qualifiedStage, wonStage] = stages;

  const companyA = await prisma.company.create({
    data: {
      teamId: team.id,
      name: "Northwind Labs",
      website: "https://northwind.example",
    },
  });

  const companyB = await prisma.company.create({
    data: {
      teamId: team.id,
      name: "Contoso Digital",
      website: "https://contoso.example",
    },
  });

  const contactA = await prisma.contact.create({
    data: {
      teamId: team.id,
      companyId: companyA.id,
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex@northwind.example",
    },
  });

  const contactB = await prisma.contact.create({
    data: {
      teamId: team.id,
      companyId: companyB.id,
      firstName: "Sam",
      lastName: "Chen",
      email: "sam@contoso.example",
    },
  });

  const lead1 = await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "Enterprise rollout — Q2",
      stageId: newStage.id,
      companyId: companyA.id,
      contactId: contactA.id,
      ownerId: user.id,
      priority: LeadPriority.HIGH,
      value: 48000,
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "Website + CRM integration",
      stageId: qualifiedStage.id,
      companyId: companyB.id,
      contactId: contactB.id,
      ownerId: user.id,
      priority: LeadPriority.MEDIUM,
      value: 18500,
    },
  });

  await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "Pilot closed — expansion",
      stageId: wonStage.id,
      companyId: companyA.id,
      contactId: contactA.id,
      ownerId: user.id,
      priority: LeadPriority.LOW,
      value: 9200,
    },
  });

  await prisma.note.createMany({
    data: [
      {
        teamId: team.id,
        parentType: ParentEntityType.LEAD,
        parentId: lead1.id,
        body: "Kickoff call booked for next Tuesday; champion is Alex.",
      },
      {
        teamId: team.id,
        parentType: ParentEntityType.LEAD,
        parentId: lead2.id,
        body: "Security questionnaire submitted; waiting on vendor review.",
      },
    ],
  });

  await prisma.task.create({
    data: {
      teamId: team.id,
      parentType: ParentEntityType.LEAD,
      parentId: lead1.id,
      title: "Send SOW draft",
      assigneeId: user.id,
      done: false,
    },
  });

  console.log("Seeded fresh tenant:", {
    email,
    password,
    team: team.name,
    teamId: team.id,
    leads: 3,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
