import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/sign-out-button'
import { startAttempt } from '@/app/actions/exam'
import type { Exam } from '@/lib/types'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exams } = await supabase
    .from('exams')
    .select('*')
    .order('code')

  // Check for any in-progress attempts
  const { data: inProgress } = await supabase
    .from('attempts')
    .select('id, exam_id')
    .eq('student_id', user!.id)
    .eq('status', 'in_progress')

  const inProgressByExam = new Map((inProgress ?? []).map((a) => [a.exam_id, a.id]))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">GatherDO</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose an Exam</h1>
        <p className="text-sm text-gray-500 mb-8">
          Select a certification exam to begin a timed practice session.
        </p>

        {!exams?.length && (
          <p className="text-sm text-gray-400 border rounded p-4 bg-white">
            No exams available yet.
          </p>
        )}

        <div className="space-y-4">
          {(exams as Exam[] ?? []).map((exam) => {
            const resumeId = inProgressByExam.get(exam.id)
            return (
              <div key={exam.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{exam.name}</h2>
                    <div className="mt-1 flex gap-4 text-sm text-gray-500">
                      <span>{exam.questions_per_sitting} questions</span>
                      <span>{exam.duration_minutes} minutes</span>
                      <span>Pass: {exam.pass_percent}%</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 font-mono">{exam.code}</p>
                  </div>

                  <form action={startAttempt.bind(null, exam.id)}>
                    <button
                      type="submit"
                      className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      {resumeId ? 'Resume Exam' : 'Start Exam'}
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>

        {/* Past attempts */}
        <PastAttempts userId={user!.id} />
      </main>
    </div>
  )
}

async function PastAttempts({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: attempts } = await supabase
    .from('attempts')
    .select('id, exam_id, status, score_percent, passed, finished_at, exams(name, code)')
    .eq('student_id', userId)
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(10)

  if (!attempts?.length) return null

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Attempts</h2>
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {attempts.map((a) => {
          const exam = a.exams as unknown as { name: string; code: string } | null
          const date = a.finished_at
            ? new Date(a.finished_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—'
          return (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <span className="font-medium text-gray-800">{exam?.name ?? 'Unknown exam'}</span>
                <span className="ml-2 text-gray-400 text-xs">{date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600">
                  {a.score_percent != null ? `${Number(a.score_percent).toFixed(1)}%` : '—'}
                </span>
                <span
                  className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                    a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {a.passed ? 'PASS' : 'FAIL'}
                </span>
                <a
                  href={`/results/${a.id}`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  View
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
