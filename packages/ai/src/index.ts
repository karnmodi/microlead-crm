/** User messages / prompt bodies for LLM calls — keep controllers thin. */

export type LeadSummaryContext = {
  leadTitle: string;
  stageName: string;
  companyName?: string;
  contactName?: string;
  value?: string;
  priority: string;
  recentNotes: string[];
};

export function buildLeadSummaryPrompt(ctx: LeadSummaryContext): string {
  const lines = [
    "Summarize this sales lead in 3–5 bullet points for a busy founder.",
    `Title: ${ctx.leadTitle}`,
    `Stage: ${ctx.stageName}`,
    `Priority: ${ctx.priority}`,
  ];
  if (ctx.value) lines.push(`Value: ${ctx.value}`);
  if (ctx.companyName) lines.push(`Company: ${ctx.companyName}`);
  if (ctx.contactName) lines.push(`Contact: ${ctx.contactName}`);
  if (ctx.recentNotes.length) {
    lines.push("Recent notes:");
    ctx.recentNotes.slice(0, 8).forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
  }
  lines.push("Focus on fit, risk, and what to do next. Be concise.");
  return lines.join("\n");
}

export type NextActionsContext = {
  entityLabel: string;
  leadTitle?: string;
  contactName?: string;
  stageName?: string;
  openTasks: string[];
  recentNotes: string[];
};

export function buildNextActionsPrompt(ctx: NextActionsContext): string {
  const lines = [
    "Suggest 3–5 concrete next actions for a CRM user (calls, emails, tasks).",
    `Record: ${ctx.entityLabel}`,
  ];
  if (ctx.leadTitle) lines.push(`Lead: ${ctx.leadTitle}`);
  if (ctx.contactName) lines.push(`Contact: ${ctx.contactName}`);
  if (ctx.stageName) lines.push(`Stage: ${ctx.stageName}`);
  if (ctx.openTasks.length) {
    lines.push("Open tasks:");
    ctx.openTasks.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (ctx.recentNotes.length) {
    lines.push("Notes:");
    ctx.recentNotes.slice(0, 5).forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
  }
  lines.push("Return numbered actions, each one line, no preamble.");
  return lines.join("\n");
}

export type OutreachContext = {
  channel: "email" | "linkedin";
  leadTitle: string;
  contactName?: string;
  companyName?: string;
  stageName?: string;
  tone?: string;
};

export function buildOutreachDraftPrompt(ctx: OutreachContext): string {
  return [
    `Write a short ${ctx.channel} outreach draft (under 180 words) for a B2B micro-SaaS/agency seller.`,
    `Lead: ${ctx.leadTitle}`,
    ctx.companyName ? `Company: ${ctx.companyName}` : "",
    ctx.contactName ? `Contact: ${ctx.contactName}` : "",
    `Stage: ${ctx.stageName}`,
    ctx.tone ? `Tone: ${ctx.tone}` : "Tone: professional, warm, not salesy.",
    "Include a clear CTA. No subject line for linkedin; for email include Subject: line first.",
  ]
    .filter(Boolean)
    .join("\n");
}
