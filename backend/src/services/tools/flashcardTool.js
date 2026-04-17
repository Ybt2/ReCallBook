const { z } = require("zod");
const llm = require("../agent");

const FlashcardSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().describe("A pergunta ou termo principal"),
      back: z.string().describe("A resposta ou definição detalhada"),
      hint: z.string().optional().describe("Uma dica opcional para ajudar o utilizador"),
    })
  ),
});

async function generateFlashcardsAction(context, numCards = 10, difficulty = "medium", userPrompt = "") {
  const structuredLlm = llm.withStructuredOutput(FlashcardSchema);

  const focus = userPrompt?.trim()
    ? `Focus especially on: ${userPrompt.trim()}.`
    : "Cover the most important ideas of the content.";

  const prompt = `
Based on the following content, generate ${numCards} flashcards for studying (difficulty "${difficulty}").
${focus}
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
    console.error("Erro ao gerar flashcards estruturados:", error);
    throw new Error("Falha ao formatar flashcards. Tenta novamente.");
  }
}

module.exports = { generateFlashcardsAction };
