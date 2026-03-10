# My Unified Mail

Unified inbox aggregating emails from multiple Gmail accounts into a single interface.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript
- **UI**: shadcn/ui (Sidebar 09) + Tailwind CSS v4
- **Email**: ImapFlow (IMAP) + Nodemailer (SMTP) + mailparser (simpleParser) + isomorphic-dompurify (sanitize)
- **Notifications**: Sonner (toast)
- **Database**: Supabase (email cache + threads)
- **Editor**: Tiptap (rich text for composition)
- **Fonts**: Geist Sans / Geist Mono

## Architecture

```
src/
├── app/
│   ├── layout.tsx            # Root layout (fonts, metadata, TooltipProvider, Toaster)
│   ├── page.tsx              # Async Server Component → fetch emails → <MailLayout>
│   ├── actions.ts            # Server Actions (getEmailBody, markAsRead, sendEmail, archiveEmail, trashEmail, etc.)
│   ├── api/sync/route.ts     # Route Handler GET /api/sync (IMAP sync without blocking Server Actions)
│   └── globals.css           # shadcn/ui CSS variables + Tailwind v4
├── components/
│   ├── mail-layout.tsx       # Client wrapper: selection state + compose (ComposeState) + 60s polling sync + optimistic UI
│   ├── app-sidebar.tsx       # Icon sidebar (nav: All / Perso / Pro / Sent / Trash)
│   ├── email-list.tsx        # Scrollable email list with search and filters
│   ├── email-view.tsx        # Reading pane: fetch body + sanitize HTML + Skeleton loading + error
│   ├── email-composer.tsx    # Tiptap composer (From / To / Cc / Subject / Body / Toolbar) — supports reply/replyAll/forward
│   ├── mail-actions.tsx      # Action toolbar: Archive, Delete, Snooze, Reply, Reply All, Forward
│   ├── nav-user.tsx          # User menu at bottom of sidebar
│   └── ui/                   # shadcn/ui components (button, sidebar, sonner, etc.)
├── hooks/
│   └── use-mobile.ts         # Mobile detection hook
└── lib/
    ├── email-types.ts        # Shared client/server types (EmailHeader, ComposeState, buildComposeState, composeTitles, normalizeSubject)
    ├── email.ts              # IMAP/Supabase engine: fetch, sync, threads, body, send, archive, trash — re-exports from email-types
    ├── sanitize.ts           # sanitizeHtml() via isomorphic-dompurify (XSS protection)
    ├── supabase.ts           # Supabase client (graceful if not configured)
    └── utils.ts              # cn() utility (shadcn)

supabase/
└── migrations/
    ├── 001_create_emails.sql # emails table (id, provider_id, account_label, subject, sender, date, body_html, is_read)
    ├── 002_add_thread_id.sql # thread_id column + index
    └── 004_add_recipients.sql # recipient, cc, account_email columns
```

## Layout (3-column)

- **Column 1**: Collapsible sidebar (navigation icons)
- **Column 2**: Email list (fixed 450px, scrollable, with search)
- **Column 3**: Reading pane or composer (takes remaining space, scrollable)

Each panel scrolls independently. The page never scrolls (`h-screen overflow-hidden`).

## How It Works

### Reading
1. `page.tsx` (Server Component) calls `getUnifiedEmails()` → loads from Supabase cache (instant) or falls back to IMAP
2. `mail-layout.tsx` triggers `fetch('/api/sync')` in background via `useEffect` → silent IMAP sync via Route Handler (doesn't block Server Actions) + **polls every 60s** with change-detection (no re-render if emails unchanged)
3. Click on email → `getEmailBody()` (Server Action) checks Supabase cache, else fetches via IMAP + simpleParser → caches the result
4. Email HTML is **sanitized via `isomorphic-dompurify`** before rendering (XSS protection)
5. `markAsRead()` updates the `is_read` flag in Supabase

> **Note**: Sync uses a Route Handler (`GET /api/sync`) instead of a Server Action because Next.js serializes Server Actions per client — a long sync (5-30s) would block `getEmailBody()`.

### Email Actions
- **Archive** (`e`) and **Delete** (`#` / `Backspace`) with optimistic UI + rollback on error + toast notifications
- **Reply** (`r`), **Reply All** (`Shift+R`), **Forward** (`f`) — pre-fill the composer with blockquote citation
- `moveEmail()` uses IMAP MOVE + Supabase delete/re-sync

### Threading
- Emails are grouped by normalized subject (strips Re:/Fwd:/Fw:)
- `groupByThread()` returns `ThreadGroup[]` sorted by date
- `getThreadMessages()` fetches all thread messages from Supabase

### Composition & Sending
- Tiptap editor with toolbar (Bold, Italic, Heading, Lists)
- Account selector "From" (Perso / Pro)
- **Cc** field (visible in reply all or manually toggled)
- Modes: New / Reply / Reply All / Forward (via `ComposeState`)
- `sendEmail()` uses Nodemailer via Gmail SMTP (port 587, STARTTLS) — supports `cc`

### Important Architecture Patterns
- **`email-types.ts`**: Shared client/server types (separated from `email.ts` which has server-only dependencies like ImapFlow). Client components import from `email-types.ts`, never from `email.ts` directly.
- **`normalizeSubject()`** and **`composeTitles`**: Defined once in `email-types.ts`, imported everywhere
- **Optimistic UI**: `pendingRemovals` Set to immediately hide archived/deleted emails with rollback on error

## Configuration

`.env.local` (never committed):

```
# Gmail
GMAIL_1_USER=...
GMAIL_1_PASS=...          # Gmail App Password
GMAIL_2_USER=...
GMAIL_2_PASS=...

# Supabase (optional — app works without it, in direct IMAP mode)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

To get a Gmail App Password: Google Account > Security > App Passwords.

## Conventions

- Code language: English (variable names, types, functions)
- UI language: French
- UI components: shadcn/ui (`npx shadcn@latest add <component>`)
- Styles: Tailwind utility classes only
- Server Components by default, `"use client"` only when necessary
- IMAP errors are caught per account to avoid breaking the UI
- Supabase is optional: all functions check `if (!supabase)` before calling

## Commands

```bash
npm run dev       # Dev server (http://localhost:3000)
npm run build     # Production build
npm run start     # Production server
npm run lint      # ESLint
```
