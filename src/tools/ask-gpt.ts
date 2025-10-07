import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { OpenAIClient, OpenAIRequest } from "../openai-client.ts";

const AskGptArgsSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
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
