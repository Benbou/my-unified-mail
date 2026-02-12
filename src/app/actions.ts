'use server';

import { getEmailBody as fetchBody, markAsRead as markRead, getThreadMessages as fetchThread, syncEmails as doSync } from '@/lib/email';
import type { EmailHeader, EmailFolder } from '@/lib/email';
import nodemailer from 'nodemailer';

export async function getEmailBody(providerId: string, accountLabel: string, folder: EmailFolder = 'inbox') {
  return fetchBody(providerId, accountLabel, folder);
}

export async function markAsRead(providerId: string, accountLabel: string) {
  return markRead(providerId, accountLabel);
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
  subject: string;
  body: string;
}) {
  const { from, to, subject, body } = data;

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
    subject,
    html: body,
  });

  return { success: true };
}
