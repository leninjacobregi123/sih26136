# GovStart Bridge — pilot register

The working app: static pages and modules (`*.html`, `assets/`) plus plain Node functions (`api/*.js`) on
Vercel, Postgres on Supabase. No framework and no build step. This repo is the one codebase: the app at the
root, and the static pitch walkthrough (formerly `govstart-bridge`) in `pitch/`, which is not uploaded to Vercel.

**Live:** https://sih26136.vercel.app · **Roadmap:** [APPLICATION_UPDATE.md](APPLICATION_UPDATE.md) · tag `final-v1`
is the first submitted implementation.

```
index.html, *.html          thin pages: <head>, an empty #app, one module from assets/js/pages/
assets/css/                 tokens (light + dark, contrast-checked), base, components, layout, print
assets/js/core/             html`` (escaped by default), api client, session, live events, formatting, roles
assets/js/ui/               shell, dialogs/drawers, tabs, fields, toasts, pills, charts, CSV, icons
assets/js/pages/            one module per page; pilot/ holds the passport's tabs and action forms
assets/icons.svg, fonts/    Lucide sprite and Inter, built from dev dependencies by npm run build:assets
vercel.json                 clean URLs, rewrites, redirects from the old pages, security headers, region
api/auth.js, _auth.js       sign in / out; scrypt passwords, HMAC-signed HttpOnly session cookie
api/passports.js            list pilots (with what each waits on), activity feed, one passport, run an action
api/_actions.js             the workflow: who may do what, in which state, with what input; 422s name their field
api/demo.js                 the guided demo: GET it; POST load / reset / advance (demo accounts)
api/_passport.js            seal (SHA-256), hash-chained audit log, the demo's step engine
api/_quality.js             quality gate: rule checks + the model over Pranjal's defect taxonomy
api/_matching.js            hard filters with counterfactuals, then a score on published weights
api/_procurement.js         procurement route compiler (Tier 1/2/3 rules) and payment SLA status
api/programme.js            public aggregates and anonymous rows for the dashboard and ledger
api/challenges.js           create a challenge (or check its quality first)
api/evidence.js, profile.js evidence downloads; a startup's own profile
api/events.js               live audit events for a passport (server-sent events)
api/health.js, similar.js   health check; the 5 nearest stored records by embedding
api/_clock.js               the time actions are recorded at (only the sample seed sets it)
db/schema.sql               all tables, safe to re-run (npm run db:init)
shared/policy.json          programme policy: payment SLA, deeming GR, match weights, adoption threshold
shared/demo/opd-scenario.json the guided demo: 7 roles, 10 states, 16 steps (edit content here)
shared/defect_taxonomy.json Pranjal's 7 defect classes for the quality gate
scripts/dev.mjs             npm run dev — pages and api/ locally, routed by vercel.json like production
scripts/add-user.mjs        npm run user:add — create a real account (prints a generated password)
scripts/seed-programme.mjs  npm run seed:programme — the fictional sample programme (11 pilots)
scripts/*.test.mjs          npm test — 37 API tests; npm run test:ui — 4 UI tests in headless Chrome
scripts/ui/cdp.mjs          the small DevTools-protocol driver the UI tests use
```

## The interface

| URL | What | Who |
|---|---|---|
| `/` | a short landing page, or **My work**: what is waiting on you across every pilot | anyone |
| `/pilots` | every pilot; search, filters and sort kept in the URL | signed in |
| `/pilots/new` | the five-step challenge wizard, with the quality check on Review | Department Officer |
| `/pilots/:id` | the Pilot Evidence Passport: stepper, key facts, eight tabs, the next step, integrity | signed in |
| `/demo` | the guided demo on the same passport | anyone |
| `/programme`, `/programme/payments` | public dashboard and payments ledger, filterable, CSV export | anyone |
| `/sign-in`, `/profile` | sign in or try a demo role; a startup's profile | — |

The old addresses (`passport.html?id=`, `dashboard.html`, `ledger.html`, `login.html`) redirect.

- **Design system.** Tokens in `assets/css/tokens.css`: every text colour pair is WCAG AA in both
  themes and every control border is 3:1 (computed, not eyeballed). Light, dark, or system,
  switched in the account menu; a tiny head script applies it before first paint.
