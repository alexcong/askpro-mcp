import { assertEquals, assertRejects } from "@std/assert";
import { askGptTool, handleAskGpt } from "../../src/tools/ask-gpt.ts";

Deno.test("askGptTool - has correct structure", () => {
  assertEquals(askGptTool.name, "ask_gpt");
  assertEquals(typeof askGptTool.description, "string");
  assertEquals(typeof askGptTool.inputSchema, "object");
  assertEquals(askGptTool.inputSchema.required, ["prompt"]);
});

Deno.test("handleAskGpt - validates required prompt", async () => {
  await assertRejects(() => handleAskGpt({}), Error);
  await assertRejects(() => handleAskGpt({ prompt: "" }), Error);
});

Deno.test("handleAskGpt - validates temperature range", async () => {
  await assertRejects(
    () =>
      handleAskGpt({
        prompt: "test",
        temperature: -1,
      }),
    Error,
  );

  await assertRejects(
    () =>
      handleAskGpt({
        prompt: "test",
        temperature: 3,
      }),
    Error,
  );
});

Deno.test("handleAskGpt - accepts valid arguments", async () => {
  Deno.env.set("OPENAI_API_KEY", "test-key");

  try {
    await handleAskGpt({
      prompt: "Explain artificial intelligence basics.",
      temperature: 0.7,
    });
  } catch (error) {
    assertEquals(
      error instanceof Error &&
        error.message.includes("Failed to generate response with GPT-5 Pro"),
      true,
    );
  }

  Deno.env.delete("OPENAI_API_KEY");
});
