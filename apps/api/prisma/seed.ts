import { PrismaClient, TeamRole, LeadPriority, LeadStatus, ParentEntityType } from "@prisma/client";
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
  await prisma.teamInvite.deleteMany();
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
    prisma.pipelineStage.create({ data: { teamId: team.id, name: "Discovery", sortOrder: 0 } }),
    prisma.pipelineStage.create({ data: { teamId: team.id, name: "Solution Fit", sortOrder: 1 } }),
    prisma.pipelineStage.create({ data: { teamId: team.id, name: "Proposal", sortOrder: 2 } }),
    prisma.pipelineStage.create({ data: { teamId: team.id, name: "Legal Review", sortOrder: 3 } }),
    prisma.pipelineStage.create({ data: { teamId: team.id, name: "Negotiation", sortOrder: 4 } }),
    prisma.pipelineStage.create({ data: { teamId: team.id, name: "Won", sortOrder: 5 } }),
  ]);

  const [discoveryStage, , proposalStage, legalStage, negotiationStage, wonStage] = stages;

  const companyA = await prisma.company.create({
    data: {
      teamId: team.id,
      name: "Northwind Health Systems",
      website: "https://northwind.example",
      industry: "Healthcare SaaS",
      employeeCount: 850,
    },
  });

  const companyB = await prisma.company.create({
    data: {
      teamId: team.id,
      name: "Contoso Financial Cloud",
      website: "https://contoso.example",
      industry: "FinTech Infrastructure",
      employeeCount: 1200,
    },
  });

  const companyC = await prisma.company.create({
    data: {
      teamId: team.id,
      name: "Aster Manufacturing Group",
      website: "https://aster.example",
      industry: "Industrial Manufacturing",
      employeeCount: 2300,
    },
  });

  const contactA = await prisma.contact.create({
    data: {
      teamId: team.id,
      companyId: companyA.id,
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex@northwind.example",
      jobTitle: "VP Revenue Operations",
      linkedinUrl: "https://linkedin.com/in/alex-rivera",
    },
  });

  const contactB = await prisma.contact.create({
    data: {
      teamId: team.id,
      companyId: companyB.id,
      firstName: "Sam",
      lastName: "Chen",
      email: "sam@contoso.example",
      jobTitle: "Head of Sales Engineering",
      linkedinUrl: "https://linkedin.com/in/sam-chen",
    },
  });

  const contactC = await prisma.contact.create({
    data: {
      teamId: team.id,
      companyId: companyC.id,
      firstName: "Priya",
      lastName: "Menon",
      email: "priya@aster.example",
      jobTitle: "Director, Digital Transformation",
      linkedinUrl: "https://linkedin.com/in/priya-menon",
    },
  });

  const lead1 = await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "HIPAA-safe patient outreach workflow",
      stageId: discoveryStage.id,
      companyId: companyA.id,
      contactId: contactA.id,
      ownerId: user.id,
      priority: LeadPriority.HIGH,
      value: 180000,
      currency: "USD",
      probability: 30,
      source: "Partner referral",
      expectedCloseDate: new Date("2026-06-20"),
      description: "Replace legacy outbound system with multi-site compliant workflow.",
      status: LeadStatus.OPEN,
      tags: ["healthcare", "compliance", "enterprise"],
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "AI-assisted underwriting CRM integration",
      stageId: proposalStage.id,
      companyId: companyB.id,
      contactId: contactB.id,
      ownerId: user.id,
      priority: LeadPriority.MEDIUM,
      value: 94000,
      currency: "USD",
      probability: 62,
      source: "Outbound ABM",
      expectedCloseDate: new Date("2026-05-30"),
      description: "Integrate CRM events into underwriting assistant and governance logs.",
      status: LeadStatus.OPEN,
      tags: ["fintech", "ai", "integration"],
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "Plant modernization account expansion",
      stageId: legalStage.id,
      companyId: companyC.id,
      contactId: contactC.id,
      ownerId: user.id,
      priority: LeadPriority.HIGH,
      value: 260000,
      currency: "USD",
      probability: 74,
      source: "Existing account",
      expectedCloseDate: new Date("2026-06-10"),
      description: "Extend pilot into 12 manufacturing plants with analytics rollout.",
      status: LeadStatus.OPEN,
      tags: ["manufacturing", "multi-site"],
    },
  });

  await prisma.lead.create({
    data: {
      teamId: team.id,
      title: "Risk operations automation renewal",
      stageId: negotiationStage.id,
      companyId: companyB.id,
      contactId: contactB.id,
      ownerId: user.id,
      priority: LeadPriority.MEDIUM,
      value: 122000,
      currency: "USD",
      probability: 81,
      source: "Customer success handoff",
      expectedCloseDate: new Date("2026-05-18"),
      description: "Renewal + upsell for additional risk operations automation seats.",
      status: LeadStatus.OPEN,
      tags: ["renewal", "expansion"],
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
      value: 48000,
      currency: "USD",
      probability: 100,
      source: "Inbound demo",
      status: LeadStatus.WON,
      closedAt: new Date("2026-04-02"),
      tags: ["land-and-expand"],
    },
  });

  await prisma.note.createMany({
    data: [
      {
        teamId: team.id,
        parentType: ParentEntityType.LEAD,
        parentId: lead1.id,
        body: "Champion confirmed data residency and clinical compliance constraints.",
      },
      {
        teamId: team.id,
        parentType: ParentEntityType.LEAD,
        parentId: lead2.id,
        body: "Legal requested DPA appendix and SOC2 bridge letter.",
      },
      {
        teamId: team.id,
        parentType: ParentEntityType.LEAD,
        parentId: lead3.id,
        body: "Procurement approved budget line if rollout starts before Q3.",
      },
    ],
  });

  await prisma.task.create({
    data: {
      teamId: team.id,
      parentType: ParentEntityType.LEAD,
      parentId: lead1.id,
      title: "Send redline package to legal stakeholders",
      assigneeId: user.id,
      done: false,
    },
  });

  console.log("Seeded fresh tenant:", {
    email,
    password,
    team: team.name,
    teamId: team.id,
    leads: 5,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
