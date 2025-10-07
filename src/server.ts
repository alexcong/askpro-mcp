import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { askGeminiTool, handleAskGemini } from "./tools/ask-gemini.ts";
import { askGptTool, handleAskGpt } from "./tools/ask-gpt.ts";

class GeminiMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "askpro-mcp-server",
        version: "0.1.1",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [askGeminiTool, askGptTool],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "ask_gemini":
            return await handleAskGemini(args);
          case "ask_gpt":
            return await handleAskGpt(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, () => {
      return { prompts: [] };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, () => {
      throw new Error("No prompts are available in this server.");
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    const hasApiKey = !!Deno.env.get("GEMINI_API_KEY");
    const hasModel = !!Deno.env.get("GEMINI_MODEL");
    const hasOpenAiKey = !!Deno.env.get("OPENAI_API_KEY");
    const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "NOT SET";

    console.error(
      `AskPro MCP Server running on stdio (Gemini API Key: ${
        hasApiKey ? "configured" : "NOT SET"
      }, Gemini Model: ${
        hasModel ? Deno.env.get("GEMINI_MODEL") : "NOT SET"
      }, OpenAI API Key: ${
        hasOpenAiKey ? "configured" : "NOT SET"
      }, OpenAI Model: ${openAiModel})`,
    );
  }
}

async function main(): Promise<void> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is required");
    console.error("Please set your Gemini API key:");
    console.error("export GEMINI_API_KEY=your_api_key_here");
    Deno.exit(1);
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    console.error("Please set your OpenAI API key:");
    console.error("export OPENAI_API_KEY=your_api_key_here");
    Deno.exit(1);
  }

  const openAiModel = Deno.env.get("OPENAI_MODEL");
  if (!openAiModel) {
    console.error("Error: OPENAI_MODEL environment variable is required");
    console.error("Please set your OpenAI model identifier (e.g., gpt-5-pro):");
    console.error("export OPENAI_MODEL=gpt-5-pro");
    Deno.exit(1);
  }

  const server = new GeminiMcpServer();
  await server.run();
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Server error:", error);
    Deno.exit(1);
  });
}
