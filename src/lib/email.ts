// lib/email.ts
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { supabase } from './supabase';

export type EmailHeader = {
  id: string;
  seq: number;
  subject: string;
  from: string;
  date: Date;
  accountLabel: string;
  threadId: string;
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

async function fetchFromAccount(user: string, pass: string, label: string): Promise<EmailHeader[]> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const emails: EmailHeader[] = [];

  try {
    await client.connect();

    let lock = await client.getMailboxLock('INBOX');

    try {
      for await (let message of client.fetch('1:*', { envelope: true, internalDate: true }, { uid: true })) {
        const subject = message.envelope?.subject || '(Pas de sujet)';
        emails.push({
            id: message.uid.toString(),
            seq: message.seq,
            subject,
            from: message.envelope?.from?.[0]?.address || 'Inconnu',
            date: new Date(message.internalDate ?? Date.now()),
            accountLabel: label,
            threadId: normalizeSubject(subject),
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error(`Erreur sur le compte ${label}:`, err);
    return [];
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
  }));

  const { error } = await supabase
    .from('emails')
    .upsert(rows, { onConflict: 'provider_id,account_label' });

  if (error) {
    console.error('Supabase upsert error:', error);
  }
}

async function getCachedEmails(): Promise<EmailHeader[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('emails')
    .select('provider_id, account_label, subject, sender, date, thread_id')
    .order('date', { ascending: false })
    .limit(100);

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

export async function syncEmails(): Promise<EmailHeader[]> {
  const [emails1, emails2] = await Promise.all([
    fetchFromAccount(process.env.GMAIL_1_USER!, process.env.GMAIL_1_PASS!, 'Perso'),
    fetchFromAccount(process.env.GMAIL_2_USER!, process.env.GMAIL_2_PASS!, 'Pro'),
  ]);

  // Upsert both batches into Supabase in parallel
  await Promise.all([upsertToSupabase(emails1), upsertToSupabase(emails2)]);

  const allEmails = [...emails1, ...emails2];

  return allEmails.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getEmailBody(providerId: string, accountLabel: string): Promise<string> {
  // 1. Check Supabase cache first
  if (supabase) {
    const { data } = await supabase
      .from('emails')
      .select('body_html')
      .eq('provider_id', providerId)
      .eq('account_label', accountLabel)
      .single();

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
  });

  let html = '';

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const source = await client.download(providerId, undefined, { uid: true });
      const parsed = await simpleParser(source.content);
      html = parsed.html || parsed.textAsHtml || '';
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error(`Error fetching body for ${providerId} (${accountLabel}):`, err);
    return '';
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
    .select('provider_id, account_label, subject, sender, date, thread_id')
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
  }));
}
