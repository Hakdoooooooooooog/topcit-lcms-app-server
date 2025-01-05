import { z } from "zod";

const QuizSchemaStage1 = z.object({
  topicId: z.string().min(1, "Please enter a topic id."),
  quizTitle: z.string().min(1, "Please enter a quiz title."),
  maxAttempts: z
    .string()
    .min(1, "Please enter a number of attempts.")
    .default("1"),
  numofQuestions: z
    .string()
    .min(1, "Please enter a number of questions.")
    .default("1"),
});

export const QuizSchemaStage2 = z.object({
  quizQuestions: z.array(
    z.object({
      quizId: z.string().min(1, "Please enter a quiz id."),
      question: z.string().min(1, "Please enter a question text."),
      questionType: z.string().min(1, "Please select a question type."),
      correctAnswer: z.string().min(1, "Please enter a correct answer."),
      multipleChoiceOptions: z.array(
        z.object({
          optionText: z
            .string()
            .min(1, "Please enter an option.")
            .refine(
              (text) => /^[A-Z]\)\s/.test(text),
              'Options must start with "X) e.g., "A) lorem ipsum".'
            ),
        })
      ),
    })
  ),
});

export const QuizSchema = z.union([QuizSchemaStage1, QuizSchemaStage2]);
