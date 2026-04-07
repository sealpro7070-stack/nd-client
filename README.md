# NilamDesk

> Automated browser tool that submitted Malaysian secondary school students' NILAM reading records to the AINS government portal.

---

> **Archived** — This project is no longer actively maintained. The AINS government portal (`ains.moe.gov.my`) frequently changed its page structure and session handling, causing the automation to break without warning. The project is preserved here as a portfolio piece.

---

## The Problem

Malaysian secondary school students are required to log their NILAM reading records on the **AINS portal** (`ains.moe.gov.my`). The process is entirely manual: students or teachers must log in, navigate to the submission form, and fill in details for each book one at a time — title, author, language, category, page count, summary, and review.

NilamDesk automated this end-to-end, allowing students to submit an entire reading list with a single click.

---

## How It Worked

1. **Frontend (React)** — Students logged in with Supabase Auth, managed their book list, and triggered submissions from a dashboard.
2. **Backend (Node.js + Express)** — Received submission requests and dispatched a Playwright browser instance.
3. **Playwright automation** — Launched a headless Chromium browser, authenticated to AINS using the student's stored session cookie, navigated the AINS form, and filled in each book's details programmatically.
4. **Scheduler (node-cron)** — Optionally ran submissions on a schedule so students didn't have to manually trigger them.
5. **Security** — AINS session cookies were encrypted at rest using AES-256-GCM before being stored in the database.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express |
| Browser Automation | Playwright (Chromium) |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| Encryption | AES-256-GCM (session cookie storage) |
| Scheduling | node-cron |
| Email | Nodemailer |
| Deployment | Railway (backend), Netlify / Vercel (frontend) |

---

## Project Structure

```
NilamDesk/
├── backend/
│   ├── bot/          # Playwright AINS form automation
│   ├── lib/          # crypto, auth middleware, supabase, email
│   ├── routes/       # Express API routes
│   ├── scheduler/    # cron jobs
│   └── index.js      # Express entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── index.html
└── supabase/
    ├── schema.sql    # Full DB schema with RLS policies
    └── seed.sql      # Sample book data (30 titles)
```

---

## Screenshots

*Screenshots coming soon.*

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- Playwright Chromium (`npx playwright install chromium`)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

---

## Environment Variables

**Backend** (`backend/.env`):
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=        # 64 hex chars (32 bytes)
FRONTEND_URL=
PORT=3001
```

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=
```

See `backend/.env.example` and `frontend/.env.example` for templates.

---

## Built by

**Nigel Lim**
