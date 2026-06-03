create type official_domain as enum ('rules', 'signs', 'controls');
create type attempt_mode as enum ('full_mock', 'topic_drill', 'adaptive_drill');
create type attempt_status as enum ('in_progress', 'submitted', 'abandoned');
create type driving_code_family as enum ('A1', 'A', 'B', 'EB', 'C1', 'C', 'EC1', 'EC');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  licence_family driving_code_family not null,
  learner_class text not null check (learner_class in ('1', '2', '3')),
  official_domain official_domain not null,
  topic_slug text not null,
  stem text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  correct_option text not null check (correct_option in ('a', 'b', 'c')),
  explanation text,
  source_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  licence_family driving_code_family not null,
  mode attempt_mode not null default 'full_mock',
  status attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_rules integer,
  score_signs integer,
  score_controls integer,
  passed_simulated boolean,
  overall_readiness integer
);

create table public.attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  position integer not null,
  official_domain official_domain not null,
  unique (attempt_id, question_id),
  unique (attempt_id, position)
);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option text not null check (selected_option in ('a', 'b', 'c')),
  is_correct boolean not null,
  time_seconds integer,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.attempt_answers enable row level security;

create policy "Public can read active question text"
on public.questions
for select
using (active = true);

create policy "Users can read own attempts"
on public.attempts
for select
using (auth.uid() = user_id);

create policy "Users can read own attempt questions"
on public.attempt_questions
for select
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_questions.attempt_id
    and a.user_id = auth.uid()
  )
);

create policy "Users can read own attempt answers"
on public.attempt_answers
for select
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
    and a.user_id = auth.uid()
  )
);

create index questions_family_domain_active_idx
on public.questions (licence_family, official_domain, active);

create index attempt_questions_attempt_idx
on public.attempt_questions (attempt_id, position);

create index attempt_answers_attempt_idx
on public.attempt_answers (attempt_id);
