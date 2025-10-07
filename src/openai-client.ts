import OpenAI from "openai";
import { z } from "zod";

const ConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenAI API key is required"),
  model: z.string().min(1, "OpenAI model is required"),
  baseUrl: z.string().url().optional(),
});

export interface OpenAIRequest {
  prompt: string;
}

export interface OpenAIResponse {
  text: string;
  reasoningSummary?: string | null;
  status: string;
}

export class OpenAIClient {
  private readonly model: string;
  private readonly client: OpenAI;

  constructor(config?: { apiKey?: string; model?: string; baseUrl?: string }) {
    const validatedConfig = ConfigSchema.parse({
      apiKey: config?.apiKey ?? Deno.env.get("OPENAI_API_KEY"),
      model: config?.model ?? Deno.env.get("OPENAI_MODEL"),
      baseUrl: config?.baseUrl ?? Deno.env.get("OPENAI_BASE_URL") ?? undefined,
    });

    this.model = validatedConfig.model;
    this.client = new OpenAI({
      apiKey: validatedConfig.apiKey,
      baseURL: validatedConfig.baseUrl,
    });
  }

  async generate(request: OpenAIRequest): Promise<OpenAIResponse> {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: request.prompt,
              },
            ],
          },
        ],
        text: {},
        reasoning: {},
        tools: [],
        store: false,
      });

      const text = this.extractOutputText(response) ||
        "No response text returned from OpenAI.";
      const reasoningSummary = this.extractReasoningSummary(response);
      const status = this.extractStatus(response);

      return {
        text,
        reasoningSummary,
        status,
      };
    } catch (error) {
      const message = this.normalizeError(error);
      throw new Error(`OpenAI generation failed: ${message}`);
    }
  }

  private extractOutputText(response: unknown): string {
    const result = response as
      | undefined
      | {
        output_text?: unknown;
        output?: unknown;
      };

    if (
      typeof result?.output_text === "string" && result.output_text.length > 0
    ) {
      return result.output_text;
    }

    const output = result?.output;
    if (!Array.isArray(output)) {
      return "";
    }

    const texts: string[] = [];
    for (const item of output) {
      if (
        item && typeof item === "object" && (item as { type?: string }).type ===
          "message" &&
        Array.isArray((item as { content?: unknown }).content)
      ) {
        for (const part of (item as { content: unknown[] }).content) {
          if (
            part && typeof part === "object" &&
            (part as { type?: string }).type === "output_text" &&
            typeof (part as { text?: unknown }).text === "string"
          ) {
            texts.push((part as { text: string }).text);
          }
        }
      }
    }

    return texts.join("\n\n");
  }

  private extractReasoningSummary(
    response: unknown,
  ): string | null | undefined {
    const reasoning = (response as { reasoning?: unknown })?.reasoning;
    if (!reasoning || typeof reasoning !== "object") {
      return undefined;
    }

    const summary = (reasoning as { summary?: unknown }).summary;
    if (typeof summary === "string") {
      return summary;
    }

    return summary == null ? null : undefined;
  }

  private extractStatus(response: unknown): string {
    const status = (response as { status?: unknown })?.status;
    return typeof status === "string" && status.length > 0 ? status : "unknown";
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === "object") {
      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    }

    return String(error);
  }
}
