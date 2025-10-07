import { assertEquals } from "@std/assert";

Deno.test("Server module - can import without errors", async () => {
  try {
    const serverModule = await import("../src/server.ts");
    assertEquals(typeof serverModule, "object");
  } catch (error) {
    throw new Error(
      `Failed to import server module: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
});

Deno.test("Server - environment validation", () => {
  const originalKey = Deno.env.get("GEMINI_API_KEY");
  Deno.env.delete("GEMINI_API_KEY");
  const originalOpenAiKey = Deno.env.get("OPENAI_API_KEY");
  Deno.env.set("OPENAI_API_KEY", "test-openai-key");
  const originalOpenAiModel = Deno.env.get("OPENAI_MODEL");
  Deno.env.set("OPENAI_MODEL", "test-model");

  try {
    const cmd = new Deno.Command("deno", {
      args: ["run", "--allow-env", "src/server.ts"],
      stdout: "piped",
      stderr: "piped",
    });

    const { stderr } = cmd.outputSync();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      stderrText.includes("GEMINI_API_KEY environment variable is required"),
      true,
    );
  } finally {
    if (originalKey) {
      Deno.env.set("GEMINI_API_KEY", originalKey);
    }
    if (originalOpenAiKey) {
      Deno.env.set("OPENAI_API_KEY", originalOpenAiKey);
    } else {
      Deno.env.delete("OPENAI_API_KEY");
    }
    if (originalOpenAiModel) {
      Deno.env.set("OPENAI_MODEL", originalOpenAiModel);
    } else {
      Deno.env.delete("OPENAI_MODEL");
    }
  }
});

Deno.test("Server - requires OpenAI API key", () => {
  const originalGeminiKey = Deno.env.get("GEMINI_API_KEY");
  const originalOpenAiKey = Deno.env.get("OPENAI_API_KEY");
  const originalOpenAiModel = Deno.env.get("OPENAI_MODEL");

  Deno.env.set("GEMINI_API_KEY", "test-key");
  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.set("OPENAI_MODEL", "test-model");

  try {
    const cmd = new Deno.Command("deno", {
      args: ["run", "--allow-env", "src/server.ts"],
      stdout: "piped",
      stderr: "piped",
    });

    const { stderr } = cmd.outputSync();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      stderrText.includes("OPENAI_API_KEY environment variable is required"),
      true,
    );
  } finally {
    if (originalGeminiKey) {
      Deno.env.set("GEMINI_API_KEY", originalGeminiKey);
    } else {
      Deno.env.delete("GEMINI_API_KEY");
    }

    if (originalOpenAiKey) {
      Deno.env.set("OPENAI_API_KEY", originalOpenAiKey);
    }
    if (originalOpenAiModel) {
      Deno.env.set("OPENAI_MODEL", originalOpenAiModel);
    } else {
      Deno.env.delete("OPENAI_MODEL");
    }
  }
});

Deno.test("Server - requires OpenAI model", () => {
  const originalGeminiKey = Deno.env.get("GEMINI_API_KEY");
  const originalOpenAiKey = Deno.env.get("OPENAI_API_KEY");
  const originalOpenAiModel = Deno.env.get("OPENAI_MODEL");

  Deno.env.set("GEMINI_API_KEY", "test-key");
  Deno.env.set("OPENAI_API_KEY", "test-openai-key");
  Deno.env.delete("OPENAI_MODEL");

  try {
    const cmd = new Deno.Command("deno", {
      args: ["run", "--allow-env", "src/server.ts"],
      stdout: "piped",
      stderr: "piped",
    });

    const { stderr } = cmd.outputSync();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      stderrText.includes("OPENAI_MODEL environment variable is required"),
      true,
    );
  } finally {
    if (originalGeminiKey) {
      Deno.env.set("GEMINI_API_KEY", originalGeminiKey);
    } else {
      Deno.env.delete("GEMINI_API_KEY");
    }

    if (originalOpenAiKey) {
      Deno.env.set("OPENAI_API_KEY", originalOpenAiKey);
    } else {
      Deno.env.delete("OPENAI_API_KEY");
    }

    if (originalOpenAiModel) {
      Deno.env.set("OPENAI_MODEL", originalOpenAiModel);
    } else {
      Deno.env.delete("OPENAI_MODEL");
    }
  }
});

Deno.test("Server tools - all tools are properly imported", async () => {
  const askGeminiModule = await import("../src/tools/ask-gemini.ts");
  const askGptModule = await import("../src/tools/ask-gpt.ts");

  assertEquals(typeof askGeminiModule.askGeminiTool, "object");
  assertEquals(typeof askGeminiModule.handleAskGemini, "function");
  assertEquals(typeof askGptModule.askGptTool, "object");
  assertEquals(typeof askGptModule.handleAskGpt, "function");
});

Deno.test("Server tools - have required properties", async () => {
  const askGeminiModule = await import("../src/tools/ask-gemini.ts");
  const askGptModule = await import("../src/tools/ask-gpt.ts");

  const tools = [askGeminiModule.askGeminiTool, askGptModule.askGptTool];

  for (const tool of tools) {
    assertEquals(typeof tool.name, "string");
    assertEquals(typeof tool.description, "string");
    assertEquals(typeof tool.inputSchema, "object");
    assertEquals(tool.inputSchema.type, "object");
    assertEquals(typeof tool.inputSchema.properties, "object");
    assertEquals(Array.isArray(tool.inputSchema.required), true);
  }
});
