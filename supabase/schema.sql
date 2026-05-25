-- Nilam Auto: Supabase Schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  delima_id text,
  ains_cookie_encrypted text,
  is_active boolean default false,
  -- Plan management
  plan text default 'free' check (plan in ('free','plus','family','noob')),
  plan_expires_at timestamp with time zone,
  -- Encrypted AINS credentials
  ains_email_encrypted text,
  ains_user_id_hash text,
  created_at timestamp with time zone default now()
);

-- Settings table
create table if not exists settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique,
  -- Max 50 to support Pro/Family plan limits (was 8 for free tier only)
  books_per_month int default 4 check (books_per_month between 1 and 50),
  language text default 'Melayu' check (language in ('Melayu','Inggeris','Cina','Tamil')),
  book_type text default 'Fizikal' check (book_type in ('Fizikal','E-Buku')),
  auto_schedule boolean default true,
  schedule_day int default 15 check (schedule_day between 1 and 28),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Books table
create table if not exists books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  author text not null,
  publisher text not null,
  year int,
  pages int not null check (pages > 0),
  category text not null,
  language text not null check (language in ('Melayu','Inggeris','Cina','Tamil')),
  synopsis text not null,
  moral text not null,
  isbn text,
  created_at timestamp with time zone default now()
);

-- Family slots table (up to 3 child AINS accounts per family plan)
create table if not exists family_slots (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references users(id) on delete cascade,
  slot_name             text not null,
  ains_cookie_encrypted text,
  ains_email_encrypted  text,
  ains_user_id_hash     text,
  language              text default 'Melayu' check (language in ('Melayu','Inggeris','Cina','Tamil')),
  books_per_month       int default 4 check (books_per_month between 1 and 50),
  created_at            timestamp with time zone default now(),
  unique (user_id, slot_name)
);

-- Submissions table
create table if not exists submissions (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references users(id) on delete cascade,
  book_id        uuid references books(id),
  family_slot_id uuid references family_slots(id) on delete set null,
  submitted_at   timestamp with time zone,
  month          int check (month between 1 and 12),
  year           int,
  status         text default 'pending' check (status in ('pending','success','failed')),
  error_message  text,
  created_at     timestamp with time zone default now()
);

-- Row Level Security
alter table users enable row level security;
alter table settings enable row level security;
alter table submissions enable row level security;
alter table books enable row level security;
alter table family_slots enable row level security;

-- Users: only own row (read-only via client — writes go through backend service role)
create policy "Users can view own data" on users
  for select using (auth.uid() = id);
-- NOTE: No client-side update policy on users.
-- All writes (plan, is_active, ains_cookie_encrypted etc.) are done server-side
-- via the service role key. Granting a broad client update policy would allow
-- users to self-upgrade their plan by directly PATCHing the Supabase REST API.

-- Settings: only own settings
create policy "Users can view own settings" on settings
  for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on settings
  for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on settings
  for update using (auth.uid() = user_id);

-- Submissions: only own submissions
create policy "Users can view own submissions" on submissions
  for select using (auth.uid() = user_id);
create policy "Users can insert own submissions" on submissions
  for insert with check (
    auth.uid() = user_id AND
    (family_slot_id IS NULL OR EXISTS (
      SELECT 1 FROM family_slots WHERE id = family_slot_id AND user_id = auth.uid()
    ))
  );

-- Books: readable by all authenticated users
create policy "Books are readable by authenticated users" on books
  for select using (auth.role() = 'authenticated');

-- Family slots: users see only their own
create policy "Users see own family slots" on family_slots
  for select using (auth.uid() = user_id);

-- Service role can do everything (for backend)
create policy "Service role full access users" on users
  for all using (auth.role() = 'service_role');
create policy "Service role full access settings" on settings
  for all using (auth.role() = 'service_role');
create policy "Service role full access submissions" on submissions
  for all using (auth.role() = 'service_role');
create policy "Service role full access books" on books
  for all using (auth.role() = 'service_role');
create policy "Service role full access family_slots" on family_slots
  for all using (auth.role() = 'service_role');

-- Trigger: auto-create settings row when user is created
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_user_created
  after insert on users
  for each row execute procedure handle_new_user();

-- Indexes for performance
create index if not exists idx_submissions_user_id on submissions(user_id);
create index if not exists idx_submissions_status on submissions(status);
create index if not exists idx_submissions_year_month on submissions(year, month);
create index if not exists idx_books_language on books(language);
create index if not exists idx_settings_user_id on settings(user_id);

-- AINS hash uniqueness index
create unique index if not exists idx_users_ains_user_id_hash on users(ains_user_id_hash) where ains_user_id_hash is not null;
create unique index if not exists idx_family_slots_ains_hash on family_slots(ains_user_id_hash) where ains_user_id_hash is not null;
create index if not exists idx_family_slots_user_id on family_slots(user_id);
create index if not exists idx_submissions_family_slot on submissions(family_slot_id) where family_slot_id is not null;

-- Admin settings (key-value store for site configuration)
create table if not exists admin_settings (
  key  text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);
alter table admin_settings enable row level security;
create policy "Service role full access admin_settings" on admin_settings
  for all using (auth.role() = 'service_role');

-- Payment requests table (manual QR payment flow)
create table if not exists payment_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  plan text not null check (plan in ('plus','family')),
  amount int not null,
  reference text,
  receipt_data text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_at timestamp with time zone,
  reviewed_by text,
  created_at timestamp with time zone default now()
);
alter table payment_requests enable row level security;
create policy "Users can view own payment requests" on payment_requests
  for select using (auth.uid() = user_id);
create policy "Service role full access payment_requests" on payment_requests
  for all using (auth.role() = 'service_role');
create index if not exists idx_payment_requests_user_status
  on payment_requests(user_id, status);
