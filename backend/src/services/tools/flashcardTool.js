const { z } = require("zod");
const { createLlm } = require("../agent");

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
Based on the following content, generate ${numCards} flashcards for studying (difficulty "${difficulty}").
${focus}
You MUST respond in ${userLanguage}. All flashcard content must be written in ${userLanguage}.
Respond ONLY with a valid JSON object matching this structure, no extra text:
{
  "flashcards": [
    { "front": "question or term", "back": "answer or definition", "hint": "optional hint" }
  ]
}

Content:
${context}
`;

  try {
    return await structuredLlm.invoke(prompt);
  } catch (error) {
    console.error("Error generating structured flashcards:", error);
    throw new Error("Failed to format flashcards. Please try again.");
  }
}

module.exports = { generateFlashcardsAction };
