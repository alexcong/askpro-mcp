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

// Import prompts
import {
  buildResearchAnalysisPrompt,
  researchAnalysisPrompt,
} from "./prompts/research-analysis.ts";
import {
  buildCurrentEventsPrompt,
  currentEventsPrompt,
} from "./prompts/current-events.ts";
import {
  buildTechnicalDocumentationPrompt,
  technicalDocumentationPrompt,
} from "./prompts/technical-documentation.ts";
import {
  buildCompareSourcesPrompt,
  compareSourcesPrompt,
} from "./prompts/compare-sources.ts";
import { buildFactCheckPrompt, factCheckPrompt } from "./prompts/fact-check.ts";
import { buildDeepthinkPrompt, deepthinkPrompt } from "./prompts/deepthink.ts";

class GeminiMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "askpro-mcp-server",
        version: "1.0.0",
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
      return {
        prompts: [
          researchAnalysisPrompt,
          currentEventsPrompt,
          technicalDocumentationPrompt,
          compareSourcesPrompt,
          factCheckPrompt,
          deepthinkPrompt,
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let toolCall;
        switch (name) {
          case "research_analysis":
            toolCall = buildResearchAnalysisPrompt(args || {});
            break;
          case "current_events":
            toolCall = buildCurrentEventsPrompt(args || {});
            break;
          case "technical_documentation":
            toolCall = buildTechnicalDocumentationPrompt(args || {});
            break;
          case "compare_sources":
            toolCall = buildCompareSourcesPrompt(args || {});
            break;
          case "fact_check":
            toolCall = buildFactCheckPrompt(args || {});
            break;
          case "deepthink":
            toolCall = buildDeepthinkPrompt(args || {});
            break;
          default:
            throw new Error(`Unknown prompt: ${name}`);
        }

        return {
          description: `Prompt for ${name}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Use the ${toolCall.tool} tool with these arguments: ${
                  JSON.stringify(toolCall.arguments, null, 2)
                }`,
              },
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to generate prompt: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    const hasApiKey = !!Deno.env.get("GEMINI_API_KEY");
    const hasModel = !!Deno.env.get("GEMINI_MODEL");
    const hasOpenAiKey = !!Deno.env.get("OPENAI_API_KEY");
    const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-5-pro";

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

  if (!Deno.env.get("OPENAI_MODEL")) {
    console.error("Info: OPENAI_MODEL not set, defaulting to gpt-5-pro");
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
