/**
 * Seed script: inserts exam metadata and SE17 questions into Supabase.
 * Run with: npx tsx scripts/seed.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, join } from 'path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

interface RawQuestion {
  question_number: number
  question_text: string
  options: Record<string, string>
  correct_answer: string
  topic?: string
  difficulty?: string
  code_block?: string
}

interface RawBank {
  questions: RawQuestion[]
}

async function upsertExam(exam: {
  code: string
  name: string
  questions_per_sitting: number
  duration_minutes: number
  pass_percent: number
}) {
  const { data, error } = await supabase
    .from('exams')
    .upsert({ ...exam }, { onConflict: 'code' })
    .select('id')
    .single()

  if (error) throw new Error(`upsertExam: ${error.message}`)
  return data.id as string
}

async function seedExam(examId: string, questions: RawQuestion[]) {
  for (const q of questions) {
    const { data: qRow, error: qErr } = await supabase
      .from('questions')
      .upsert(
        {
          exam_id: examId,
          question_number: q.question_number,
          question_text: q.question_text,
          code_block: q.code_block ?? null,
          correct_answer: q.correct_answer,
          topic: q.topic ?? null,
          difficulty: q.difficulty ?? null,
        },
        { onConflict: 'exam_id,question_number' }
      )
      .select('id')
      .single()

    if (qErr) throw new Error(`question ${q.question_number}: ${qErr.message}`)

    const options = Object.entries(q.options).map(([label, text]) => ({
      question_id: qRow.id,
      label,
      text,
    }))

    const { error: optErr } = await supabase
      .from('question_options')
      .upsert(options, { onConflict: 'question_id,label' })

    if (optErr) throw new Error(`options for Q${q.question_number}: ${optErr.message}`)

    process.stdout.write(`  Q${q.question_number} ✓\n`)
  }
}

async function main() {
  console.log('Seeding SE17 exam...')

  const se17Id = await upsertExam({
    code: '1Z0-829',
    name: 'Java SE 17 Developer (1Z0-829)',
    questions_per_sitting: 50,
    duration_minutes: 90,
    pass_percent: 68,
  })
  console.log(`SE17 exam id: ${se17Id}`)

  const candidates = [
    resolve(process.cwd(), 'java_se17_1z0-829_questions.json'),
    join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'Downloads', 'GD', 'java_se17_1z0-829_questions.json'),
    join(process.env.USERPROFILE ?? process.env.HOME ?? '', 'Downloads', 'java_se17_1z0-829_questions.json'),
  ]

  let bank: RawBank | undefined
  for (const p of candidates) {
    try {
      bank = JSON.parse(readFileSync(p, 'utf-8'))
      console.log(`Loaded questions from: ${p}`)
      break
    } catch { /* try next */ }
  }

  if (!bank) {
    console.error('Could not find java_se17_1z0-829_questions.json. Checked:')
    candidates.forEach((p) => console.error('  ' + p))
    console.error('Place the file in the project root or Downloads/GD/ and retry.')
    process.exit(1)
  }

  console.log(`Seeding ${bank.questions.length} questions...`)
  await seedExam(se17Id, bank.questions)

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
