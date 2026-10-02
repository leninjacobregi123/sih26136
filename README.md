# Pilot register — Day 1 backend

A small Vercel app: `index.html` (the composer) + `api/*.js` (plain Node functions).
No framework, no build step. This repo is the one codebase: the app at the root, and the static pitch
walkthrough (formerly `govstart-bridge`) in `pitch/` — its site is `pitch/docs/`. `pitch/` is not uploaded to Vercel.

**Roadmap:** [APPLICATION_UPDATE.md](APPLICATION_UPDATE.md). `main` / tag `final-v1` is the submitted
implementation; new work happens on `v2-updates` and merges to `main` only when it works.

**Preview (static, no saving):** https://leninjacobregi.me/sih26136/
**Full app (form saves, APIs live):** after the Vercel deploy below.

```
shared/record_schema.csv    item 1 — header + one example row
shared/defect_taxonomy.json Pranjal's (M3) 7 defect classes for the A1 critique (tomorrow). Advisory only, never blocks.
shared/POST_TO_GROUP.md     item 1 — the message to paste with the link
scripts/check_records.py    item 1 — checks Jones's (M5) 40 rows against every rule
api/health.js               item 2 — GET /api/health?apis=1 calls the LLM from the deployed host
api/similar.js              GET /api/similar?id=PR-2026-0001 — the 5 nearest stored records
scripts/seed-records.mjs    loads Jones's (M5) CSV and embeds each record with local Ollama
db/schema.sql               item 3 — pgvector + the four tables (safe to re-run)
api/challenges.js           item 4 — POST refuses without baseline value/source/method
index.html                  item 4 — the composer; submit disabled until the three are filled
passport.html               a passport: the demo (no ?id) or a real pilot (?id=), with its action forms
pilots.html, login.html     every real pilot; sign in (real account, or a one-click demo role)
profile.html                a startup's profile: what screening reads (self-declared)
ledger.html                 public payments ledger: per department, against the payment SLA
assets/app.js, app.css      shared: API calls, session, nav bar, live notifications
api/auth.js, _auth.js       sign in / out; scrypt passwords, HMAC-signed HttpOnly session cookie
api/passports.js            list passports; read one with your available actions; run an action
api/_actions.js             the real workflow: who may do what, in which state, with what input
api/evidence.js             download an evidence file (signed in, not Public Viewer)
api/profile.js, ledger.js   startup profile; public payment aggregates (no sign-in, no startup names)
api/_quality.js             quality gate: rule checks + the model over Pranjal's defect taxonomy
api/_matching.js            hard filters with counterfactuals, then a score on published weights
api/_procurement.js         procurement route compiler (Tier 1/2/3 rules) and payment SLA status
shared/policy.json          programme policy: payment SLA, deeming GR, match weights
api/events.js               live audit events for a passport (server-sent events)
api/demo.js                 GET the demo passport; POST load / reset / advance (demo accounts)
api/_passport.js            seal (SHA-256), hash-chained audit log, the demo's step engine
shared/demo/opd-scenario.json the seeded OPD pilot: 7 roles, 10 states, 16 steps (edit content here)
scripts/dev.mjs             npm run dev — the pages and api/ locally, like Vercel
scripts/add-user.mjs        npm run user:add — create a real account (prints a generated password)
scripts/*.test.mjs          npm test — 25 tests; needs TEST_DATABASE_URL (a scratch database)
```

## Team

| | | |
|---|---|---|
| M1 | Lenin | this app: backend, deploy |
| M2 | Glencia | record columns |
| M3 | Pranjal | defect taxonomy |
| M4 | Angel | |
| M5 | Jones | 40 synthetic records, UI copy |
| M6 | Anushka | slide deck |

## What only you can do (needs your accounts)

1. **Key.** A Groq key (console.groq.com) or an xAI key (console.x.ai) goes in `LLM_API_KEY`;
   the provider is detected from the prefix. No embeddings key: embeddings run locally (below).
2. **Database (Supabase, automatic).** Create an access token at
   supabase.com/dashboard/account/tokens, add `SUPABASE_ACCESS_TOKEN=<token>` to `.env.local`,
   then `npm run supabase:setup`. It creates the project in Mumbai, writes `DATABASE_URL`
   (transaction pooler, port 6543, which Vercel needs) and creates the tables.
   Free projects pause after 7 days idle: open the site before judging day.
3. `cp .env.example .env.local   # run inside this repo`, fill in all three, then:
   ```
   npm install
   npm run smoke      # item 2 locally: PASS llm / PASS embeddings / PASS db
   npm run db:init    # item 3: prints the five table names (re-run after pulling: it's safe)
   ```
4. **Deploy.** Your Vercel CLI token has expired, so run `vercel login` first. Then from this folder:
   ```
   vercel link
   vercel env add LLM_API_KEY production
   vercel env add DATABASE_URL production
   vercel --prod
   npm run smoke -- --url=https://<your-app>.vercel.app   # item 2 on the deployed host
   ```
5. Open the live URL, create one challenge, then check it at `/api/challenges`.

## Evidence Passport demo (phase 1 of APPLICATION_UPDATE.md)

`passport.html` walks one seeded pilot (district-hospital OPD waiting time) from Draft to
Replication-ready in 16 steps, in about ten minutes. **Load demo scenario**, then
**Advance to next stage**; each step belongs to one of seven roles, and the server refuses it
from any other (the role switch is a demo control, not a login: that is phase 2).
**Download Evidence Passport** prints it to PDF. **Reset demo** removes every simulated row.

