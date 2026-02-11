create table if not exists emails (
  id          uuid primary key default gen_random_uuid(),
  provider_id text not null,
  account_label text not null,
  subject     text,
  sender      text,
  date        timestamptz,
  body_html   text,
  is_read     boolean not null default false,
  unique (provider_id, account_label)
);
