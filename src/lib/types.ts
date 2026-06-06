export type AttemptStatus = 'in_progress' | 'completed'

export interface Exam {
  id: string
  code: string
  name: string
  questions_per_sitting: number
  duration_minutes: number
  pass_percent: number
}

export interface QuestionForRunner {
  id: string
  question_number: number
  question_text: string
  code_block: string | null
  topic: string | null
  difficulty: string | null
  options: { label: string; text: string }[]
}

export interface QuestionForReview extends QuestionForRunner {
  correct_answer: string
  selected: string
}

export interface Attempt {
  id: string
  student_id: string
  exam_id: string
  status: AttemptStatus
  started_at: string
  finished_at: string | null
  time_limit_minutes: number
  score_correct: number | null
  score_percent: number | null
  passed: boolean | null
  question_order: string[]
}

export interface ExamState {
  attempt: Attempt
  exam: Exam
  questions: QuestionForRunner[]
  savedAnswers: Record<string, string>
  secondsRemaining: number
}
