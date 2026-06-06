'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return error.message
  redirect('/exams')
}

export async function signUp(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return error.message
  // Email confirmation disabled in Supabase → session exists immediately
  if (data.session) redirect('/exams')
  return 'CHECK_EMAIL'
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
