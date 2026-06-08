import Link from 'next/link'
import Image from 'next/image'

type HeaderProps = {
  children?: React.ReactNode
  compact?: boolean
}

export function Header({ children, compact = false }: HeaderProps) {
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
      {children && (
        <div className="flex items-center gap-4 min-w-0">{children}</div>
      )}
    </header>
  )
}
