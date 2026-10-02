# GovStart Bridge

A working prototype for **Smart India Hackathon 2026, problem statement SIH26136** —
a startup-friendly public procurement mechanism for Maharashtra.

**Live site:** https://leninjacobregi123.github.io/govstart-bridge/

> **This is a student prototype.** It is not an official portal of the Government of
> Maharashtra, the Maharashtra State Innovation Society, or any government department,
> and it is not endorsed by them. Every challenge, startup, listing, report and figure
> shown is simulated. Nothing you type into it is transmitted anywhere.

## What it is

Indian procurement law contains no innovation-procurement instrument — no SBIR Phase III,
no EU-style pre-commercial carve-out, and no ground in the General Financial Rules that
lets a department buy from a firm because that firm won a prior competition.

So this proposes no change to the rules. It is an evidence and contract workflow design built
entirely from instruments that already exist: the startup relaxations in GFR Rules 173(i)
and 170(i), the proprietary route in Rule 166(i) reached the way DAP 2020 reaches it for
iDEX winners, and the GeM Startup Runway catalogue as the replication rail.

## How it is organised

The central product is the **Pilot Evidence Passport**: a portable record of the baseline,
sealed criteria, risk controls, milestones, payment trace and independent validation result.
It is what another department can review before deciding whether to procure or replicate a
solution. The site is written for someone meeting the idea for the first time. The landing page
moves through **the gap → the idea → how it works → proof → enter**, and the navigation
is five groups: *The mechanism*, *Marketplace*, *Evidence & rules*, *Department services*,
*About*.

Every photograph is tied to a place and captioned with it — one landmark per revenue
division, from the Gateway of India in Konkan to Chikhaldara in Amravati.

## Try these

| | |
|---|---|
| [Run a challenge](https://leninjacobregi123.github.io/govstart-bridge/run-a-challenge.html) | Six steps; your choices carry forward between them |
| [Step 1 — seal the criteria](https://leninjacobregi123.github.io/govstart-bridge/step-1-define-the-problem.html) | Press **Seal & publish**, then edit a target and watch the SHA-256 seal break |
| [Step 2 — the risk ladder](https://leninjacobregi123.github.io/govstart-bridge/step-2-cap-the-risk.html) | Push every slider right; the platform refuses the relaxation and says why |
| [Step 6 — buy it lawfully](https://leninjacobregi123.github.io/govstart-bridge/step-6-buy-it-lawfully.html) | Set one winner, same department, no GR — it falls back to Tier 3 rather than inventing a route |
| [Where it runs](https://leninjacobregi123.github.io/govstart-bridge/where-it-runs.html) | All six revenue divisions, one photograph each |

## Feedback welcome

Open an issue, or just tell me. Particularly useful:

- Does the six-step walkthrough make sense without explanation?
- Is anything unreadable — text over a photograph, small type, the Marathi strings?
- Try **High contrast** and **मराठी** in the top bar; both are real, not decoration.
- Anything that looks wrong about the procurement argument itself.

## The working app

The pilot register app (database, APIs, the baseline-gated composer) lives in its own repo,
[sih26136](https://github.com/leninjacobregi123/sih26136); preview at
https://leninjacobregi.me/sih26136/. This repo is the static walkthrough only.

## Structure

```
docs/                41 pages + shared assets/  <- the site (GitHub Pages serves this)
build/               the one-shot migration and its test suites
```

The site is static, runs offline, and makes no network requests. The only outbound
links are the Wikimedia Commons attributions the CC BY-SA licences require.

Photographs from Wikimedia Commons under CC BY-SA; photographers and licences are
credited in each page footer.
