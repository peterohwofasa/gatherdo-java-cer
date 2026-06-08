'use client'

import { useActionState, useEffect, useState } from 'react'
import { signIn, signUp } from '@/app/actions/auth'

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-all hover:scale-[1.02]"
    >
      {pending ? 'Please wait…' : label}
    </button>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all'

export function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signinError, signinAction, signinPending] = useActionState(signIn, null)
  const [signupResult, signupAction, signupPending] = useActionState(signUp, null)
  const [hideConfirmation, setHideConfirmation] = useState(false)
  const showConfirmation = signupResult === 'CHECK_EMAIL' && !hideConfirmation

  useEffect(() => {
    if (!showConfirmation) return
    window.history.pushState({ gatherdoConfirmation: true }, '')
    const onPop = () => {
      setMode('signin')
      setHideConfirmation(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [showConfirmation])

  if (showConfirmation) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Check your email for a confirmation link, then come back to sign in.
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setHideConfirmation(true)
          }}
          className="w-full rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  if (mode === 'signin') {
    return (
      <form action={signinAction} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>
        {signinError && (
          <p className="text-sm text-red-600">{signinError}</p>
        )}
        <SubmitButton pending={signinPending} label="Sign in" />
        <p className="text-center text-sm text-gray-500">
          No account?{' '}
          <button
            type="button"
            onClick={() => setMode('signup')}
            className="font-semibold text-teal-600 hover:underline"
          >
            Create one
          </button>
        </p>
      </form>
    )
  }

  return (
    <form action={signupAction} className="space-y-4">
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClass}
        />
      </div>
      {signupResult && signupResult !== 'CHECK_EMAIL' && (
        <p className="text-sm text-red-600">{signupResult}</p>
      )}
      <SubmitButton pending={signupPending} label="Create account" />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => setMode('signin')}
          className="font-semibold text-teal-600 hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  )
}
