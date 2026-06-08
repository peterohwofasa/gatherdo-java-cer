import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { SignOutButton } from '@/components/sign-out-button'

export default async function InstructorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_instructor')
    .eq('id', user.id)
    .single()

  if (!profile?.is_instructor) redirect('/exams')

  const svc = await createServiceClient()
  const { data: attempts } = await svc
    .from('attempts')
    .select('id, score_percent, passed, finished_at, profiles(email), exams(name, code)')
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })

  const rows = attempts ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        <span className="text-sm text-gray-500 truncate hidden sm:inline">{user.email}</span>
        <SignOutButton />
      </Header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {rows.length} completed attempt{rows.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.map((a) => {
                const student = a.profiles as unknown as { email: string } | null
                const exam = a.exams as unknown as { name: string; code: string } | null
                const date = a.finished_at
                  ? new Date(a.finished_at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
                const score =
                  a.score_percent != null ? `${Number(a.score_percent).toFixed(1)}%` : '—'
                return (
                  <tr key={a.id} className="text-sm even:bg-gray-50 hover:bg-teal-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      {student?.email ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {exam?.name ?? 'Unknown exam'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{date}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium text-right whitespace-nowrap">
                      {score}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block font-semibold text-xs px-2 py-0.5 rounded-full ${
                          a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {a.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/results/${a.id}`} className="text-teal-700 hover:underline text-sm">
                          View
                        </Link>
                        <Link href={`/review/${a.id}`} className="text-teal-700 hover:underline text-sm">
                          Review
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!rows.length && (
            <p className="p-8 text-center text-sm text-gray-400">No attempts yet.</p>
          )}
        </div>
      </main>
    </div>
  )
}
