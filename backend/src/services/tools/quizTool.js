const { z } = require("zod");
const { llm } = require("../agent");

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

const structuredLlm = llm.withStructuredOutput(QuizSchema);

async function generateQuizAction(context, numQuestions = 5, difficulty = "medium", userPrompt = "") {
  const focus = userPrompt?.trim()
    ? `Focus especially on: ${userPrompt.trim()}.`
    : "Cover the most important ideas of the content.";

  const prompt = `
Based on the following content, generate ${numQuestions} multiple choice questions with difficulty "${difficulty}".
${focus}
You MUST respond ONLY with a valid JSON object. No markdown, no extra text, no code blocks.
Every question MUST have all these fields: question, options (array of 4 strings), correct (number 0-3), explanation (string).

Example of valid response:
{"questions":[{"question":"What is X?","options":["A","B","C","D"],"correct":0,"explanation":"Because A is correct."}]}

Content:
${context}
`;

  return await structuredLlm.invoke(prompt);
}

module.exports = { generateQuizAction };