- **Forms.** Every action opens a drawer form. Required fields are checked in the browser; anything
  the server refuses comes back with the field it is about and lands on that input. Seal, award,
  attest, route compile and approval, and replication review end in a confirm step. Evidence is
  hashed in the browser before upload and checked against the server's hash.
- **Live.** An open passport shows other people's actions as they happen and redraws, never under an
  open form.
- **Print.** "Download PDF" prints the whole passport: every tab, in order, compact.
- **Security.** No inline script anywhere, so the CSP allows scripts from this site only; all markup
  goes through the `html` template tag, which escapes data by default; CSV exports neutralise spreadsheet formulas.
- **Accessibility.** Landmarks, skip link, keyboard tabs (arrows, Home/End), drawers that trap focus
  and return it, a combobox search ("/" focuses it), labelled fields with linked errors. The UI tests
  run axe on every page, light and dark, desktop and phone.

```
npm run dev                                   # http://localhost:3000
TEST_DATABASE_URL=postgresql://... npm test   # API tests (scratch database)
TEST_DATABASE_URL=postgresql://... npm run test:ui   # UI tests: needs Google Chrome
npm run build:assets                          # after changing the icon list or upgrading Inter/Lucide
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

`/demo` walks one seeded pilot (district-hospital OPD waiting time) from Draft to
Replication-ready in 16 steps, in about ten minutes. **Load the demo scenario**, then **Advance**;
each step belongs to one of seven roles (**Switch to …** signs in as that role's demo account), and
the server refuses it from any other. **Download PDF** prints the passport. **Clear the demo**
removes every simulated row.

What is real, not staged: the SHA-256 seal over the baseline and KPI targets (stored in
`challenges.lock_hash`), the validator recomputing it before attesting (change a target after
sealing and validation is refused, on the record), the SHA-256 of every evidence artefact, and
the audit log, which the database keeps append-only and which is hash-chained so an edited or
forged event shows as a broken chain. Dates, names, payments and results are scenario data,
labelled as simulated on the page.

```
npm run db:init                                  # adds audit_events + passport columns
npm run dev                                      # http://localhost:3000/demo
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
| Record the deployment once live | Department Officer | Deployed |
| Measure adoption (repeatable): staff trained/active, survey, the KPI again | Department Officer | Adoption measured |
| Review for replication: replicate, hold, or close as a learning record | Programme Administrator | Replication-ready or Learning record |

A pilot can also end as a **Learning record** earlier: when no lawful procurement route is open
(usually because the validator found the criteria missed). The passport's rail stops where it did.

## The sample programme

So the dashboard and pilots list aren't empty on judging day:
```
npm run seed:programme                 # 11 fictional pilots, one at every stage
npm run seed:programme -- --replace    # rebuild it
npm run seed:programme -- --remove     # take it all out again
```
It runs the real actions with the clock set back, so each sample pilot has a genuine seal,
evidence hashes, quality report, screening, route trace and an intact audit chain spread over
months, from a draft with quality findings (Beed) to a replicated OPD pilot (Nagpur), with a
missed result and an unadopted deployment both closing as learning records, one payment paid
late and one overdue today. Every sample pilot is labelled *Sample pilot — fictional* on its
passport, tagged *sample* in lists, and counted as such on the dashboard and ledger. They are
read-only to everyone; demo accounts can read them (and nothing real). Sample accounts have no
password. Removal is the one exception to the append-only audit log and immutable evidence files,
and it only reaches records marked synthetic *and* numbered `SAMPLE-`. It calls the quality
gate's model once per pilot when `LLM_API_KEY` is set; `--no-model` skips that.

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
- **Adoption and replication (phase 4).** Each measurement compares the KPI now with the
  baseline, the validated result and the target, and gets a verdict: *adopted* (weekly use at or
  above `adoption_threshold_pct`, 50%, and the outcome held), *not adopted*, or *outcome not held*.
  Replication can only be recommended on an *adopted* verdict; otherwise hold for another
  measurement or close as a learning record. `dashboard.html` shows the whole programme
  publicly: pilots by state, results against each pilot's own baseline, adoption, routes taken.
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
