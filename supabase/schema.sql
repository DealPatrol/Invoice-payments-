-- InvoiceOS schema for Supabase (free tier)
-- Run in Supabase SQL editor after creating a project

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  client_name text not null,
  client_email text default '',
  country text default '',
  currency text not null default 'USD',
  network text default '',
  status text not null default 'draft',
  due_date date,
  paid_date date,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,4) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text default '',
  pay_token text unique not null,
  stripe_session_id text,
  recurring boolean default false,
  late_fee_percent numeric(5,2) default 0,
  pay_score int default 70,
  created_at timestamptz default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_rate numeric(12,2) not null default 0,
  sort_order int default 0
);

create or replace function next_invoice_number()
returns text language plpgsql as $$
declare n int;
begin
  select count(*) + 1 into n from invoices;
  return 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

alter table invoices enable row level security;
alter table invoice_items enable row level security;

-- Service role bypasses RLS; for client apps add policies per auth user
