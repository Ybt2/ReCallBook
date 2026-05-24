const { z } = require("zod");
const { createLlm } = require("../agent");
const { AppError } = require("../../middleware/errorHandler");

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correct: z.number().min(0).max(3),
      explanation: z.string().optional().default(""),
    })
  ),
});

async function generateQuizAction(context, numQuestions = 5, difficulty = "medium", userPrompt = "", model, userLanguage = "English") {
  if (!model) throw new Error("No model configured for quiz generation.");
  const lm = createLlm(model);
  const structuredLlm = lm.withStructuredOutput(QuizSchema);

  const focus = userPrompt?.trim()
    ? `Focus especially on: ${userPrompt.trim()}.`
    : "Cover the most important ideas of the content.";

  const prompt = `
You MUST respond entirely in ${userLanguage}. Every word of your response — questions, options, and explanations — must be written in ${userLanguage}.

Based on the following content, generate ${numQuestions} multiple choice questions with difficulty "${difficulty}".
${focus}
You MUST respond ONLY with a valid JSON object. No markdown, no extra text, no code blocks.
Every question MUST have all these fields: question, options (array of 4 strings), correct (number 0-3), explanation (string).

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
      "The AI model failed to generate a valid quiz. Try using a more capable model or a shorter prompt.",
      "MODEL_ERROR",
      502
    );
  }
}

module.exports = { generateQuizAction };