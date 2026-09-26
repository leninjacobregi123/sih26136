# Pilot register — Day 1 backend

A small Vercel app: `index.html` (the composer) + `api/*.js` (plain Node functions).
No framework, no build step. Separate from `docs/`, which stays on GitHub Pages.

```
shared/record_schema.csv    item 1 — header + one example row
shared/defect_taxonomy.json M3's 7 defect classes for the A1 critique (tomorrow). Advisory only, never blocks.
shared/POST_TO_GROUP.md     item 1 — the message to paste with the link
scripts/check_records.py    item 1 — checks M5's 40 rows against every rule
api/health.js               item 2 — GET /api/health?apis=1 calls Claude + embeddings from the deployed host
db/schema.sql               item 3 — pgvector + the four tables (safe to re-run)
api/challenges.js           item 4 — POST refuses without baseline value/source/method
index.html                  item 4 — the composer; submit disabled until the three are filled
```

## What only you can do (needs your accounts)

1. **Keys.** Create an Anthropic key (console.anthropic.com) and an OpenAI key
   (platform.openai.com). Anthropic has no embeddings API; OpenAI
   `text-embedding-3-small` returns 1536 dims, matching `records.embedding`.
2. **Database.** Create a Postgres with pgvector: Neon (Vercel Marketplace) or Supabase.
   Copy the connection string.
3. `cp .env.example .env.local`, fill in all three, then:
   ```
   npm install
   npm run smoke      # item 2 locally: PASS llm / PASS embeddings / PASS db
   npm run db:init    # item 3: prints the four table names
   ```
4. **Deploy.** Your Vercel CLI token has expired, so run `vercel login` first. Then from this folder:
   ```
   vercel link
   vercel env add ANTHROPIC_API_KEY production
   vercel env add OPENAI_API_KEY production
   vercel env add DATABASE_URL production
   vercel --prod
   npm run smoke -- --url=https://<your-app>.vercel.app   # item 2 on the deployed host
   ```
5. Open the live URL, create one challenge, then check it at `/api/challenges`.

## Verified locally (26 Sep, against pgvector/pg16 in Docker)

- `db:init` creates all four tables, and running it twice is harmless
- POST without source/method → 422 listing what's missing; non-numeric baseline → 422
- Complete POST → 201, row visible in `challenges` and via GET
- In Chrome: button disabled through every partial state (whitespace doesn't count),
  re-disables when a baseline field is cleared, saves and resets on submit
- `smoke` with no keys fails loudly on llm + embeddings, passes db

Not verified: real LLM/embedding calls (no keys on this machine) and anything on the deployed host.
