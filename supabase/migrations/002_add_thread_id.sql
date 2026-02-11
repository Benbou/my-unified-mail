alter table emails add column if not exists thread_id text;
create index if not exists idx_emails_thread_id on emails(thread_id);
