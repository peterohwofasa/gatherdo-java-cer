import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*, exams(name, code, pass_percent, questions_per_sitting, duration_minutes)')
    .eq('id', attemptId)
    .eq('student_id', user.id)
    .single()

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        <Link href="/exams" className="text-sm text-teal-700 hover:underline">
          Back to exams
        </Link>
      </Header>

      <main className="max-w-lg mx-auto p-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Pass/Fail banner */}
          <div
            className={`px-6 py-8 text-center ${
              passed ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <div className="text-5xl font-black text-white mb-1">
              {passed ? 'PASS' : 'FAIL'}
            </div>
            <div className="text-white/80 text-sm">
              {exam?.name ?? 'Java Certification'}
            </div>
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

          {/* Actions */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            <Link
              href={`/review/${attemptId}`}
              className="block text-center rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Review wrong answers
            </Link>
            <Link
              href="/exams"
              className="block text-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
