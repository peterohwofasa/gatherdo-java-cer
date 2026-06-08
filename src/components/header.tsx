import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

type HeaderProps = {
  children?: React.ReactNode
  compact?: boolean
}

export async function Header({ children, compact = false }: HeaderProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isInstructor = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_instructor')
      .eq('id', user.id)
      .single()
    isInstructor = !!profile?.is_instructor
  }

  const hasRight = isInstructor || !!children

  return (
    <header className="border-b border-gray-200 bg-white px-4 md:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
      <Link href="/" aria-label="GatherDO home" className="flex items-center shrink-0">
        <Image
          src="/GatherDO_Technologies_Logo.png"
          alt="GatherDO Technologies"
          width={1148}
          height={258}
          priority
          className={compact ? 'h-7 w-auto' : 'h-10 w-auto'}
        />
      </Link>
      {hasRight && (
        <div className="flex items-center gap-4 min-w-0">
          {isInstructor && (
            <Link
              href="/instructor"
              className="text-sm font-medium text-teal-700 hover:underline whitespace-nowrap"
            >
              Dashboard
            </Link>
          )}
          {children}
        </div>
      )}
    </header>
  )
}
