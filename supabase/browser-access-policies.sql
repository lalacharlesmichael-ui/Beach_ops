-- Browser access policies for the current custom login prototype.
-- Run this in Supabase SQL Editor after schema.sql.
--
-- This allows the Vite app to read and write using the anon key.
-- Before production, replace the client-side password login with Supabase Auth
-- and tighten these policies by user role.

begin;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.staff_accounts,
  public.tables,
  public.table_sessions,
  public.menu_items,
  public.orders,
  public.order_items,
  public.payments,
  public.expenses,
  public.audit_logs,
  public.settings
to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

alter table public.staff_accounts enable row level security;
alter table public.tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Allow app CRUD" on public.staff_accounts;
create policy "Allow app CRUD" on public.staff_accounts
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.tables;
create policy "Allow app CRUD" on public.tables
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.table_sessions;
create policy "Allow app CRUD" on public.table_sessions
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.menu_items;
create policy "Allow app CRUD" on public.menu_items
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.orders;
create policy "Allow app CRUD" on public.orders
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.order_items;
create policy "Allow app CRUD" on public.order_items
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.payments;
create policy "Allow app CRUD" on public.payments
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.expenses;
create policy "Allow app CRUD" on public.expenses
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.audit_logs;
create policy "Allow app CRUD" on public.audit_logs
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow app CRUD" on public.settings;
create policy "Allow app CRUD" on public.settings
for all to anon, authenticated using (true) with check (true);

commit;
