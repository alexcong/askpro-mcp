import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { OpenAIClient, OpenAIRequest } from "../openai-client.ts";

const AskGptArgsSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  temperature: z.number().min(0).max(2).optional().describe(
    "Controls randomness and creativity. Range: 0-2.  0=deterministic, 0.2=focused/factual, 0.7=balanced (default), 1.0-2.0=creative/diverse",
  ),
});

export const askGptTool: Tool = {
  name: "ask_gpt",
  description:
    "Use OpenAI GPT for deep reasoning, structured analysis, and complex problem solving.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description:
          "Your question, problem statement, or analysis request. Include any necessary context directly.",
      },
      temperature: {
        type: "number",
        minimum: 0,
        maximum: 2,
        description:
          "Controls randomness and creativity. 0=deterministic output, 0.2=focused/factual responses, 0.7=balanced (default), 1.0-2.0=creative/diverse outputs.",
      },
    },
    required: ["prompt"],
  },
};

export async function handleAskGpt(
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const validatedArgs = AskGptArgsSchema.parse(args);

  const openAiClient = new OpenAIClient();

  const request: OpenAIRequest = {
    prompt: validatedArgs.prompt,
    temperature: validatedArgs.temperature,
  };

  try {
    const response = await openAiClient.generate(request);

    let formattedResponse = response.text;

    return {
      content: [
        {
          type: "text",
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to generate response with GPT-5 Pro: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
