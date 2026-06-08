import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PrintTrigger } from '@/components/print-trigger'

export default async function PrintPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

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
  if (!isInstructor) query = query.eq('student_id', user.id)

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

  // Student email — works for both own attempts and instructor viewing student's
  const { data: studentProfile } = await client
    .from('profiles')
    .select('email')
    .eq('id', attempt.student_id)
    .single()
  const studentEmail = studentProfile?.email ?? user.email ?? '—'

  const scorePercent = Number(attempt.score_percent ?? 0)
  const passed = attempt.passed
  const finishedAt = attempt.finished_at
    ? new Date(attempt.finished_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  // Topic breakdown (same logic as results page)
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

  const passMarkPct = exam?.pass_percent ?? 68

  return (
    <>
      {/* @page margins + screen preview background */}
      <style>{`
        @page { margin: 1.5cm; }
        @media print { body { background: white !important; } }
      `}</style>

      <PrintTrigger />

      <div className="min-h-screen bg-gray-50 print:bg-white py-8 px-6 print:p-0">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:rounded-none overflow-hidden">

          {/* Logo + header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-100 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/GatherDO_Technologies_Logo.png"
              alt="GatherDO Technologies"
              className="h-10 w-auto"
            />
          </div>

          {/* Candidate info */}
          <div className="px-8 py-5 border-b border-gray-100 space-y-1 text-sm text-gray-600">
            <p><span className="font-medium text-gray-800">Student:</span> {studentEmail}</p>
            <p><span className="font-medium text-gray-800">Exam:</span> {exam?.name ?? '—'}</p>
            <p><span className="font-medium text-gray-800">Code:</span> {exam?.code ?? '—'}</p>
            <p><span className="font-medium text-gray-800">Date:</span> {finishedAt}</p>
          </div>

          {/* Pass / Fail + score hero */}
          <div className={`px-8 py-6 border-b border-gray-100 flex items-center gap-6 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className={`text-4xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {passed ? 'PASS' : 'FAIL'}
            </span>
            <div>
              <p className="text-3xl font-bold text-gray-900">{scorePercent.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {attempt.score_correct} correct of {attempt.question_order?.length ?? '—'} &nbsp;·&nbsp; Pass mark {passMarkPct}%
              </p>
            </div>
          </div>

          {/* Topic breakdown */}
          {topicBreakdown.length > 0 && (
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Score by Topic
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Topic</th>
                    <th className="pb-2 font-medium text-right w-20">Correct</th>
                    <th className="pb-2 font-medium text-right w-16">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topicBreakdown.map(({ topic, total, correct, pct }) => (
                    <tr key={topic}>
                      <td className="py-2 text-gray-700">{topic}</td>
                      <td className="py-2 text-right text-gray-500 tabular-nums">{correct}/{total}</td>
                      <td className={`py-2 text-right font-semibold tabular-nums ${
                        pct >= passMarkPct ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-5 text-center text-xs text-gray-400">
            Generated by GatherDO Java Certification Practice Platform
          </div>
        </div>
      </div>
    </>
  )
}
