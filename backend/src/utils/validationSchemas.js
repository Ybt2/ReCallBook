const { z } = require("zod");

const emailSchema = z.string().email().max(100);
const passwordSchema = z.string().min(4).max(128);

const registerSchema = z.object({
  username: z.string().min(1).max(30),
  email: emailSchema,
  password: passwordSchema,
  language: z.string().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const uploadSchema = z.object({
  notebookId: z.union([z.string(), z.number()]),
  visionModel: z.string().optional(),
});

const quizGenerateSchema = z.object({
  notebookId: z.union([z.string(), z.number()]),
  docIds: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  numQuestions: z.number().int().min(1).max(50).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  model: z.string().optional(),
});

const flashcardGenerateSchema = z.object({
  notebookId: z.union([z.string(), z.number()]),
  docIds: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  numCards: z.number().int().min(1).max(100).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  model: z.string().optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      return res.status(400).json({
        error: first.message,
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  uploadSchema,
  quizGenerateSchema,
  flashcardGenerateSchema,
  validate,
};
