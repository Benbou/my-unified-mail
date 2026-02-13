# My Unified Mail

Boîte de réception unifiée qui agrège les emails de plusieurs comptes Gmail dans une seule interface.

## Stack technique

- **Framework** : Next.js 16 (App Router, Server Components)
- **Langage** : TypeScript
- **UI** : shadcn/ui (Sidebar 09) + Tailwind CSS v4
- **Email** : ImapFlow (IMAP) + Nodemailer (SMTP) + mailparser (simpleParser)
- **Base de données** : Supabase (cache emails + threads)
- **Éditeur** : Tiptap (rich text pour la composition)
- **Fonts** : Geist Sans / Geist Mono

## Architecture

```
src/
├── app/
│   ├── layout.tsx            # Layout racine (fonts, metadata, TooltipProvider)
│   ├── page.tsx              # Server Component async → fetch emails → <MailLayout>
│   ├── actions.ts            # Server Actions (getEmailBody, markAsRead, sendEmail, getThreadMessages)
│   ├── api/sync/route.ts     # Route Handler GET /api/sync (sync IMAP sans bloquer les Server Actions)
│   └── globals.css           # Variables CSS shadcn/ui + Tailwind v4
├── components/
│   ├── mail-layout.tsx       # Client wrapper : état sélection + compose + sync optimiste
│   ├── app-sidebar.tsx       # Sidebar icônes (nav : Tous / Perso / Pro / Envoyés / Corbeille)
│   ├── email-list.tsx        # Liste emails scrollable avec recherche et filtres
│   ├── email-view.tsx        # Panneau lecture : fetch body + Skeleton loading + erreur
│   ├── email-composer.tsx    # Compositeur Tiptap (De / À / Objet / Corps / Toolbar)
│   ├── nav-user.tsx          # Menu utilisateur en bas de la sidebar
│   └── ui/                   # Composants shadcn/ui (button, sidebar, resizable, etc.)
├── hooks/
│   └── use-mobile.ts         # Hook détection mobile
└── lib/
    ├── email.ts              # Moteur IMAP/Supabase : fetch, sync, threads, body, envoi
    ├── supabase.ts           # Client Supabase (graceful si non configuré)
    └── utils.ts              # Utilitaire cn() (shadcn)

supabase/
└── migrations/
    ├── 001_create_emails.sql # Table emails (id, provider_id, account_label, subject, sender, date, body_html, is_read)
    └── 002_add_thread_id.sql # Colonne thread_id + index
```

## Layout (3 colonnes resizable)

- **Colonne 1** : Sidebar collapsible (icônes de navigation)
- **Colonne 2** : Liste emails (resizable, scrollable, avec recherche)
- **Colonne 3** : Panneau lecture ou compositeur (resizable, scrollable)

Chaque panneau scrolle indépendamment. La page ne scrolle jamais (`h-screen overflow-hidden`).

## Fonctionnement

### Lecture
1. `page.tsx` (Server Component) appelle `getUnifiedEmails()` → charge depuis le cache Supabase (instantané) ou fallback IMAP
2. `mail-layout.tsx` déclenche `fetch('/api/sync')` en background via `useEffect` → synchro IMAP silencieuse via Route Handler (ne bloque pas les Server Actions)
3. Clic sur un email → `getEmailBody()` (Server Action) vérifie le cache Supabase, sinon fetch via IMAP + simpleParser → cache le résultat
4. `markAsRead()` met à jour le flag `is_read` dans Supabase

> **Note** : Le sync utilise un Route Handler (`GET /api/sync`) au lieu d'une Server Action car Next.js sérialise les Server Actions par client — un sync long (5-30s) bloquerait `getEmailBody()`.

### Threading
- Les emails sont groupés par sujet normalisé (strip Re:/Fwd:/Fw:)
- `groupByThread()` retourne des `ThreadGroup[]` triés par date
- `getThreadMessages()` récupère tous les messages d'un thread depuis Supabase

### Composition & Envoi
- Éditeur Tiptap avec toolbar (Gras, Italique, Titre, Listes)
- Sélecteur de compte "De" (Perso / Pro)
- `sendEmail()` utilise Nodemailer via Gmail SMTP (port 587, STARTTLS)

## Configuration

`.env.local` (jamais commité) :

```
# Gmail
GMAIL_1_USER=...
GMAIL_1_PASS=...          # App password Gmail
GMAIL_2_USER=...
GMAIL_2_PASS=...

# Supabase (optionnel — l'app fonctionne sans, en mode IMAP direct)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Pour obtenir un App Password Gmail : Google Account > Sécurité > Mots de passe des applications.

## Conventions

- Langue du code : anglais (noms de variables, types, fonctions)
- Langue de l'UI : français
- Composants UI : shadcn/ui (`npx shadcn@latest add <composant>`)
- Styles : Tailwind utility classes uniquement
- Server Components par défaut, `"use client"` uniquement si nécessaire
- Les erreurs IMAP sont catchées par compte pour ne pas casser l'UI
- Supabase est optionnel : toutes les fonctions vérifient `if (!supabase)` avant d'appeler

## Commandes

```bash
npm run dev       # Serveur de dev (http://localhost:3000)
npm run build     # Build production
npm run start     # Serveur production
npm run lint      # ESLint
```
