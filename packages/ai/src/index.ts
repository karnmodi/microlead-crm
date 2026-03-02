/** User messages / prompt bodies for LLM calls — keep controllers thin. */

export type DocumentExtract = {
  filename: string;
  text: string;
};

function appendDocumentExtracts(lines: string[], extracts?: DocumentExtract[]): void {
  if (!extracts?.length) return;
  lines.push("Uploaded documents (use as supporting context):");
  extracts.forEach((doc, i) => {
    lines.push(`  [${i + 1}] ${doc.filename}: "${doc.text.slice(0, 2000)}"`);
  });
}

export type LeadSummaryContext = {
  leadTitle: string;
  stageName: string;
  companyName?: string;
  contactName?: string;
  value?: string;
  currency?: string;
  priority: string;
  description?: string;
  expectedCloseDate?: string;
  probability?: number;
  source?: string;
  status?: string;
  tags?: string[];
  recentNotes: string[];
  businessContext?: string;
  documentExtracts?: DocumentExtract[];
};

export function buildLeadSummaryPrompt(ctx: LeadSummaryContext): string {
  const lines = [
    "Summarize this sales lead in 3–5 bullet points for a busy founder.",
    `Title: ${ctx.leadTitle}`,
    `Stage: ${ctx.stageName}`,
    `Priority: ${ctx.priority}`,
    `Status: ${ctx.status ?? "OPEN"}`,
  ];
  if (ctx.value) lines.push(`Value: ${ctx.value} ${ctx.currency ?? "USD"}`);
  if (ctx.description) lines.push(`Context:\n${ctx.description}`);
  if (ctx.expectedCloseDate) lines.push(`Expected close: ${ctx.expectedCloseDate}`);
  if (ctx.probability != null) lines.push(`Win probability: ${ctx.probability}%`);
  if (ctx.source) lines.push(`Source: ${ctx.source}`);
  if (ctx.tags?.length) lines.push(`Tags: ${ctx.tags.join(", ")}`);
  if (ctx.companyName) lines.push(`Company: ${ctx.companyName}`);
  if (ctx.contactName) lines.push(`Contact: ${ctx.contactName}`);
  if (ctx.businessContext) lines.push(`Business guidance:\n${ctx.businessContext}`);
  if (ctx.recentNotes.length) {
    lines.push("Recent notes:");
    ctx.recentNotes.slice(0, 8).forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
  }
  appendDocumentExtracts(lines, ctx.documentExtracts);
  lines.push("Focus on fit, risk, and what to do next. Be concise.");
  lines.push("Return markdown only. Use short bullet points and short section headers when useful.");
  return lines.join("\n");
}

export type NextActionsContext = {
  entityLabel: string;
  leadTitle?: string;
  contactName?: string;
  stageName?: string;
  description?: string;
  probability?: number;
  expectedCloseDate?: string;
  openTasks: string[];
  completedTasks?: string[];
  recentNotes: string[];
  businessContext?: string;
  documentExtracts?: DocumentExtract[];
};

export function buildNextActionsPrompt(ctx: NextActionsContext): string {
  const lines = [
    "Suggest 3–5 concrete next actions for a CRM user (calls, emails, tasks).",
    `Record: ${ctx.entityLabel}`,
  ];
  if (ctx.leadTitle) lines.push(`Lead: ${ctx.leadTitle}`);
  if (ctx.contactName) lines.push(`Contact: ${ctx.contactName}`);
  if (ctx.stageName) lines.push(`Stage: ${ctx.stageName}`);
  if (ctx.description) lines.push(`Deal context:\n${ctx.description}`);
  if (ctx.probability != null) lines.push(`Win probability: ${ctx.probability}%`);
  if (ctx.expectedCloseDate) lines.push(`Expected close: ${ctx.expectedCloseDate}`);
  if (ctx.openTasks.length) {
    lines.push("Open tasks:");
    ctx.openTasks.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (ctx.completedTasks?.length) {
    lines.push("Completed tasks (recent):");
    ctx.completedTasks.slice(0, 12).forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (ctx.recentNotes.length) {
    lines.push("Notes:");
    ctx.recentNotes.slice(0, 5).forEach((n, i) => lines.push(`  ${i + 1}. ${n}`));
  }
  if (ctx.businessContext) lines.push(`Business guidance:\n${ctx.businessContext}`);
  appendDocumentExtracts(lines, ctx.documentExtracts);
  lines.push("Return JSON only. No markdown, no code fences.");
  lines.push(
    'Use this exact shape: {"reasoningSummary":"...","idealPlan":["..."],"taskCandidates":[{"title":"...","dueAt":"YYYY-MM-DD"}],"riskFlags":["..."],"assumptions":["..."]}',
  );
  lines.push("reasoningSummary: 2-4 concise sentences explaining what should happen first and why.");
  lines.push("idealPlan: 3-5 sequenced bullets in priority order (first to last).");
  lines.push("taskCandidates: only necessary NEW tasks not already open or recently completed.");
  lines.push("taskCandidates: 2-4 unique tasks, each with title under 120 chars.");
  lines.push("taskCandidates.dueAt: required date in YYYY-MM-DD based on urgency and expected close.");
  lines.push("Never use relative dates like tomorrow/next week in dueAt.");
  lines.push("riskFlags and assumptions can be empty arrays.");
  return lines.join("\n");
}

export type OutreachContext = {
  channel: "email" | "linkedin";
  leadTitle: string;
  contactName?: string;
  companyName?: string;
  stageName?: string;
  description?: string;
  tone?: string;
  businessContext?: string;
  documentExtracts?: DocumentExtract[];
};

export function buildOutreachDraftPrompt(ctx: OutreachContext): string {
  const lines = [
    `Write a short ${ctx.channel} outreach draft (under 180 words) for a B2B micro-SaaS/agency seller.`,
    `Lead: ${ctx.leadTitle}`,
    ctx.companyName ? `Company: ${ctx.companyName}` : "",
    ctx.contactName ? `Contact: ${ctx.contactName}` : "",
    `Stage: ${ctx.stageName}`,
    ctx.description ? `Context: ${ctx.description}` : "",
    ctx.tone ? `Tone: ${ctx.tone}` : "Tone: professional, warm, not salesy.",
    ctx.businessContext ? `Business guidance:\n${ctx.businessContext}` : "",
  ].filter(Boolean);
  appendDocumentExtracts(lines, ctx.documentExtracts);
  lines.push(
    "Include a clear CTA.",
    "Return JSON only. No markdown, no code fences.",
    'If channel=email return: {"subject":"...","body":"...","reasoning":"..."}',
    'If channel=linkedin return: {"subject":"","body":"...","reasoning":"..."}',
    "Do not include a Subject: prefix inside body.",
  );
  return lines.join("\n");
}
