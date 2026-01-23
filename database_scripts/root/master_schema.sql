-- ==========================================
-- CRM SHARK FUNDED - MASTER DATABASE SCHEMA
-- ==========================================

-- 1. Profiles Table (Extends Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  total_commission numeric default 0,
  total_referrals integer default 0,
  wallet_balance numeric default 0,
  is_admin boolean default false,
  user_type text default 'client',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, referral_code)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    substring(md5(random()::text) from 0 for 8) -- Generate a random 7-char code
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Account Types Table
create table if not exists public.account_types (
  id uuid default gen_random_uuid() primary key,
  name text not null unique, -- e.g. "1 Step", "2 Step", "Instant Funding"
  account_size numeric not null,
  price numeric not null,
  leverage integer default 100,
  daily_loss_limit numeric,
  total_loss_limit numeric,
  profit_target numeric,
  mt5_group_name text,
  status text default 'active', -- 'active', 'inactive'
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Seed Account Types
INSERT INTO public.account_types (name, mt5_group_name, leverage, status, price, account_size)
VALUES
    ('Instant Funding', 'demo\S\0-SF', 30, 'active', 0, 0), -- Prices are calculated in code, so we put 0 or real placeholders
    ('1 Step', 'demo\S\1-SF', 50, 'active', 0, 0),
    ('2 Step', 'demo\S\2-SF', 50, 'active', 0, 0),
    ('Instant Funding Pro', 'demo\SF\0-Pro', 5, 'active', 0, 0),
    ('1 Step Pro', 'demo\SF\1-Pro', 100, 'active', 0, 0),
    ('2 Step Pro', 'demo\SF\2-Pro', 100, 'active', 0, 0)
ON CONFLICT (name) DO NOTHING;

-- 3. Payment Orders Table
create table if not exists public.payment_orders (
  id uuid default gen_random_uuid() primary key,
  order_id text unique not null, -- SF-XXXXX
  user_id uuid references public.profiles(id) not null,
  account_type_id uuid references public.account_types(id),
  account_type_name text, -- e.g. "1 Step", "2 Step Pro"
  account_size numeric not null,
  amount numeric not null,
  currency text default 'USD',
  gateway text not null, -- 'sharkpay', 'cregis'
  status text default 'pending', -- 'pending', 'paid', 'failed'
  payment_id text, -- Gateway transaction ID
  payment_method text,
  coupon_code text,
  discount_amount numeric default 0,
  platform text,
  model text,
  is_account_created boolean default false,
  challenge_id uuid, -- Link to created challenge
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Challenges Table
create table if not exists public.challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  login text unique not null,
  master_password text,
  investor_password text,
  server text default 'ALFX Limited',
  challenge_type text, -- 'Evaluation', 'Instant', 'Phase 1', etc.
  status text default 'active', -- 'active', 'passed', 'failed'
  initial_balance numeric not null,
  current_balance numeric not null,
  current_equity numeric not null,
  start_of_day_equity numeric not null,
  mt5_group text, -- MT5 Group
  leverage integer,
  platform text default 'mt5',
  is_account_created boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Trades Table
create table if not exists public.trades (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id),
  ticket_number text unique not null,
  symbol text,
  type text, -- 'buy', 'sell'
  lots numeric,
  open_price numeric,
  close_price numeric,
  open_time timestamp with time zone,
  close_time timestamp with time zone,
  profit_loss numeric,
  magic_number text,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Merchant Configuration Table
create table if not exists public.merchant_config (
  id uuid default gen_random_uuid() primary key,
  gateway_name text not null, -- 'SharkPay', 'Cregis'
  api_key text,
  api_secret text,
  webhook_secret text,
  pid text, -- Specific to Cregis
  environment text default 'production',
  is_active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Webhook Logs Table
create table if not exists public.webhook_logs (
  id uuid default gen_random_uuid() primary key,
  event_type text,
  gateway text,
  order_id text,
  gateway_order_id text,
  amount numeric,
  status text,
  utr text,
  request_body jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Affiliate Earnings
create table if not exists public.affiliate_earnings (
  id uuid default gen_random_uuid() primary key,
  referrer_id uuid references public.profiles(id) not null,
  referred_user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  commission_type text default 'purchase',
  status text default 'pending',
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 9. Payout Requests
create table if not exists public.payout_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  currency text default 'USD',
  payment_method text not null,
  wallet_address text,
  bank_details jsonb,
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason text,
  transaction_id text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. KYC Sessions
create table if not exists public.kyc_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  session_id text unique, -- Provider session id (e.g. Didit)
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  vendor text default 'didit',
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 11. Risk Rules Configuration
create table if not exists public.risk_rules_config (
  id uuid default gen_random_uuid() primary key,
  allow_weekend_trading boolean default true,
  allow_news_trading boolean default true,
  allow_ea_trading boolean default true,
  min_trade_duration_seconds integer default 0,
  max_single_win_percent integer default 50,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payout_requests enable row level security;
alter table public.trades enable row level security;

-- Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own challenges" on public.challenges for select using (auth.uid() = user_id);

create policy "Users can view own orders" on public.payment_orders for select using (auth.uid() = user_id);
create policy "Users can create own orders" on public.payment_orders for insert with check (auth.uid() = user_id);

create policy "Users can view own payouts" on public.payout_requests for select using (auth.uid() = user_id);
create policy "Users can create own payouts" on public.payout_requests for insert with check (auth.uid() = user_id);

create policy "Users can view own trades" on public.trades for select using (auth.uid() = user_id);

create policy "Users can view own KYC" on public.kyc_sessions for select using (auth.uid() = user_id);
create policy "Users can create own KYC" on public.kyc_sessions for insert with check (auth.uid() = user_id);

