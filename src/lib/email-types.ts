export type EmailFolder = 'inbox' | 'sent' | 'trash' | 'archive';

export type EmailHeader = {
  id: string;
  seq: number;
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: Date;
  accountLabel: string;
  accountEmail: string;
  threadId: string;
  folder: EmailFolder;
  isRead: boolean;
};

export type ThreadGroup = {
  threadId: string;
  subject: string;
  latestDate: Date;
  messageCount: number;
  messages: EmailHeader[];
  accountLabel: string;
};

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export type ComposeState = {
  mode: ComposeMode;
  to: string;
  cc: string;
  subject: string;
  quotedBody: string;
  accountLabel: string;
};

export function normalizeSubject(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*|Fw:\s*)+/i, '').trim();
}

export const composeTitles: Record<ComposeMode, string> = {
  new: "Nouveau message",
  reply: "Répondre",
  replyAll: "Répondre à tous",
  forward: "Transférer",
};

const formatQuoteDate = (date: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

export function buildComposeState(
  mode: ComposeMode,
  email: EmailHeader,
  body: string
): ComposeState {
  const normalized = normalizeSubject(email.subject);
  let subject: string;
  if (mode === "forward") {
    subject = `Fwd: ${normalized}`;
  } else {
    subject = `Re: ${normalized}`;
  }

  const quoteHeader = `Le ${formatQuoteDate(email.date)}, ${email.from} a écrit :`;
  const quotedBody = `<br/><br/><div style="padding-left:12px;border-left:2px solid #ccc;margin-left:0;color:#555">${quoteHeader}<br/>${body}</div>`;

  let to = "";
  let cc = "";

  if (mode === "reply") {
    to = email.from;
  } else if (mode === "replyAll") {
    to = email.from;
    const allRecipients = [email.to, email.cc]
      .filter(Boolean)
      .join(", ")
      .split(",")
      .map((s) => s.trim())
      .filter((addr) => addr && addr.toLowerCase() !== email.accountEmail.toLowerCase());
    cc = allRecipients.join(", ");
  }

  return {
    mode,
    to,
    cc,
    subject,
    quotedBody,
    accountLabel: email.accountLabel,
  };
}
