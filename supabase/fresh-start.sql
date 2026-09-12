-- Fresh-start reset for The Beach Project Restobar Ops.
-- Run this only when you want to wipe app data and keep one admin account.

begin;

truncate table
  public.order_items,
  public.payments,
  public.orders,
  public.table_sessions,
  public.menu_items,
  public.expenses,
  public.audit_logs,
  public.tables,
  public.staff_accounts,
  public.settings
restart identity cascade;

insert into public.staff_accounts (id, name, username, password, role, status)
values ('USR-01', 'Admin User', 'admin', 'admin123', 'Admin', 'Active');

insert into public.settings (
  id,
  print_receipts,
  sound_alerts,
  require_served_before_cleaning
)
values ('default', true, true, true);

commit;
