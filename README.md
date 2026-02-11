# My Unified Mail

Boîte de réception unifiée qui agrège les emails de plusieurs comptes Gmail dans une seule interface web.

## Fonctionnalités

- **Multi-comptes** : agrège 2 comptes Gmail (Perso + Pro) dans une seule vue
- **Lecture d'emails** : affichage du contenu HTML complet via IMAP + simpleParser
- **Composition** : éditeur rich text Tiptap (Gras, Italique, Titres, Listes)
- **Envoi** : envoi via Gmail SMTP avec sélection du compte d'expédition
- **Threading** : regroupement des emails par conversation
- **Cache** : Supabase comme cache pour un chargement instantané
- **Sync optimiste** : UI charge depuis le cache, synchronise en arrière-plan
- **Interface 3 colonnes** : sidebar nav + liste emails + panneau lecture (resizable)

## Stack

| Catégorie | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router, Server Components) |
| Langage | TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| Email (lecture) | ImapFlow + mailparser |
| Email (envoi) | Nodemailer (Gmail SMTP) |
| Base de données | Supabase (PostgreSQL) |
| Éditeur | Tiptap |

## Installation

```bash
git clone https://github.com/ton-user/my-unified-mail.git
cd my-unified-mail
npm install
```

## Configuration

Crée un fichier `.env.local` à la racine :

```env
# Compte Gmail Perso
GMAIL_1_USER=ton.email.perso@gmail.com
GMAIL_1_PASS=ton-app-password

# Compte Gmail Pro
GMAIL_2_USER=ton.email.pro@gmail.com
GMAIL_2_PASS=ton-app-password

# Supabase (optionnel)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Les mots de passe sont des **App Passwords Gmail**, pas les mots de passe du compte.
> Google Account > Sécurité > Mots de passe des applications.

> Supabase est **optionnel**. Sans configuration Supabase, l'app fonctionne en mode IMAP direct (plus lent au chargement).

## Lancement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | Lint ESLint |

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Server Component (fetch emails)
│   ├── actions.ts        # Server Actions (body, send, sync)
│   └── layout.tsx        # Layout racine
├── components/
│   ├── mail-layout.tsx   # Layout 3 colonnes resizable
│   ├── app-sidebar.tsx   # Sidebar navigation
│   ├── email-list.tsx    # Liste emails + recherche
│   ├── email-view.tsx    # Panneau lecture
│   └── email-composer.tsx# Éditeur Tiptap
└── lib/
    ├── email.ts          # Moteur IMAP + Supabase
    └── supabase.ts       # Client Supabase
```

## Licence

MIT
