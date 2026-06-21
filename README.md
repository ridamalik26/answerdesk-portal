# AnswerDesk — Client Portal

A full-stack client portal for an answering service business. Clients can log in, view their call logs, track minute usage, manage billing, and complete onboarding. Admins can manage all clients, view billing overview, and sync contacts to HubSpot CRM.

**Live:** [answerdesk-portal.vercel.app](https://answerdesk-portal.vercel.app)

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS
- **Backend/Auth:** Supabase (PostgreSQL + Auth)
- **CRM:** HubSpot (auto-sync on client creation)
- **Deployment:** Vercel

---

## Features

### Client Portal
- Secure email/password login via Supabase Auth
- **Dashboard** — minutes used (ring chart), calls this month, next invoice, overage risk, recent calls, weekly usage bars
- **Call Logs** — full call history with filters (status, date), search, CSV export, pagination
- **Minute Tracker** — plan vs used vs remaining, daily/weekly breakdown, overage history
- **Billing** — current plan details, upcoming invoice estimate, invoice history with PDF download
- **My Account** — business info form, notification preferences toggles, password change
- **Onboarding** — progress tracker, step checklist, call handling instructions form

### Admin Panel
- Separate admin login (role-based access via email check)
- **All Clients** — searchable/filterable client table, MRR stats, Add Client with modal form
- **Client Detail** — contact info, plan & billing, usage stats, admin notes, actions
- **Billing Overview** — MRR, overage revenue, plan distribution, clients with issues
- **HubSpot Sync** — new client added in portal → contact auto-created in HubSpot CRM

---

## Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `clients` | Business info, plan, billing details |
| `calls` | Call logs per client |
| `invoices` | Invoice history |
| `onboarding_steps` | Checklist progress per client |
| `client_settings` | Greeting script, hours, message delivery |

RLS enabled — clients can only access their own data.

---

## Project Structure

```
src/
├── app/
│   ├── login/              ← Login page
│   ├── (dashboard)/        ← Client portal (shared sidebar layout)
│   │   ├── dashboard/
│   │   ├── calls/
│   │   ├── minutes/
│   │   ├── billing/
│   │   ├── account/
│   │   └── onboarding/
│   ├── admin/              ← Admin panel
│   │   ├── page.js         ← All Clients
│   │   ├── [id]/           ← Client Detail
│   │   └── billing/        ← Billing Overview
│   └── api/
│       └── admin/clients/  ← Create client + HubSpot sync
├── lib/
│   ├── supabase.js         ← Browser client
│   ├── supabase-server.js  ← Server client
│   └── hubspot.js          ← HubSpot contact creation
└── proxy.js                ← Route protection (Next.js 16)
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
HUBSPOT_ACCESS_TOKEN=
```

---

## Screenshots

### Login
![Login](./assets/ss/login.png)

### Dashboard
![Dashboard](./assets/ss/dashboard.png)

### Call Logs
![Call Logs](./assets/ss/calls.png)

### Minute Tracker
![Minute Tracker](./assets/ss/minutes.png)

### Billing
![Billing](./assets/ss/billing.png)

### My Account
![My Account](./assets/ss/account.png)

### Onboarding
![Onboarding](./assets/ss/onboarding.png)

### Admin — All Clients
![Admin Clients](./assets/ss/admin-clients.png)

### Admin — Client Detail
![Admin Client Detail](./assets/ss/admin-client-detail.png)

### Admin — Billing Overview
![Admin Billing](./assets/ss/admin-billing.png)

### HubSpot CRM Sync
![HubSpot](./assets/ss/hubspot.png)

---

## Getting Started

```bash
git clone https://github.com/ridamalik26/answerdesk-portal
cd answerdesk-portal
npm install
# Add .env.local with your keys
npm run dev
```

---

## Built by

Rida Malik — [github.com/ridamalik26](https://github.com/ridamalik26) · [linkedin.com/in/rida-malik-softwareengineer](https://linkedin.com/in/rida-malik-softwareengineer)