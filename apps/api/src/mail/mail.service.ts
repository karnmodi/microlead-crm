import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FetchHttpResponse } from "../fetch-http-response";

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends workspace invite email when RESEND_API_KEY is set; otherwise no-ops.
   */
  async sendWorkspaceInvite(params: {
    to: string;
    acceptUrl: string;
    teamName: string;
  }): Promise<{ sent: boolean }> {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    const from = this.config.get<string>("RESEND_FROM") ?? "onboarding@resend.dev";

    if (!apiKey) {
      this.log.debug(`Skipping invite email to ${params.to} (RESEND_API_KEY unset)`);
      return { sent: false };
    }

    const res = (await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: `You're invited to ${params.teamName}`,
        html: `<p>You've been invited to join <strong>${escapeHtml(params.teamName)}</strong> on microlead-crm.</p>
<p><a href="${escapeHtml(params.acceptUrl)}">Accept invitation</a></p>
<p>If you did not expect this, you can ignore this email.</p>`,
      }),
    })) as FetchHttpResponse;

    if (!res.ok) {
      const text = await res.text();
      this.log.warn(`Resend failed ${res.status}: ${text}`);
      return { sent: false };
    }
    return { sent: true };
  }

  async sendOutboundEmail(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ sent: boolean; id?: string }> {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    const from = this.config.get<string>("RESEND_FROM") ?? "onboarding@resend.dev";
    if (!apiKey) {
      this.log.debug(`Skipping outbound email to ${params.to} (RESEND_API_KEY unset)`);
      return { sent: false };
    }

    const res = (await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html:
          params.html ??
          `<p>${escapeHtml(params.text).replace(/\n/g, "<br/>")}</p>`,
      }),
    })) as FetchHttpResponse;

    if (!res.ok) {
      const text = await res.text();
      this.log.warn(`Resend outbound failed ${res.status}: ${text}`);
      return { sent: false };
    }
    const data = (await res.json()) as { id?: string };
    return { sent: true, id: data.id };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
