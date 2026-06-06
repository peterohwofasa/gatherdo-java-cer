'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function startAttempt(examId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Resume existing in-progress attempt for this exam if one exists
  const { data: existing } = await supabase
    .from('attempts')
    .select('id')
    .eq('student_id', user.id)
    .eq('exam_id', examId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (existing) {
    redirect(`/exam/${existing.id}`)
  }

  // Fetch exam config
  const { data: exam, error: examErr } = await supabase
    .from('exams')
    .select('questions_per_sitting, duration_minutes')
    .eq('id', examId)
    .single()

  if (examErr || !exam) redirect('/exams')

  // Draw randomized question IDs
  const { data: questionRows, error: qErr } = await supabase
    .from('questions')
    .select('id')
    .eq('exam_id', examId)

  if (qErr || !questionRows?.length) redirect('/exams')

  const shuffled = shuffle(questionRows.map((r) => r.id))
  const draw = shuffled.slice(0, exam.questions_per_sitting)

  const { data: attempt, error: createErr } = await supabase
    .from('attempts')
    .insert({
      student_id: user.id,
      exam_id: examId,
      time_limit_minutes: exam.duration_minutes,
      question_order: draw,
    })
    .select('id')
    .single()

  if (createErr || !attempt) redirect('/exams')

  redirect(`/exam/${attempt.id}`)
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selected: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Verify ownership and active status
  const { data: attempt } = await supabase
    .from('attempts')
    .select('student_id, status')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.student_id !== user.id || attempt.status !== 'in_progress') return

  await supabase
    .from('attempt_answers')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, selected, updated_at: new Date().toISOString() },
      { onConflict: 'attempt_id,question_id' }
    )
}

export async function submitAttempt(attemptId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Verify ownership — use anon client first
  const { data: attempt } = await supabase
    .from('attempts')
    .select('student_id, status, exam_id, question_order, started_at, time_limit_minutes')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.student_id !== user.id) redirect('/exams')
  if (attempt.status === 'completed') redirect(`/results/${attemptId}`)

  // Time check: if time has expired, finalize regardless
  const startedAt = new Date(attempt.started_at).getTime()
  const limitMs = attempt.time_limit_minutes * 60 * 1000
  const now = Date.now()
  const expired = now > startedAt + limitMs

  // Use service client to access correct_answer
  const svc = await createServiceClient()

  const { data: questions } = await svc
    .from('questions')
    .select('id, correct_answer')
    .in('id', attempt.question_order)

  const { data: answers } = await svc
    .from('attempt_answers')
    .select('question_id, selected')
    .eq('attempt_id', attemptId)

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a.selected]))
  const questionMap = new Map((questions ?? []).map((q) => [q.id, q.correct_answer]))

  let correct = 0
  const answerUpdates: { attempt_id: string; question_id: string; selected: string; is_correct: boolean; updated_at: string }[] = []

  for (const qid of attempt.question_order) {
    const selected = answerMap.get(qid) ?? ''
    const correctAnswer = questionMap.get(qid) ?? ''
    // All-or-nothing: sort both to compare multi-select
    const isCorrect = selected.split('').sort().join('') === correctAnswer.split('').sort().join('')

    if (isCorrect && selected) correct++

    if (selected) {
      answerUpdates.push({
        attempt_id: attemptId,
        question_id: qid,
        selected,
        is_correct: isCorrect,
        updated_at: new Date().toISOString(),
      })
    }
  }

  const total = attempt.question_order.length
  const scorePercent = total > 0 ? (correct / total) * 100 : 0

  // Get exam pass_percent
  const { data: exam } = await svc
    .from('exams')
    .select('pass_percent')
    .eq('id', attempt.exam_id)
    .single()

  const passed = exam ? scorePercent >= exam.pass_percent : false

  // Update answers with is_correct flags
  if (answerUpdates.length) {
    await svc
      .from('attempt_answers')
      .upsert(answerUpdates, { onConflict: 'attempt_id,question_id' })
  }

  // Finalize attempt
  await svc
    .from('attempts')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      score_correct: correct,
      score_percent: Math.round(scorePercent * 100) / 100,
      passed,
    })
    .eq('id', attemptId)

  redirect(`/results/${attemptId}`)
}