What is real, not staged: the SHA-256 seal over the baseline and KPI targets (stored in
`challenges.lock_hash`), the validator recomputing it before attesting (change a target after
sealing and validation is refused, on the record), the SHA-256 of every evidence artefact, and
the audit log, which the database keeps append-only and which is hash-chained so an edited or
forged event shows as a broken chain. Dates, names, payments and results are scenario data,
labelled as simulated on the page.

```
npm run db:init                                  # adds audit_events + passport columns
npm run dev                                      # http://localhost:3000/passport.html
TEST_DATABASE_URL=postgresql://... npm test       # use a scratch database
```

## Accounts and real pilots (phase 2)

There is no sign-up page. Real accounts are made from this folder, one per person:
```
npm run user:add -- --email officer@example.gov.in --role department --name "A. Officer" --org "Public Health, Nagpur"
```
Roles: `department admin startup evaluator validator finance public`. It prints a generated
password once. To end someone's access: `update users set active = false where email = '…'`
(their session stops on the next request). Demo roles on the sign-in page need no password and
can only touch the simulated demo; real accounts can't change the demo's steps.

A real pilot moves like this, each step by one role, checked on the server and written to the
audit log with the passport in one transaction:

| Step | Who | Moves to |
|---|---|---|
| Create the challenge (composer: baseline + target; runs the quality gate) | Department Officer | Draft |
| Verify the baseline, confirming the quality report was read | Programme Administrator | Baseline verified |
| Seal the criteria (SHA-256) | Department Officer | Criteria sealed |
| Set the risk envelope and screen every startup profile | Programme Administrator | — |
| Score the shortlist, independently | Expert Evaluators | — |
| Award to a startup that passed screening: scope, data access, 1–8 paid milestones | Programme Administrator | Pilot active |
| Submit evidence files (≤ 3 MB, hashed, never editable) | the awarded Startup only | — |
| Accept or return each milestone | Department Officer | Evidence submitted, once all are accepted |
| Record each payment: paid, or delayed with a reason | Finance / Procurement Officer | — |
| Recompute the seal, then attest met / missed | Independent Validator | Independently validated |
| Compile the procurement route from the passport's facts | Finance / Procurement Officer | Procurement-ready (or a learning record) |
| Approve the route | Department Officer | — |

Deployment, adoption and replication are phase 4.

## Phase 3: what each engine does, and what it doesn't

- **Quality gate.** Rule checks (no unit or definition, no comparison unit, a named solution,
  an implausible duration) always run; the model adds findings from `shared/defect_taxonomy.json`,
  and only spans that really appear in the notice are kept. Findings are advisory, as the
  taxonomy says: nothing is blocked. What is required is a person: the Programme Administrator
  ticks that the report was read when verifying the baseline. The composer's **Check quality**
  shows the same report before saving. If the model is unreachable the rules still stand and the
  report says the model did not run.
- **Matching.** No model and no hidden score. Hard filters (write access, data class,
  availability, a profile at all) are binding, and each failure says what would have changed it.
  DPIIT recognition decides the terms (GFR 173(i)), not eligibility. The rest are ranked on the
  weights in `shared/policy.json`, each component with its reason. Evaluators score
  independently; the award is the administrator's, and only to a startup that passed.
- **Procurement route.** A rules table: Tier 1 needs the deeming GR (off in `policy.json`),
  Tier 2 needs two or more validated winners, Tier 3 needs DPIIT recognition. Every rejected
  route lists the failing condition and the fact that would open it. A missed result compiles to
  a learning record, not a purchase. Not legal advice.
- **Payment SLA.** Accepting a milestone sets its payment due date (`payment_sla_days`, 30, a
  programme choice). The passport shows on track / overdue / paid on time / paid late, and the
  grievance clock once overdue; `ledger.html` publishes the per-department totals.
 Anyone with the passport open
sees other people's actions arrive live (a notification and a redraw).

**Before deploying this:** add `SESSION_SECRET` (32+ random characters, see `.env.example`) to
`.env.local` and to Vercel (`vercel env add SESSION_SECRET production`), and run
`npm run db:init` against Supabase — the health check expects the new tables.

## Embeddings: local, not an API

Records are embedded on the laptop by Ollama's `mxbai-embed-large` (1024 dims,
matching `records.embedding`) and stored in the database. The live site only compares
stored vectors (`/api/similar`), so Vercel never needs an embedding service. When
Jones's (M5) file lands:

```
python3 scripts/check_records.py records.csv
npm run seed -- records.csv      # needs `ollama serve` running and DATABASE_URL set
```

Consequence: the live site can't embed text typed at demo time. If that's needed
later, it's a hosted embedding API plus re-seeding, since vectors from different
models can't be compared.

## Verified locally (26 Sep, against pgvector/pg16 in Docker)

- `db:init` creates all four tables, and running it twice is harmless
- POST without source/method → 422 listing what's missing; non-numeric baseline → 422
- Complete POST → 201, row visible in `challenges` and via GET
- In Chrome: button disabled through every partial state (whitespace doesn't count),
  re-disables when a baseline field is cleared, saves and resets on submit
- `smoke` with no keys fails loudly on llm + embeddings, passes db

Not verified: real LLM/embedding calls (no keys on this machine) and anything on the deployed host.
