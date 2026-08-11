# Step-by-step: Deploy Catkom Prints on Hostinger

**Domain:** `catkomprints.online` (already in your Hostinger account)

Follow these steps in order. Don’t skip any.

---

## Part 1 — Create the database (Neon)

Hostinger Node.js hosting needs an external Postgres database.

1. Open [https://console.neon.tech](https://console.neon.tech) in your browser.
2. Sign up / log in (GitHub login is fine).
3. Click **Create a project**.
4. Project name: `catkom-prints`.
5. Leave the default region unless you prefer another.
6. Click **Create project**.
7. On the next screen, copy the **Connection string**.
   - It looks like: `postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
8. Paste it into a notes app for now. You’ll need it twice (Hostinger + seeding).

---

## Part 2 — Create a secret key

On your Mac, open **Terminal** and run:

```bash
openssl rand -base64 32
```

Copy the result. That is your `AUTH_SECRET`.

---

## Part 3 — Put the project on GitHub

Hostinger deploys from GitHub.

### 3A. Create a GitHub repo

1. Open [https://github.com/new](https://github.com/new)
2. Repository name: `catkom-prints`
3. Keep it **Private** (recommended) or Public
4. Do **not** add README / .gitignore / license (project already has files)
5. Click **Create repository**
6. Copy the repo URL, e.g. `https://github.com/YOUR_USERNAME/catkom-prints.git`

### 3B. Push this project

In Terminal:

```bash
cd "/Users/kelly/cursor project"
git add .
git status
git commit -m "Ready for Hostinger deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/catkom-prints.git
git push -u origin main
```

If `git remote add` says the remote already exists, use:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/catkom-prints.git
git push -u origin main
```

GitHub may ask you to sign in / authorize.

---

## Part 4 — Create the Node.js website in Hostinger

1. Open [https://hpanel.hostinger.com](https://hpanel.hostinger.com) and log in.
2. Go to **Websites**.
3. Click **Add website**.
4. Choose **Node.js web app**.
   - If you don’t see this option, your plan may not include Node.js apps. Stop and tell me — we’ll use VPS steps instead.
5. Choose deployment from **GitHub**.
6. Authorize Hostinger to access GitHub if asked.
7. Select repository: **catkom-prints**
8. Branch: **main**
9. When asked for a domain, select **catkomprints.online**
   - Also add **www.catkomprints.online** if offered
10. Framework / settings:

| Setting | Value |
|---|---|
| Framework | Next.js |
| Node.js version | **22** (or **20**) |
| Build command | `npm run build` |
| Start command | `npm start` |

11. Continue / create the website and wait for the first deploy attempt.

---

## Part 5 — Add environment variables

In hPanel, open your new website → look for **Environment variables** / **Node.js** / **App settings**.

Add each of these (one per line / one per field):

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string from Part 1 |
| `AUTH_SECRET` | The secret from Part 2 |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://catkomprints.online` |

Optional (only if you have Twilio):

| Name | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | your Twilio SID |
| `TWILIO_AUTH_TOKEN` | your Twilio token |
| `TWILIO_FROM_NUMBER` | e.g. `+15551234567` |

Save, then **Redeploy** / **Restart** the Node.js app.

---

## Part 6 — Turn on SSL (HTTPS)

1. In the website panel, open **SSL**.
2. Enable free SSL for:
   - `catkomprints.online`
   - `www.catkomprints.online` (if used)
3. Wait until status shows active.

Then open: [https://catkomprints.online](https://catkomprints.online)

---

## Part 7 — Load demo data (seed)

On your Mac Terminal:

```bash
cd "/Users/kelly/cursor project"
```

Temporarily set production database in your local `.env` (or run with the URL inline):

```bash
export DATABASE_URL="paste-your-neon-connection-string-here"
npm run db:seed
```

You should see the command finish without errors.

Demo logins:

- Admin: `admin@catkomprints.local` / `password123`
- Stock out: `operator@catkomprints.local` / `password123`

---

## Part 8 — Test the live site

1. Open [https://catkomprints.online/login](https://catkomprints.online/login)
2. Sign in with the admin account
3. Check Dashboard, Products, Stock out link
4. Open [https://catkomprints.online/operator/login](https://catkomprints.online/operator/login)
5. Sign in as operator and record a test stock out

---

## If something fails

### Build failed on Hostinger
- Confirm build command is exactly `npm run build`
- Confirm all 4 required env vars are set
- Confirm `DATABASE_URL` starts with `postgresql://`

### Site opens but login fails
- Confirm `AUTH_URL` is exactly `https://catkomprints.online` (no trailing slash)
- Confirm `AUTH_SECRET` is set
- Redeploy / restart after changing env vars

### Domain not connecting
- In Websites, open **catkomprints.online** → domain connection guide
- Since the domain is already at Hostinger, use Hostinger’s suggested nameservers/A records from that guide
- Wait for DNS (can take up to a few hours)

### “Node.js web app” missing
Your plan doesn’t include Node.js hosting. Message me and I’ll give VPS steps for the same domain.

---

## Quick checklist

- [ ] Neon database created
- [ ] `AUTH_SECRET` generated
- [ ] Code pushed to GitHub
- [ ] Hostinger Node.js website created with `catkomprints.online`
- [ ] Env vars added
- [ ] SSL enabled
- [ ] Database seeded
- [ ] https://catkomprints.online/login works
