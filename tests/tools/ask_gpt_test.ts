import { assertEquals, assertRejects } from "@std/assert";
import {
  askGptTool,
  getGptAnswerTool,
  handleAskGpt,
  handleGetGptAnswer,
} from "../../src/tools/ask-gpt.ts";

Deno.test("askGptTool - has correct structure", () => {
  assertEquals(askGptTool.name, "ask_gpt");
  assertEquals(typeof askGptTool.description, "string");
  assertEquals(typeof askGptTool.inputSchema, "object");
  assertEquals(askGptTool.inputSchema.required, ["prompt"]);
});

Deno.test("getGptAnswerTool - has correct structure", () => {
  assertEquals(getGptAnswerTool.name, "get_gpt_answer");
  assertEquals(typeof getGptAnswerTool.description, "string");
  assertEquals(typeof getGptAnswerTool.inputSchema, "object");
  assertEquals(getGptAnswerTool.inputSchema.required, ["response_id"]);
});

Deno.test("handleAskGpt - validates required prompt", async () => {
  await assertRejects(() => handleAskGpt({}), Error);
  await assertRejects(() => handleAskGpt({ prompt: "" }), Error);
});

Deno.test("handleGetGptAnswer - validates required response_id", async () => {
  await assertRejects(() => handleGetGptAnswer({}), Error);
  await assertRejects(() => handleGetGptAnswer({ response_id: "" }), Error);
});

Deno.test("handleAskGpt - accepts valid arguments", async () => {
  Deno.env.set("OPENAI_API_KEY", "test-key");
  Deno.env.set("OPENAI_MODEL", "test-model");

  try {
    await handleAskGpt({
      prompt: "Explain artificial intelligence basics.",
    });
  } catch (error) {
    assertEquals(
      error instanceof Error &&
        error.message.includes("Failed to enqueue GPT request"),
      true,
    );
  }

  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.delete("OPENAI_MODEL");
});

Deno.test("handleGetGptAnswer - accepts valid arguments", async () => {
  Deno.env.set("OPENAI_API_KEY", "test-key");
  Deno.env.set("OPENAI_MODEL", "test-model");

  try {
    await handleGetGptAnswer({
      response_id: "resp_test",
    });
  } catch (error) {
    assertEquals(
      error instanceof Error &&
        error.message.includes("Failed to retrieve GPT response"),
      true,
    );
  }

  Deno.env.delete("OPENAI_API_KEY");
  Deno.env.delete("OPENAI_MODEL");
});
