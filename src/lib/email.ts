// lib/email.ts
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase } from './supabase';

export type EmailFolder = 'inbox' | 'sent' | 'trash' | 'archive';

export type EmailHeader = {
  id: string;
  seq: number;
  subject: string;
  from: string;
  date: Date;
  accountLabel: string;
  threadId: string;
  folder: EmailFolder;
};

export type ThreadGroup = {
  threadId: string;
  subject: string;
  latestDate: Date;
  messageCount: number;
  messages: EmailHeader[];
  accountLabel: string;
};

function normalizeSubject(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*|Fw:\s*)+/i, '').trim();
}

function getAccountCreds(label: string): { user: string; pass: string } {
  if (label === 'Perso') {
    return { user: process.env.GMAIL_1_USER!, pass: process.env.GMAIL_1_PASS! };
  }
  return { user: process.env.GMAIL_2_USER!, pass: process.env.GMAIL_2_PASS! };
}

// Map our folder names to Gmail IMAP mailbox paths (English locale)
const GMAIL_MAILBOX: Record<EmailFolder, string> = {
  inbox: 'INBOX',
  sent: '[Gmail]/Sent Mail',
  trash: '[Gmail]/Trash',
  archive: '[Gmail]/All Mail',
};

// IMAP special-use attributes for locale-independent mailbox discovery
const FOLDER_SPECIAL_USE: Record<EmailFolder, string> = {
  inbox: '\\Inbox',
  sent: '\\Sent',
  trash: '\\Trash',
  archive: '\\All',
};

/**
 * Resolve the actual mailbox path for a folder by querying IMAP special-use attributes.
 * This handles Gmail accounts in non-English locales where folder names differ.
 */
async function resolveMailboxPath(client: ImapFlow, folder: EmailFolder): Promise<string> {
  if (folder === 'inbox') return 'INBOX';

  try {
    const mailboxes = await client.list();
    const attr = FOLDER_SPECIAL_USE[folder];
    const match = mailboxes.find((mb) => mb.specialUse === attr);
    if (match) return match.path;
  } catch (err) {
    console.error('resolveMailboxPath: list() failed, using English fallback:', err);
  }

  return GMAIL_MAILBOX[folder];
}

/** Safely disconnect an IMAP client, preventing uncaught socket timeouts. */
async function safeImapDisconnect(client: ImapFlow) {
  try {
    await client.logout();
  } catch {
    try {
      client.close();
    } catch {
      // ignore — connection already dead
    }
  }
}

