-- Profiles: mirrors auth.users; created automatically via trigger
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_instructor boolean not null default false,
  created_at timestamptz not null default now()
);

-- Exams: one row per exam type
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  questions_per_sitting int not null,
  duration_minutes int not null,
  pass_percent int not null
);

-- Questions: one row per question; correct_answer never exposed during active attempt
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_number int not null,
  question_text text not null,
  code_block text,
  correct_answer text not null,
  topic text,
  difficulty text,
  explanation text,
  unique(exam_id, question_number)
);

-- Question options: A/B/C/D/E per question
create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  text text not null,
  unique(question_id, label)
);

-- Attempts: one per student sitting
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_limit_minutes int not null,
  score_correct int,
  score_percent numeric(5,2),
  passed boolean,
  question_order text[] not null
);

-- Attempt answers: incrementally written as student answers
create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected text not null,
  is_correct boolean,
  updated_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;

-- profiles: own row only
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- exams: any signed-in user can read
create policy "exams_read" on public.exams
  for select using (auth.uid() is not null);

-- questions: any signed-in user can read
create policy "questions_read" on public.questions
  for select using (auth.uid() is not null);

-- question_options: any signed-in user can read
create policy "question_options_read" on public.question_options
  for select using (auth.uid() is not null);

-- attempts: own only
create policy "attempts_own" on public.attempts
  for all using (auth.uid() = student_id);

-- attempt_answers: own only (via join to attempts)
create policy "attempt_answers_own" on public.attempt_answers
  for all using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_id
      and a.student_id = auth.uid()
    )
  );
