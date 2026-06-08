import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import Link from 'next/link'

function isCodeLine(line: string): boolean {
  return (
    line.startsWith('    ') ||
    line.startsWith('\t') ||
    /[{};]$/.test(line.trim()) ||
    /^\s*(public|private|protected|class|void|int|long|String|return|if|else|for|while|import|package|var|new|static|final)\b/.test(line.trim())
  )
}

function QuestionText({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n')
        const looksLikeCode =
          lines.length > 1 && lines.filter(isCodeLine).length > lines.length * 0.4
        if (looksLikeCode) {
          return (
            <pre
              key={i}
              className="bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre leading-relaxed"
            >
              {para}
            </pre>
          )
        }
        return (
          <p key={i} className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {para}
          </p>
        )
      })}
    </div>
  )
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Verify ownership
  const { data: attempt } = await supabase
    .from('attempts')
    .select('student_id, status, exam_id, question_order, exams(name)')
    .eq('id', attemptId)
    .eq('student_id', user.id)
    .single()

  if (!attempt) redirect('/exams')
  if (attempt.status !== 'completed') redirect(`/exam/${attemptId}`)

  // Use service client to get correct_answer
  const svc = await createServiceClient()

  const { data: answers } = await supabase
    .from('attempt_answers')
    .select('question_id, selected, is_correct')
    .eq('attempt_id', attemptId)

  const wrongAnswerIds = (answers ?? [])
    .filter((a) => a.is_correct === false)
    .map((a) => a.question_id)

  if (!wrongAnswerIds.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ReviewHeader examName={(attempt.exams as unknown as { name: string } | null)?.name} attemptId={attemptId} />
        <main className="max-w-2xl mx-auto p-8 text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Perfect score!</h2>
            <p className="text-gray-500 text-sm">You got every question right.</p>
            <Link
              href={`/results/${attemptId}`}
              className="mt-4 inline-block text-teal-700 hover:underline text-sm"
            >
              Back to results
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Load wrong questions with correct_answer via service client
  const { data: questionRows } = await svc
    .from('questions')
    .select('id, question_number, question_text, code_block, correct_answer, topic, explanation, explanation_verified')
    .in('id', wrongAnswerIds)

  const { data: optionRows } = await svc
    .from('question_options')
    .select('question_id, label, text')
    .in('question_id', wrongAnswerIds)
    .order('label')

  const optionsByQuestion = new Map<string, { label: string; text: string }[]>()
  for (const opt of optionRows ?? []) {
    const arr = optionsByQuestion.get(opt.question_id) ?? []
    arr.push({ label: opt.label, text: opt.text })
    optionsByQuestion.set(opt.question_id, arr)
  }

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a.selected]))

  // Sort by question_number
  const wrongQuestions = (questionRows ?? []).sort(
    (a, b) => a.question_number - b.question_number
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewHeader examName={(attempt.exams as unknown as { name: string } | null)?.name} attemptId={attemptId} />

      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <p className="text-sm text-gray-500">
          Showing <strong>{wrongAnswerIds.length}</strong> incorrect answer
          {wrongAnswerIds.length !== 1 ? 's' : ''}.
        </p>

        {wrongQuestions.map((q) => {
          const options = optionsByQuestion.get(q.id) ?? []
          const selected = answerMap.get(q.id) ?? ''
          const correct = q.correct_answer

          return (
            <div key={q.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Question {q.question_number}
                </span>
                {q.topic && (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                    {q.topic}
                  </span>
                )}
              </div>

              <div className="px-5 py-4">
                <QuestionText text={q.question_text} />
                {q.code_block && (
                  <pre className="mt-3 bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre">
                    {q.code_block}
                  </pre>
                )}
              </div>

              <div className="px-5 pb-4 space-y-2">
                {options.map((opt) => {
                  const isSelected = selected.includes(opt.label)
                  const isCorrect = correct.includes(opt.label)

                  let className =
                    'w-full text-left rounded-lg border px-4 py-3 text-sm flex items-start gap-3 '
                  if (isCorrect) {
                    className += 'border-green-400 bg-green-50'
                  } else if (isSelected && !isCorrect) {
                    className += 'border-red-400 bg-red-50'
                  } else {
                    className += 'border-gray-200 bg-gray-50'
                  }

                  return (
                    <div key={opt.label} className={className}>
                      <span
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5 ${
                          isCorrect
                            ? 'border-green-500 bg-green-500 text-white'
                            : isSelected
                            ? 'border-red-500 bg-red-500 text-white'
                            : 'border-gray-300 text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="flex-1 text-gray-700 leading-relaxed">{opt.text}</span>
                      <span className="shrink-0 text-xs font-medium">
                        {isCorrect && <span className="text-green-600">Correct</span>}
                        {isSelected && !isCorrect && <span className="text-red-500">Your answer</span>}
                      </span>
                    </div>
                  )
                })}
              </div>

              {q.explanation && (
                <div className="mx-5 mb-5 rounded-md border border-teal-100 bg-teal-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Explanation</span>
                    {!q.explanation_verified && (
                      <span className="text-xs text-gray-400 font-normal">· AI-generated — not yet verified</span>
                    )}
                  </div>
                  <p className="text-sm text-teal-900 leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </div>
          )
        })}

        <div className="flex gap-3 pb-8">
          <Link
            href={`/results/${attemptId}`}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to results
          </Link>
          <Link
            href="/exams"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Take another exam
          </Link>
        </div>
      </main>
    </div>
  )
}

function ReviewHeader({ examName, attemptId }: { examName?: string; attemptId: string }) {
  return (
    <Header>
      {examName && (
        <span className="text-sm text-gray-400 truncate">— {examName}</span>
      )}
      <Link href={`/results/${attemptId}`} className="text-sm text-teal-700 hover:underline whitespace-nowrap">
        Back to results
      </Link>
    </Header>
  )
}