async function fetchFromAccountFolder(
  user: string,
  pass: string,
  label: string,
  folder: EmailFolder
): Promise<EmailHeader[]> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 30_000,
  });

  const emails: EmailHeader[] = [];

  try {
    await client.connect();

    const mailbox = await resolveMailboxPath(client, folder);
    const lock = await client.getMailboxLock(mailbox);

    try {
      for await (const message of client.fetch('1:*', { envelope: true, internalDate: true }, { uid: true })) {
        const subject = message.envelope?.subject || '(Pas de sujet)';
        emails.push({
          id: message.uid.toString(),
          seq: message.seq,
          subject,
          from: message.envelope?.from?.[0]?.address || 'Inconnu',
          date: new Date(message.internalDate ?? Date.now()),
          accountLabel: label,
          threadId: normalizeSubject(subject),
          folder,
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`Erreur sur le compte ${label} (${folder}):`, err);
    return [];
  } finally {
    await safeImapDisconnect(client);
  }

  return emails.reverse().slice(0, 50);
}

async function upsertToSupabase(emails: EmailHeader[]) {
  if (!supabase || emails.length === 0) return;

  const rows = emails.map((e) => ({
    provider_id: e.id,
    account_label: e.accountLabel,
    subject: e.subject,
    sender: e.from,
    date: e.date.toISOString(),
    thread_id: e.threadId,
    folder: e.folder,
  }));

  const { error } = await supabase
    .from('emails')
    .upsert(rows, { onConflict: 'provider_id,account_label,folder' });

  if (error) {
    console.error('Supabase upsert error:', error);
  }
}

async function getCachedEmails(): Promise<EmailHeader[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('emails')
    .select('provider_id, account_label, subject, sender, date, thread_id, folder')
    .order('date', { ascending: false })
    .limit(200);

  if (error) {
    console.error('getCachedEmails error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.provider_id,
    seq: 0,
    subject: row.subject ?? '(Pas de sujet)',
    from: row.sender ?? 'Inconnu',
    date: new Date(row.date),
    accountLabel: row.account_label,
    threadId: row.thread_id ?? '',
    folder: (row.folder ?? 'inbox') as EmailFolder,
  }));
}

export async function getUnifiedEmails(): Promise<EmailHeader[]> {
  // Try Supabase cache first for instant load
  const cached = await getCachedEmails();
  if (cached.length > 0) {
    return cached;
  }

  // Fallback to IMAP when cache is empty
  return syncEmails();
}

// Folders to sync from Gmail via IMAP
const SYNC_FOLDERS: EmailFolder[] = ['inbox', 'sent', 'trash'];

export async function syncEmails(): Promise<EmailHeader[]> {
  const accounts = [
    { user: process.env.GMAIL_1_USER!, pass: process.env.GMAIL_1_PASS!, label: 'Perso' },
    { user: process.env.GMAIL_2_USER!, pass: process.env.GMAIL_2_PASS!, label: 'Pro' },
  ];

  // Fetch all folders for all accounts in parallel
  const fetches = accounts.flatMap((acc) =>
    SYNC_FOLDERS.map((folder) =>
      fetchFromAccountFolder(acc.user, acc.pass, acc.label, folder)
    )
  );

  const results = await Promise.all(fetches);

  // Upsert all batches into Supabase in parallel
  await Promise.all(results.map((batch) => upsertToSupabase(batch)));

  const allEmails = results.flat();

  return allEmails.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getEmailBody(providerId: string, accountLabel: string, folder: EmailFolder = 'inbox'): Promise<string> {
  // 1. Check Supabase cache (without folder filter — legacy rows may all have folder='inbox')
  if (supabase) {
    const { data } = await supabase
      .from('emails')
      .select('body_html')
      .eq('provider_id', providerId)
      .eq('account_label', accountLabel)
      .limit(1)
      .maybeSingle();

    if (data?.body_html) {
      return data.body_html;
    }
  }

  // 2. Fetch full body via IMAP + simpleParser
  const { user, pass } = getAccountCreds(accountLabel);
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 30_000,
  });

  let html = '';

  try {
    await client.connect();
    const mailbox = await resolveMailboxPath(client, folder);
    const lock = await client.getMailboxLock(mailbox);

    try {
      const source = await client.download(Number(providerId), undefined, { uid: true });
      const parsed = await simpleParser(source.content);
      html = parsed.html || parsed.textAsHtml || '';
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`Error fetching body for ${providerId} (${accountLabel}/${folder}):`, err);
    return '';
  } finally {
    await safeImapDisconnect(client);
  }

  // 3. Cache in Supabase
  if (supabase && html) {
    await supabase
      .from('emails')
      .update({ body_html: html })
      .eq('provider_id', providerId)
      .eq('account_label', accountLabel);
  }

  return html;
}

export async function markAsRead(providerId: string, accountLabel: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from('emails')
    .update({ is_read: true })
    .eq('provider_id', providerId)
    .eq('account_label', accountLabel);

  if (error) {
    console.error('markAsRead error:', error);
  }
}

export function groupByThread(emails: EmailHeader[]): ThreadGroup[] {
  const map = new Map<string, EmailHeader[]>();

  for (const email of emails) {
    const existing = map.get(email.threadId);
    if (existing) {
      existing.push(email);
    } else {
      map.set(email.threadId, [email]);
    }
  }

  const threads: ThreadGroup[] = [];

  for (const [threadId, messages] of map) {
    messages.sort((a, b) => a.date.getTime() - b.date.getTime());
    const latest = messages[messages.length - 1];
    threads.push({
      threadId,
      subject: latest.subject,
      latestDate: latest.date,
      messageCount: messages.length,
      messages,
      accountLabel: latest.accountLabel,
    });
  }

  return threads.sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
}

export async function getThreadMessages(threadId: string): Promise<EmailHeader[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('emails')
    .select('provider_id, account_label, subject, sender, date, thread_id, folder')
    .eq('thread_id', threadId)
    .order('date', { ascending: true });

  if (error) {
    console.error('getThreadMessages error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.provider_id,
    seq: 0,
    subject: row.subject ?? '(Pas de sujet)',
    from: row.sender ?? 'Inconnu',
    date: new Date(row.date),
    accountLabel: row.account_label,
    threadId: row.thread_id ?? '',
    folder: (row.folder ?? 'inbox') as EmailFolder,
  }));
}
