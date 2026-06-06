'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import { saveAnswer, submitAttempt } from '@/app/actions/exam'
import type { ExamState, QuestionForRunner } from '@/lib/types'

function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

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
        const looksLikeCode = lines.length > 1 && lines.filter(isCodeLine).length > lines.length * 0.4
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

interface Props {
  state: ExamState
}

export function ExamRunner({ state }: Props) {
  const { attempt, questions, savedAnswers, secondsRemaining: initialSeconds } = state

  const [answers, setAnswers] = useState<Record<string, string>>(savedAnswers)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [seconds, setSeconds] = useState(Math.max(0, initialSeconds))
  const [showSubmitWarning, setShowSubmitWarning] = useState(false)
  const [isPending, startTransition] = useTransition()
  const autoSubmittedRef = useRef(false)

  const currentQuestion: QuestionForRunner = questions[currentIndex]

  const handleSubmit = useCallback(() => {
    startTransition(async () => {
      await submitAttempt(attempt.id)
    })
  }, [attempt.id])

  // Countdown timer
  useEffect(() => {
    if (seconds <= 0) {
      if (!autoSubmittedRef.current) {
        autoSubmittedRef.current = true
        handleSubmit()
      }
      return
    }
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id)
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true
            handleSubmit()
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [handleSubmit, seconds <= 0])

  function handleAnswerChange(questionId: string, value: string, multiSelectCount: number) {
    let newSelected: string

    if (multiSelectCount === 1) {
      newSelected = value
    } else {
      const current = new Set((answers[questionId] ?? '').split('').filter(Boolean))
      if (current.has(value)) {
        current.delete(value)
      } else {
        if (current.size < multiSelectCount) {
          current.add(value)
        }
      }
      newSelected = [...current].sort().join('')
    }

    setAnswers((prev) => ({ ...prev, [questionId]: newSelected }))
    startTransition(async () => {
      await saveAnswer(attempt.id, questionId, newSelected)
    })
  }

  function getMultiSelectCount(questionId: string): number {
    // Determine how many answers are required from the question text
    const text = currentQuestion.question_text.toLowerCase()
    const match = text.match(/choose\s+(\w+)|select\s+(\w+)\s+answer/)
    if (!match) return 1
    const word = match[1] || match[2]
    const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 }
    return words[word] ?? 2
  }

  const multiCount = getMultiSelectCount(currentQuestion.id)
  const isMulti = multiCount > 1
  const answeredCount = Object.values(answers).filter((v) => v !== '').length
  const unansweredCount = questions.length - answeredCount

  const timerDanger = seconds <= 300

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="text-gray-500">Submitting your exam…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <span className="font-semibold text-gray-800 text-sm">{state.exam.name}</span>
        <div className="flex items-center gap-4">
          <span
            className={`font-mono text-sm font-bold ${
              timerDanger ? 'text-red-600 animate-pulse' : 'text-gray-700'
            }`}
          >
            {formatTime(seconds)}
          </span>
          <button
            onClick={() => setShowSubmitWarning(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Finish Exam
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question list sidebar */}
        <aside className="hidden md:block w-48 bg-white border-r border-gray-200 p-3 overflow-y-auto shrink-0">
          <p className="text-xs text-gray-400 font-medium uppercase mb-2">Questions</p>
          <div className="grid grid-cols-5 gap-1">
            {questions.map((q, idx) => {
              const answered = !!answers[q.id]
              const isCurrent = idx === currentIndex
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : answered
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {currentQuestion.topic && (
                <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                  {currentQuestion.topic}
                </span>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
              {isMulti && (
                <p className="text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-1 mb-3 inline-block">
                  Choose {multiCount} answers
                </p>
              )}
              <QuestionText text={currentQuestion.question_text} />
              {currentQuestion.code_block && (
                <pre className="mt-4 bg-gray-900 text-gray-100 rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre">
                  {currentQuestion.code_block}
                </pre>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              {currentQuestion.options.map((opt) => {
                const selected = (answers[currentQuestion.id] ?? '').includes(opt.label)
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleAnswerChange(currentQuestion.id, opt.label, multiCount)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex gap-3 items-start">
                      <span
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold mt-0.5 ${
                          selected
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300 text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed">{opt.text}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitWarning(true)}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Finish Exam
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Submit exam?</h2>
            {unansweredCount > 0 ? (
              <p className="text-sm text-amber-600 mb-4">
                You have <strong>{unansweredCount}</strong> unanswered question
                {unansweredCount !== 1 ? 's' : ''}. These will be marked incorrect.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                All {questions.length} questions answered. Ready to submit?
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitWarning(false)}
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
