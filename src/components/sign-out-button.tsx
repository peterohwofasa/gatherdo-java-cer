'use client'

import { signOut } from '@/app/actions/auth'

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Sign out
      </button>
    </form>
  )
}
