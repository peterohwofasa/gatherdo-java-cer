import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/exams')

  return (
    <main className="min-h-screen flex items-center justify-center bg-teal-600 px-6 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center text-center gap-8">
        <Image
          src="/GatherDO_Technologies_Logo_white.png"
          alt="GatherDO Technologies"
          width={1148}
          height={258}
          priority
          className="w-80 sm:w-96 max-w-full h-auto"
        />
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Java Certification Practice Platform
          </h1>
          <p className="text-base sm:text-lg text-teal-50 max-w-xl mx-auto leading-relaxed">
            Practice for your Oracle Java SE certification exams under real exam conditions.
            Timed tests, instant scoring, and wrong-answer review.
          </p>
        </div>
        <Link
          href="/auth"
          className="inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-teal-700 shadow-md hover:bg-teal-50 hover:shadow-lg transition-all"
        >
          Get Started
        </Link>
      </div>
    </main>
  )
}
