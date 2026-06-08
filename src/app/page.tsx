import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/exams')

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 px-6 py-24">
        {/* Dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_60%)]" />

        <div className="relative flex w-full max-w-2xl flex-col items-center gap-10 text-center">
          <Image
            src="/GatherDO_Technologies_Logo_white.png"
            alt="GatherDO Technologies"
            width={1148}
            height={258}
            priority
            className="animate-float h-auto w-72 max-w-full drop-shadow-[0_0_40px_rgba(255,255,255,0.25)] sm:w-80"
          />

          <div className="space-y-5">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Java Certification<br className="hidden sm:block" /> Practice Platform
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-teal-50/80 sm:text-lg">
              Practice for your Oracle Java SE certification exams under real exam
              conditions. Timed tests, instant scoring, and wrong-answer review.
            </p>
          </div>

          <Link
            href="/auth"
            className="inline-block rounded-full bg-white px-8 py-4 text-base font-semibold text-teal-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Feature strip */}
      <section className="bg-teal-800 px-6 py-12">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {[
            { icon: '⏱️', title: 'Timed Exams', desc: 'Real exam conditions with a live countdown timer' },
            { icon: '📊', title: 'Instant Scoring', desc: 'See your result and score the moment you submit' },
            { icon: '✅', title: 'Wrong-Answer Review', desc: 'Study exactly where you went wrong, with explanations' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="space-y-2">
              <div className="text-3xl">{icon}</div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs leading-relaxed text-teal-200/80">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
