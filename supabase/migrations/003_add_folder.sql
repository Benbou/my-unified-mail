alter table emails add column if not exists folder text not null default 'inbox';
create index if not exists idx_emails_folder on emails(folder);
-- Update the unique constraint to include folder so the same email can exist in different folders
alter table emails drop constraint if exists emails_provider_id_account_label_key;
alter table emails add constraint emails_provider_id_account_label_folder_key unique (provider_id, account_label, folder);
