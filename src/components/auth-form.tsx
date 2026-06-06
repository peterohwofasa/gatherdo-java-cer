'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp } from '@/app/actions/auth'

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Please wait…' : label}
    </button>
  )
}

export function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signinError, signinAction, signinPending] = useActionState(signIn, null)
  const [signupResult, signupAction, signupPending] = useActionState(signUp, null)

  if (signupResult === 'CHECK_EMAIL') {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Check your email for a confirmation link, then come back to sign in.
      </div>
    )
  }

  if (mode === 'signin') {
    return (
      <form action={signinAction} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="text-blue-600 hover:underline font-medium"
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
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          className="text-blue-600 hover:underline font-medium"
        >
          Sign in
        </button>
      </p>
    </form>
  )
}
