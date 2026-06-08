import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import Link from 'next/link'

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_instructor')
    .eq('id', user.id)
    .single()

  const isInstructor = !!profile?.is_instructor
  const client = isInstructor ? await createServiceClient() : supabase

  let query = client
    .from('attempts')
    .select('*, exams(name, code, pass_percent, questions_per_sitting, duration_minutes)')
    .eq('id', attemptId)
  if (!isInstructor) {
    query = query.eq('student_id', user.id)
  }

  const { data: attempt } = await query.single()

  if (!attempt) redirect('/exams')
  if (attempt.status !== 'completed') redirect(`/exam/${attemptId}`)

  const exam = attempt.exams as {
    name: string
    code: string
    pass_percent: number
    questions_per_sitting: number
    duration_minutes: number
  } | null

  const scorePercent = Number(attempt.score_percent ?? 0)
  const passed = attempt.passed

  const finishedAt = attempt.finished_at
    ? new Date(attempt.finished_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  // Topic breakdown — join attempt_answers → questions.topic
  const { data: answerRows } = await client
    .from('attempt_answers')
    .select('is_correct, questions(topic)')
    .eq('attempt_id', attemptId)

  type TopicStat = { total: number; correct: number }
  const topicMap = new Map<string, TopicStat>()
  for (const row of answerRows ?? []) {
    const topic = (row.questions as unknown as { topic: string | null } | null)?.topic
    if (!topic) continue
    const stat = topicMap.get(topic) ?? { total: 0, correct: 0 }
    stat.total++
    if (row.is_correct) stat.correct++
    topicMap.set(topic, stat)
  }
  const topicBreakdown = Array.from(topicMap.entries())
    .map(([topic, { total, correct }]) => ({
      topic,
      total,
      correct,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        <Link href="/exams" className="text-sm text-teal-700 hover:underline">
          Back to exams
        </Link>
      </Header>

      <main className="max-w-lg mx-auto p-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Score hero banner */}
          <div
            className={`px-6 py-10 text-center ${
              passed
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gradient-to-br from-red-500 to-rose-600'
            }`}
          >
            <p className="text-7xl font-extrabold tabular-nums text-white mb-3">
              {scorePercent.toFixed(1)}%
            </p>
            <span className="inline-block rounded-full border-2 border-white/30 px-5 py-1.5 text-sm font-bold text-white">
              {passed ? 'PASS' : 'FAIL'}
            </span>
            <p className="mt-3 text-sm text-white/70">
              {exam?.name ?? 'Java Certification'}
            </p>
          </div>

          {/* Score details */}
          <div className="px-6 py-6 space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Your score</span>
              <span className="font-bold text-2xl text-gray-900">
                {scorePercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Correct answers</span>
              <span className="font-semibold text-gray-900">
                {attempt.score_correct} / {attempt.question_order?.length ?? exam?.questions_per_sitting ?? '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Pass mark</span>
              <span className="text-gray-700">{exam?.pass_percent ?? '—'}%</span>
            </div>
            {finishedAt && (
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Completed</span>
                <span className="text-sm text-gray-700">{finishedAt}</span>
              </div>
            )}
          </div>

          {/* Topic breakdown — only rendered when topic data exists (SE 17) */}
          {topicBreakdown.length > 0 && (
            <div className="px-6 py-5 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Score by Topic
              </h3>
              <div className="space-y-3">
                {topicBreakdown.map(({ topic, total, correct, pct }) => (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-700">{topic}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400 tabular-nums">{correct}/{total}</span>
                        <span
                          className={`text-sm font-semibold tabular-nums w-10 text-right ${
                            pct >= (exam?.pass_percent ?? 68)
                              ? 'text-green-600'
                              : 'text-red-500'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            <Link
              href={`/review/${attemptId}`}
              className="block text-center rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 hover:scale-[1.02] transition-all shadow-sm"
            >
              Review wrong answers
            </Link>
            <a
              href={`/results/${attemptId}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:scale-[1.02] transition-all shadow-sm"
            >
              Download Summary
            </a>
            <Link
              href="/exams"
              className="block text-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:scale-[1.02] transition-all shadow-sm"
            >
              Take another exam
            </Link>
          </div>
        </div>

        {!passed && (
          <p className="mt-6 text-center text-sm text-gray-500">
            You need {exam?.pass_percent ?? '—'}% to pass. Review your wrong answers and try again.
          </p>
        )}
      </main>
    </div>
  )
}
