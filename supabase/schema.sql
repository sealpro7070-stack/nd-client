-- Nilam Auto: Supabase Schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  delima_id text,
  cookie_encrypted text,
  cookie_updated_at timestamp with time zone,
  is_active boolean default false,
  created_at timestamp with time zone default now()
);

-- Settings table
create table if not exists settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique,
  books_per_month int default 4 check (books_per_month between 1 and 8),
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

-- Submissions table
create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  book_id uuid references books(id),
  submitted_at timestamp with time zone,
  month int check (month between 1 and 12),
  year int,
  status text default 'pending' check (status in ('pending','success','failed')),
  error_message text,
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table users enable row level security;
alter table settings enable row level security;
alter table submissions enable row level security;
alter table books enable row level security;

-- Users: only own row
create policy "Users can view own data" on users
  for select using (auth.uid() = id);
create policy "Users can update own data" on users
  for update using (auth.uid() = id);

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
  for insert with check (auth.uid() = user_id);

-- Books: readable by all authenticated users
create policy "Books are readable by authenticated users" on books
  for select using (auth.role() = 'authenticated');

-- Service role can do everything (for backend)
create policy "Service role full access users" on users
  for all using (auth.role() = 'service_role');
create policy "Service role full access settings" on settings
  for all using (auth.role() = 'service_role');
create policy "Service role full access submissions" on submissions
  for all using (auth.role() = 'service_role');
create policy "Service role full access books" on books
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

-- Add AINS user ID hash for one-AINS-per-account enforcement
-- Run this if column doesn't exist: ALTER TABLE users ADD COLUMN IF NOT EXISTS ains_user_id_hash text;
-- Run this for uniqueness: CREATE UNIQUE INDEX IF NOT EXISTS idx_users_ains_user_id_hash ON users(ains_user_id_hash) WHERE ains_user_id_hash IS NOT NULL;
alter table users add column if not exists ains_user_id_hash text;
create unique index if not exists idx_users_ains_user_id_hash on users(ains_user_id_hash) where ains_user_id_hash is not null;
