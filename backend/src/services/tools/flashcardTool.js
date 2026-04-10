const { z } = require("zod");
const llm = require("../agent");

// 1. Definir o esquema para os Flashcards
const FlashcardSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().describe("A pergunta ou termo principal"),
      back: z.string().describe("A resposta ou definição detalhada"),
      hint: z.string().optional().describe("Uma dica opcional para ajudar o utilizador"),
    })
  ),
});

/**
 * Ação para gerar flashcards de forma estruturada.
 * Não depende de um "agente" para decidir; é executada diretamente.
 */
async function generateFlashcardsAction(context, numCards = 10) {
  // Forçamos o modelo a seguir o esquema do Zod
  const structuredLlm = llm.withStructuredOutput(FlashcardSchema);

  const prompt = `
Based on the following content, generate ${numCards} flashcards for studying.
Respond ONLY with a valid JSON object matching this structure, no extra text:
{
  "flashcards": [
    {
      "front": "question or term",
      "back": "answer or definition",
      "hint": "optional hint"
    }
  ]
}

Content:
${context}
    `;

  try {
    const result = await structuredLlm.invoke(prompt);
    return result;
  } catch (error) {
    console.error("Erro ao gerar flashcards estruturados:", error);
    throw new Error("Falha ao formatar flashcards. Tenta novamente.");
  }
}

module.exports = { generateFlashcardsAction };