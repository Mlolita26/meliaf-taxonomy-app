# MELIAF Taxonomy Review App — Setup Guide

> **Is this free?** Yes, 100%. Both Supabase and Vercel have free plans that are more than enough for a small review team. No credit card required for either.

This guide sets up the app in about 30 minutes. You'll go through 5 stages:
1. Create the database (Supabase)
2. Import the taxonomy data
3. Run the app on your computer to test it
4. Put the app online (Vercel)
5. Invite your reviewers

---

## What you need before starting

- **Node.js** installed on your computer. Check by opening a terminal and typing `node --version`. If you see a number (e.g. `v20.x.x`), you're good. If not, download it free from https://nodejs.org (choose the LTS version).
- **The project folder** at `C:/Users/mlolita/Documents/meliaf-taxonomy-app/` — already built.
- **15 minutes and a web browser.**

---

## Stage 1 — Create the database (Supabase)

Supabase is the free service that stores all your data (terms, users, points, etc.).

### 1.1 — Create a free account

1. Go to **https://supabase.com**
2. Click **Start your project** (top right)
3. Sign up with GitHub or email — either works, it's free
4. You'll land on a dashboard

### 1.2 — Create a new project

1. Click **New project**
2. Fill in:
   - **Name:** `meliaf-taxonomy` (or anything you like)
   - **Database password:** choose a strong password and **save it somewhere** — you'll need it if you ever connect directly to the database
   - **Region:** pick the one closest to you (e.g. `West EU` if you're in Europe)
3. Click **Create new project**
4. Wait about 2 minutes while it sets up (you'll see a loading spinner)

### 1.3 — Run the database setup (migrations)

This creates all the tables, rules, and initial data your app needs. You'll do this by pasting SQL code into Supabase's built-in editor.

1. In your Supabase project, click **SQL Editor** in the left menu
2. You'll see a blank text area — this is where you paste SQL code
3. Open the file `supabase/migrations/001_schema.sql` from your project folder (open it with Notepad or any text editor)
4. Select all the text (Ctrl+A), copy it (Ctrl+C)
5. Paste it into the Supabase SQL Editor (Ctrl+V)
6. Click the **Run** button (green button, bottom right)
7. You should see "Success. No rows returned" — that's correct!

Repeat steps 3–7 for each of these files **in order**:
- `supabase/migrations/002_rls.sql`
- `supabase/migrations/003_triggers.sql`
- `supabase/migrations/004_badges_seed.sql`

> **Tip:** Clear the editor between each file (select all, delete) before pasting the next one.

### 1.4 — Get your API keys

Your app needs two "keys" to talk to the database. Think of them like a username and password for your app.

1. In the left menu, click **Settings** (gear icon at the very bottom)
2. Click **API**
3. You'll see two values — copy them somewhere (a notepad is fine):
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public** key — a long string of letters and numbers

> **Do not share the `service_role` key** (the other key on that page) — that one has full access to your database. Only the two above are needed for the app.

---

## Stage 2 — Connect your computer to the database

### 2.1 — Create your environment file

This file tells the app which database to use. It stays on your computer and is never uploaded anywhere.

1. Open your project folder: `C:/Users/mlolita/Documents/meliaf-taxonomy-app/`
2. Find the file called `.env.local.example`
3. Make a **copy** of it in the same folder
4. Rename the copy to `.env.local` (remove the `.example` part)
5. Open `.env.local` with Notepad
6. Replace the placeholder values with your real ones from Stage 1.4:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

The `service_role` key is on the same API settings page in Supabase — it's the long key listed under "service_role" (keep this one secret, only needed for the import step).

7. Save and close the file.

> **Note:** If you can't see `.env.local` in File Explorer, it might be hidden because it starts with a dot. In File Explorer, go to View → Show → Hidden items.

### 2.2 — Import the taxonomy data

This reads your Excel file and puts all 96 terms into the database. You only need to do this once.

1. Open a **terminal** (Command Prompt or PowerShell) in your project folder
   - In File Explorer, navigate to `C:/Users/mlolita/Documents/meliaf-taxonomy-app/`
   - Hold **Shift**, right-click in the folder, choose **Open PowerShell window here**
2. Type this command and press Enter:
   ```
   npx ts-node --esm --skip-project scripts/seed-taxonomy.ts
   ```
3. Wait about 30 seconds. You should see:
   ```
   Reading: C:/Users/.../AdaptationTaxonomy.xlsx
   Parsed 96 terms. Upserting...
   ✓ Successfully seeded 96 terms.
   Total terms in DB: 96
   ```

If you see an error about the file path, add this before the command:
```
set TAXONOMY_PATH=C:\Users\mlolita\OneDrive - CGIAR\...\AdaptationTaxonomy.xlsx
```
(Use the exact path to your Excel file.)

---

## Stage 3 — Test the app on your computer

### 3.1 — Start the app

1. In the same terminal, type:
   ```
   npm run dev
   ```
2. You'll see something like:
   ```
   ▲ Next.js 14.x.x
   ✓ Ready in 2.3s
   ```
3. Open your browser and go to **http://localhost:3000**
4. You should see the MELIAF Taxonomy landing page 🌿

### 3.2 — Create your account and set yourself as admin

1. Click **Join the review** and create an account with your email
2. Choose a pseudonym (or click Generate for a fun one)
3. After signing up, go back to **Supabase → SQL Editor**
4. Paste this code (replace `your@email.com` with the email you just used):
   ```sql
   UPDATE public.profiles
   SET is_admin = TRUE
   WHERE id = (
     SELECT id FROM auth.users WHERE email = 'your@email.com'
   );
   ```
5. Click **Run** — this makes you the admin so you can see the admin dashboard

### 3.3 — Check that everything works

- Visit http://localhost:3000/home — you should see your dashboard
- Visit http://localhost:3000/browse — you should see all 96 taxonomy terms
- Visit http://localhost:3000/admin — you should see the admin panel (only visible to admins)

> **If the browse page is empty:** The seed script may not have run correctly. Go back to Stage 2.2 and try again.

---

## Stage 4 — Put the app online (Vercel)

Vercel hosts your app for free so anyone with the link can access it.

### 4.1 — Push your code to GitHub

> GitHub stores your code in the cloud so Vercel can access it. It's free.

1. Go to **https://github.com** and create a free account if you don't have one
2. Click **+** (top right) → **New repository**
3. Name it `meliaf-taxonomy-app`, leave it **Private**, click **Create repository**
4. In your terminal (in the project folder), run these commands one by one:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/meliaf-taxonomy-app.git
   git push -u origin main
   ```
   Replace `YOUR-USERNAME` with your GitHub username.
5. Refresh the GitHub page — you should see all your files there

### 4.2 — Deploy on Vercel

1. Go to **https://vercel.com** and sign up (click "Continue with GitHub" — easiest)
2. Click **Add New** → **Project**
3. You'll see your GitHub repositories — click **Import** next to `meliaf-taxonomy-app`
4. Before clicking Deploy, click **Environment Variables** and add these two:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |

5. Click **Deploy**
6. Wait ~2 minutes while Vercel builds the app
7. You'll get a URL like `https://meliaf-taxonomy-app.vercel.app` — **this is your app!**

> **Important:** Do NOT add the `SUPABASE_SERVICE_ROLE_KEY` to Vercel. That key is only for the seed script and stays on your computer.

---

## Stage 5 — Set up reviewers

### 5.1 — Invite reviewers

Share your Vercel URL with your team. Each person:
1. Goes to the URL
2. Clicks **Join the review**
3. Creates an account with a pseudonym
4. The app automatically assigns them terms to review

### 5.2 — Assign terms to reviewers (run once after at least 2 people sign up)

After at least 2 reviewers have registered, you need to trigger the assignment system.

1. In Supabase → **SQL Editor**, run this to check who has registered:
   ```sql
   SELECT pseudonym, created_at FROM public.profiles WHERE is_admin = FALSE;
   ```
2. When you have at least 2 reviewers, run this to assign terms:
   ```sql
   -- This manually creates assignments for all terms
   -- The system will assign max 2 reviewers per term automatically
   INSERT INTO public.review_assignments (term_id, reviewer_id, due_date, status)
   SELECT
     t.id,
     p.id,
     NOW() + INTERVAL '14 days',
     'pending'
   FROM public.taxonomy_terms t
   CROSS JOIN public.profiles p
   WHERE p.is_admin = FALSE
     AND NOT EXISTS (
       SELECT 1 FROM public.review_assignments ra
       WHERE ra.term_id = t.id AND ra.reviewer_id = p.id
     )
   LIMIT 192; -- 96 terms × 2 reviewers
   ```

> **Easier option:** After reviewers sign up, you can also call the automatic assignment function by visiting your Vercel URL `/api/admin/export-csv` while logged in as admin — or just use the SQL above.

### 5.3 — Refresh the leaderboard (optional)

The leaderboard updates automatically every 5 minutes if you enable pg_cron. For now, you can refresh it manually:

In Supabase SQL Editor:
```sql
REFRESH MATERIALIZED VIEW public.leaderboard;
```

---

## Common questions

**Q: A reviewer says they have no terms in their queue.**
Run the assignment SQL from Stage 5.2 again — the system may not have assigned them any terms yet.

**Q: The leaderboard is empty.**
Run `REFRESH MATERIALIZED VIEW public.leaderboard;` in Supabase SQL Editor.

**Q: Someone wants to change their pseudonym.**
Pseudonyms lock after 48 hours. As admin, you can change it in Supabase → Table Editor → `profiles`.

**Q: How do I see all suggestions from reviewers?**
Go to `your-url.vercel.app/admin/suggestions` (you must be logged in as admin).

**Q: How do I export the updated taxonomy to Excel after reviews?**
Go to `your-url.vercel.app/admin/terms` and click **Export CSV**. Open the CSV in Excel.

**Q: Someone is cheating / I want to remove a user.**
In Supabase → Table Editor → `profiles`, find the user and set `is_active = false`.

**Q: The app is working but I want to update the taxonomy Excel and re-import.**
Run the seed script again (Stage 2.2) — it's safe to run multiple times. New terms are added, existing ones are updated.

---

## Summary of costs

| Service | Plan | Cost |
|---------|------|------|
| Supabase (database) | Free (Spark) | $0/month |
| Vercel (hosting) | Free (Hobby) | $0/month |
| GitHub (code storage) | Free | $0/month |
| **Total** | | **$0/month** |

The free tiers are very generous. You'd only exceed them if you had thousands of active users — this app is built for a small expert team.
