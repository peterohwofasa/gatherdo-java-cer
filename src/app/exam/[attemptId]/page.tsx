import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExamRunner } from '@/components/exam-runner'
import type { ExamState, QuestionForRunner } from '@/lib/types'

export default async function ExamRunnerPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Load attempt
  const { data: attempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('student_id', user.id)
    .single()

  if (!attempt) redirect('/exams')
  if (attempt.status === 'completed') redirect(`/results/${attemptId}`)

  // Check if time has expired — if so, auto-submit by redirecting to a submit handler
  const startedAt = new Date(attempt.started_at).getTime()
  const limitMs = attempt.time_limit_minutes * 60 * 1000
  const nowMs = Date.now()
  const secondsRemaining = Math.max(0, Math.floor((startedAt + limitMs - nowMs) / 1000))

  // If already expired on server load, trigger submit action
  if (secondsRemaining <= 0) {
    const { submitAttempt } = await import('@/app/actions/exam')
    await submitAttempt(attemptId)
    return null
  }

  // Load exam
  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', attempt.exam_id)
    .single()

  if (!exam) redirect('/exams')

  // Load questions in question_order (without correct_answer)
  const { data: questionRows } = await supabase
    .from('questions')
    .select('id, question_number, question_text, code_block, topic, difficulty')
    .in('id', attempt.question_order)

  if (!questionRows?.length) redirect('/exams')

  // Load options for all questions
  const { data: optionRows } = await supabase
    .from('question_options')
    .select('question_id, label, text')
    .in('question_id', attempt.question_order)
    .order('label')

  const optionsByQuestion = new Map<string, { label: string; text: string }[]>()
  for (const opt of optionRows ?? []) {
    const arr = optionsByQuestion.get(opt.question_id) ?? []
    arr.push({ label: opt.label, text: opt.text })
    optionsByQuestion.set(opt.question_id, arr)
  }

  // Build questions in the randomized order
  const questionById = new Map(questionRows.map((q) => [q.id, q]))
  const questions: QuestionForRunner[] = attempt.question_order
    .map((id: string) => {
      const q = questionById.get(id)
      if (!q) return null
      return {
        ...q,
        options: optionsByQuestion.get(id) ?? [],
      }
    })
    .filter(Boolean) as QuestionForRunner[]

  // Load saved answers
  const { data: savedAnswerRows } = await supabase
    .from('attempt_answers')
    .select('question_id, selected')
    .eq('attempt_id', attemptId)

  const savedAnswers: Record<string, string> = {}
  for (const row of savedAnswerRows ?? []) {
    savedAnswers[row.question_id] = row.selected
  }

  const state: ExamState = {
    attempt,
    exam,
    questions,
    savedAnswers,
    secondsRemaining,
  }

  return <ExamRunner state={state} />
}
