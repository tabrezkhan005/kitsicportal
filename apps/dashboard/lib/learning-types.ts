export type QuestionType = "mcq" | "short" | "true_false";

export interface LearningQuestion {
  id: string;
  type?: QuestionType;
  prompt: string;
  answer?: string;
  options?: string[];
  correctIndex?: number;
  acceptableAnswers?: string[];
  explanation?: string;
}

export interface PlayerQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
}

export interface GradeResult {
  correct: boolean;
  feedback: string;
  explanation?: string;
  correctAnswer?: string;
}
