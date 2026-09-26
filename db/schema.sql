-- Run once against the Postgres that DATABASE_URL points at (Neon or Supabase).
-- Four tables. Not five.
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
  embedding     vector(1536),
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
