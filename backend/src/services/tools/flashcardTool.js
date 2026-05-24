const { z } = require("zod");
const { createLlm } = require("../agent");
const { AppError } = require("../../middleware/errorHandler");

const FlashcardSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().describe("The main question or term"),
      back: z.string().describe("The detailed answer or definition"),
      hint: z.string().optional().describe("An optional hint to help the user"),
    })
  ),
});

async function generateFlashcardsAction(context, numCards = 10, difficulty = "medium", userPrompt = "", model, userLanguage = "English") {
  if (!model) throw new Error("No model configured for flashcard generation.");
  const lm = createLlm(model);
  const structuredLlm = lm.withStructuredOutput(FlashcardSchema);

  const focus = userPrompt?.trim()
    ? `Focus especially on: ${userPrompt.trim()}.`
    : "Cover the most important ideas of the content.";

  const prompt = `
You MUST respond entirely in ${userLanguage}. Every word of your response — front, back, and hints — must be written in ${userLanguage}.

Based on the following content, generate ${numCards} flashcards for studying (difficulty "${difficulty}").
${focus}
Respond ONLY with a valid JSON object matching this structure, no extra text:
{
  "flashcards": [
    { "front": "string", "back": "string", "hint": "string" }
  ]
}

Content:
${context}
`;

  try {
    return await structuredLlm.invoke(prompt);
  } catch (err) {
    const msg = err?.message || "";
    if (/fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET/.test(msg)) {
      throw new AppError(
        "AI model service is unreachable. Please check if the model is running.",
        "MODEL_UNAVAILABLE",
        504
      );
    }
    throw new AppError(
      "The AI model failed to generate valid flashcards. Try using a more capable model or a shorter prompt.",
      "MODEL_ERROR",
      502
    );
  }
}

module.exports = { generateFlashcardsAction };
