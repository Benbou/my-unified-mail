'use server';

import {
  getEmailBody as fetchBody,
  markAsRead as markRead,
  getThreadMessages as fetchThread,
  syncEmails as doSync,
  archiveEmail as doArchive,
  trashEmail as doTrash,
} from '@/lib/email';
import type { EmailHeader, EmailFolder } from '@/lib/email';
import nodemailer from 'nodemailer';

export async function getEmailBody(providerId: string, accountLabel: string, folder: EmailFolder = 'inbox') {
  return fetchBody(providerId, accountLabel, folder);
}

export async function markAsRead(providerId: string, accountLabel: string, folder: EmailFolder = 'inbox') {
  return markRead(providerId, accountLabel, folder);
}

export async function archiveEmail(providerId: string, accountLabel: string, fromFolder: EmailFolder) {
  return doArchive(providerId, accountLabel, fromFolder);
}

export async function trashEmail(providerId: string, accountLabel: string, fromFolder: EmailFolder) {
  return doTrash(providerId, accountLabel, fromFolder);
}

export async function getThreadMessages(threadId: string) {
  return fetchThread(threadId);
}

export async function syncEmails(): Promise<EmailHeader[]> {
  return doSync();
}

export async function sendEmail(data: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
}) {
  const { from, to, cc, subject, body } = data;

  const user = from === 'Perso' ? process.env.GMAIL_1_USER! : process.env.GMAIL_2_USER!;
  const pass = from === 'Perso' ? process.env.GMAIL_1_PASS! : process.env.GMAIL_2_PASS!;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to,
    cc: cc || undefined,
    subject,
    html: body,
  });

  return { success: true };
}
