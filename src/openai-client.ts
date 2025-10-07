import { z } from "zod";

const ConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenAI API key is required"),
  model: z.string().min(1, "OpenAI model is required"),
  baseUrl: z.string().url().min(1, "OpenAI base URL is required"),
});

export interface OpenAIRequest {
  prompt: string;
  temperature?: number;
}

export interface OpenAIResponse {
  text: string;
  metadata?: {
    sources?: string[];
  };
}

export class OpenAIClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config?: { apiKey?: string; model?: string; baseUrl?: string }) {
    const validatedConfig = ConfigSchema.parse({
      apiKey: config?.apiKey ?? Deno.env.get("OPENAI_API_KEY"),
      model: config?.model ?? Deno.env.get("OPENAI_MODEL"),
      baseUrl: config?.baseUrl ??
        Deno.env.get("OPENAI_BASE_URL") ??
        "https://api.openai.com",
    });

    this.apiKey = validatedConfig.apiKey;
    this.model = validatedConfig.model;
    this.baseUrl = validatedConfig.baseUrl.replace(/\/+$/, "");
  }

  async generate(request: OpenAIRequest): Promise<OpenAIResponse> {
    const payload = {
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
      tools: [
        {
          type: "web_search",
        },
      ],
      temperature: request.temperature ?? 0.7,
    };

    const response = await fetch(`${this.baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI response API error (${response.status}): ${errorText}`,
      );
    }

    const json = await response.json();

    const primaryText = typeof json.output_text === "string"
      ? json.output_text
      : "";
    const fallbackText = this.extractOutputText(json.output);
    const text = primaryText || fallbackText ||
      "No response text returned from OpenAI.";

    const sources = this.extractSources(json.output);

    return {
      text,
      metadata: sources.length > 0 ? { sources } : undefined,
    };
  }

  private extractOutputText(
    output: unknown,
  ): string {
    if (!Array.isArray(output)) {
      return "";
    }

    const texts: string[] = [];
    for (const item of output) {
      if (
        item && typeof item === "object" && item.type === "message" &&
        Array.isArray(item.content)
      ) {
        for (const content of item.content) {
          if (
            content && typeof content === "object" &&
            content.type === "output_text" && typeof content.text === "string"
          ) {
            texts.push(content.text);
          }
        }
      }
    }

    return texts.join("\n\n");
  }

  private extractSources(output: unknown): string[] {
    const urls = new Set<string>();

    const traverse = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) {
          traverse(item);
        }
        return;
      }

      if (value && typeof value === "object") {
        for (const [key, val] of Object.entries(value)) {
          if (
            (key === "url" || key === "uri" || key.endsWith("_url")) &&
            typeof val === "string"
          ) {
            urls.add(val);
          } else {
            traverse(val);
          }
        }
      }
    };

    traverse(output);

    return [...urls];
  }
}
