import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

    const res = await fetch("https://api.resend.com/emails", {
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
    });

    if (!res.ok) {
      const text = await res.text();
      this.log.warn(`Resend failed ${res.status}: ${text}`);
      return { sent: false };
    }
    return { sent: true };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
