alter table public.questions
  add column if not exists explanation text default null,
  add column if not exists explanation_verified boolean not null default false;
