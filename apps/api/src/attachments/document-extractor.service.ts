import * as fs from "fs";
import * as path from "path";
import { Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";

const MAX_STORED_CHARS = 12_000;
const VISION_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      result[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
    return result;
  } catch {
    return {};
  }
}

function loadAzureConfigFromFile(): {
  key: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
} | null {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", "..", ".env"),
  ];
  const merged: Record<string, string> = {};
  for (const p of candidates) {
    const parsed = parseEnvFile(p);
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in merged)) merged[k] = v;
    }
  }
  const key = merged["AZURE_OPENAI_API_KEY"]?.trim();
  const endpoint = merged["AZURE_OPENAI_ENDPOINT"]?.trim()?.replace(/\/$/, "");
  const deployment = merged["AZURE_OPENAI_DEPLOYMENT"]?.trim();
  const apiVersion = merged["AZURE_OPENAI_API_VERSION"]?.trim() ?? "2024-08-01-preview";
  if (key && endpoint && deployment) return { key, endpoint, deployment, apiVersion };
  return null;
}

@Injectable()
export class DocumentExtractorService {
  private readonly logger = new Logger(DocumentExtractorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Entry point — called fire-and-forget after an attachment row is persisted.
   * Updates the attachment row with the extracted text and a status tag.
   */
  async extract(attachmentId: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { extractionStatus: "pending" },
    });

    try {
      const text = await this.extractText(buffer, mimeType);
      if (text === null) {
        await this.prisma.attachment.update({
          where: { id: attachmentId },
          data: { extractionStatus: "unsupported" },
        });
        return;
      }
      const truncated = text.slice(0, MAX_STORED_CHARS);
      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { extractedText: truncated, extractionStatus: "done" },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Extraction failed for attachment ${attachmentId}: ${msg}`);
      await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: { extractionStatus: "error" },
      });
    }
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string | null> {
    const mime = mimeType.toLowerCase();

    if (mime === "application/pdf") {
      return this.extractPdf(buffer);
    }

    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword" ||
      mime === "application/vnd.ms-word"
    ) {
      return this.extractWord(buffer);
    }

    if (VISION_MIME_TYPES.has(mime)) {
      return this.extractImage(buffer, mime);
    }

    if (mime.startsWith("text/") || mime === "application/csv" || mime === "text/csv") {
      return buffer.toString("utf8");
    }

    return null;
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  private async extractWord(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth") as {
      extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  private async extractImage(buffer: Buffer, mimeType: string): Promise<string> {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const azureCfg = loadAzureConfigFromFile();

    if (azureCfg) {
      return this.extractImageAzure(dataUrl, azureCfg);
    }

    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error("No OpenAI or Azure credentials available for image extraction");
    }
    const openai = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o";
    const res = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this document/image in detail and extract all visible text. Be thorough. Respond in plain text only.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 1500,
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  }

  private async extractImageAzure(
    dataUrl: string,
    cfg: { key: string; endpoint: string; deployment: string; apiVersion: string },
  ): Promise<string> {
    const url = `${cfg.endpoint}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`;
    const body = {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this document/image in detail and extract all visible text. Be thorough. Respond in plain text only.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 1500,
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(`Azure vision error ${res.status}: ${txt}`);
    }
    type AzureChatResponse = {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const data = (await res.json()) as AzureChatResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}
