-- Run once against the Postgres that DATABASE_URL points at (Neon or Supabase).
-- Four tables, the audit log and evidence files the passport needs, and user accounts.
create extension if not exists vector;

create table if not exists challenges (
  id              uuid primary key default gen_random_uuid(),
  pr_id           text unique,
  department      text not null,
  sector          text,
  district        text,
  outcome_statement text not null,
  kpi_name        text not null,
  kpi_unit        text,
  kpi_definition  text,
  baseline_value  numeric,
  baseline_window text,
  baseline_source text,
  baseline_method text,
  comparison_unit text,
  duration_days   int,
  locked_at       timestamptz,
  lock_hash       text,
  created_at      timestamptz default now()
);

create table if not exists records (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid references challenges(id),
  status        text default 'running',
  post_value    numeric,
  delta         numeric,
  ci_low        numeric,
  ci_high       numeric,
  method        text,
  adoption_pct  numeric,
  pilot_cost_inr numeric,
  result_direction text,
  is_synthetic  boolean default false,
  embedding     vector(1024),   -- mxbai-embed-large, via Ollama
  created_at    timestamptz default now()
);

create table if not exists readings (
  id         bigserial primary key,
  record_id  uuid references records(id),
  reading_date date not null,
  kpi_value  numeric not null
);

create table if not exists signatures (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid references records(id),
  signer_name text not null,
  signer_role text not null,
  dissent_note text,
  signed_at   timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Pilot Evidence Passport (APPLICATION_UPDATE.md, phase 1).
-- The passport is a pilot's `records` row: its state, and the sections the four
-- tables have no columns for, kept as one jsonb document. The seal reuses
-- challenges.lock_hash / locked_at; the validator signs in `signatures`.
alter table challenges add column if not exists is_simulated boolean not null default false;
alter table records    add column if not exists passport_state text;
alter table records    add column if not exists passport jsonb;
alter table records    add column if not exists demo_step int;

-- Every passport action, hash-chained per record: each row's hash covers the
-- previous row's hash, so editing or removing any event breaks the chain.
create table if not exists audit_events (
  id           bigserial primary key,
  record_id    uuid not null references records(id),
  at           timestamptz not null,
  actor_role   text not null,
  actor_name   text not null,
  action       text not null,
  detail       jsonb,
  is_simulated boolean not null default false,
  prev_hash    text,
  hash         text not null
);
create index if not exists audit_events_record on audit_events (record_id, id);

-- Append-only. The one exception is "Reset demo", which may remove simulated events.
create or replace function audit_events_append_only() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.is_simulated then return old; end if;
  raise exception 'audit_events is append-only';
end $$;
drop trigger if exists audit_events_append_only on audit_events;
create trigger audit_events_append_only before update or delete on audit_events
  for each row execute function audit_events_append_only();

-- ---------------------------------------------------------------------------
-- Phase 2: accounts, real pilots, evidence files.
-- No public sign-up: real accounts are made with scripts/add-user.mjs. Demo accounts
-- (is_demo, no password) can only act on simulated records.
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  name          text not null,
  role          text not null check (role in
                  ('department', 'admin', 'startup', 'evaluator', 'validator', 'finance', 'public')),
  org           text,
  password_hash text,
  is_demo       boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz default now()
);

alter table challenges   add column if not exists target_value numeric;
alter table challenges   add column if not exists target_direction text;   -- 'decrease' | 'increase'
alter table challenges   add column if not exists created_by uuid references users(id);
alter table records      add column if not exists startup_user_id uuid references users(id);
alter table audit_events add column if not exists actor_id uuid references users(id);

-- Evidence files live in Postgres (capped at 3 MB each by the API) and never change.
create table if not exists evidence_files (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references records(id),
  milestone   int not null,
  title       text not null,
  filename    text not null,
  mime        text not null,
  bytes       int not null,
  sha256      text not null,
  data        bytea not null,
  uploaded_by uuid references users(id),
  uploaded_at timestamptz not null default now()
);
create index if not exists evidence_files_record on evidence_files (record_id);

create or replace function evidence_files_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'evidence_files cannot be changed or removed';
end $$;
drop trigger if exists evidence_files_immutable on evidence_files;
create trigger evidence_files_immutable before update or delete on evidence_files
  for each row execute function evidence_files_immutable();
