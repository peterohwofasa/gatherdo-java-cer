import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthForm } from '@/components/auth-form'

export default async function AuthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/exams')

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <Link href="/" aria-label="GatherDO home" className="block">
          <Image
            src="/GatherDO_Technologies_Logo.png"
            alt="GatherDO Technologies"
            width={1148}
            height={258}
            priority
            className="mx-auto h-14 w-auto"
          />
          <p className="mt-3 text-sm text-gray-500 text-center">Java Certification Practice</p>
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white px-8 py-8 shadow-xl">
          <AuthForm />
        </div>
      </div>
    </main>
  )
}
