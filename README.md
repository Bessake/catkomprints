# Catkom Prints — Stock & Front Desk

Inventory, invoicing, and client SMS for **Catkom Prints**.

## Stack

- Next.js (App Router) + TypeScript
- Prisma + SQLite
- Auth.js (credentials)
- Tailwind CSS
- Twilio SMS (optional)

## Setup

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Login

- Admin: `admin@catkomprints.local` / `password123`
- Staff: `staff@catkomprints.local` / `password123`
- Stock out terminal: `operator@catkomprints.local` / `password123`

Stock out terminal: [http://localhost:3000/operator/login](http://localhost:3000/operator/login)

## Features

- Print-shop stock (paper, ink, finishing, apparel, large format materials)
- Invoices with live price calculation
- Clients and front-desk SMS broadcast / payment reminders
- Stock out terminal with staff-name attribution (syncs to admin inventory)
- Catkom Prints branding and logo throughout

## Deploy (Hostinger)

Production domain: **https://catkomprints.online**

See [DEPLOY.md](./DEPLOY.md) for Hostinger Node.js Web App or VPS steps.
