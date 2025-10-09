import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  OpenAIClient,
  OpenAIRequest,
} from "../openai-client.ts";

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

const GetGptAnswerArgsSchema = z.object({
  response_id: z.string().min(1, "Response ID is required"),
});

export const getGptAnswerTool: Tool = {
  name: "get_gpt_answer",
  description:
    "Retrieve the completed GPT response using a previously returned response ID.",
  inputSchema: {
    type: "object",
    properties: {
      response_id: {
        type: "string",
        description:
          "The response identifier returned by the ask_gpt tool when the request was enqueued.",
      },
    },
    required: ["response_id"],
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
    const response = await openAiClient.createBackgroundResponse(request);

    return {
      content: [
        {
          type: "text",
          text: response.id,
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to enqueue GPT request: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function handleGetGptAnswer(
  args: unknown,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const validatedArgs = GetGptAnswerArgsSchema.parse(args);

  const openAiClient = new OpenAIClient();

  try {
    const response = await openAiClient.retrieveResponse(
      validatedArgs.response_id,
    );

    let formattedResponse = response.text;

    if (response.reasoningSummary) {
      formattedResponse +=
        `\n\n**Reasoning Summary:** ${response.reasoningSummary}`;
    }

    if (response.status && response.status !== "completed") {
      formattedResponse += `\n\n_Status: ${response.status}_`;
    }

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
      `Failed to retrieve GPT response: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
