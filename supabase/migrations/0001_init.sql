create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

create table if not exists google_accounts (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid references app_users(id),
  google_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  watch_expiration timestamptz,
  last_history_id bigint,
  gmail_query text,
  auto_extract boolean not null default false,
  extraction_running boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  received_at timestamptz,
  content_text text not null,
  content_meta jsonb,
  content_hash text not null unique,
  extracted boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists shift_offers (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time null,
  end_time time null,
  rate_value numeric null,
  rate_unit text null,
  practice_name text null,
  postcode text null,
  town text null,
  agency text null,
  booking_channel text not null default 'unknown',
  booking_target text null,
  notes text null,
  confidence numeric not null default 0.5,
  fingerprint text not null unique,
  status text not null default 'new',
  source_raw_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists booking_templates (
  id uuid primary key default gen_random_uuid(),
  agency text not null,
  channel text not null,
  subject_template text null,
  body_template text not null,
  created_at timestamptz default now()
);

insert into booking_templates (agency, channel, subject_template, body_template)
values
  (
    'default',
    'email',
    'Locum booking request – {{date}} {{practice_name}}',
    'Hi {{agency}},\n\nI\'m available for {{date}} at {{practice_name}}. Please confirm the shift details and rate.\n\nThanks,\nMohammad – Optometrist'
  ),
  (
    'default',
    'whatsapp',
    null,
    'Hi, I\'m available for {{date}} at {{practice_name}}. Please confirm rate and details. Thanks, Mohammad.'
  )
on conflict do nothing;
