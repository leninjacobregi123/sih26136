# GovStart Bridge — slide assets

Drop-in logo files for the SIH26136 deck. Every PNG has a transparent background, so it sits on any slide colour without a white box behind it.

---

## Which file do I use?

### Title slide
| File | Use on |
|---|---|
| `title-slide-block-on-light.png` | white / light slides |
| `title-slide-block-on-dark.png` | navy / dark slides |

One image containing both government emblems, the department line, the GovStart Bridge mark and the wordmark. Place it top-left, sized to about **40–45% of the slide width**. Nothing else needed on that slide except the title.

### Every other slide (footer)
| File | Use on |
|---|---|
| `govt-partner-strip-on-light.png` | light slides |
| `govt-partner-strip-on-dark.png` | dark slides |

Emblems plus "Government of Maharashtra / DSEEI · MSInS" in one strip. Put it bottom-left at about **28–34% of slide width**. Add it to the slide master so it repeats automatically.

### Section dividers / closing slide
| File | Use on |
|---|---|
| `govstart-bridge-lockup-on-light.png` | light slides |
| `govstart-bridge-lockup-on-dark.png` | dark slides |

Mark plus wordmark, no government emblems.

### The mark on its own
| File | Notes |
|---|---|
| `govstart-bridge-icon.svg` | **vector — use this whenever you can.** Scales to any size with no blur. PowerPoint 2016+ and Keynote insert SVG directly; Google Slides does not. |
| `govstart-bridge-icon-1024.png` | raster fallback, large |
| `govstart-bridge-icon-512.png` | raster fallback, normal |
| `govstart-bridge-icon-mono-white.svg` / `.png` | bridge only, no tile — for dark backgrounds |
| `govstart-bridge-icon-mono-navy.svg` / `.png` | bridge only, no tile — for light backgrounds |

### Government emblems on their own
| File | Notes |
|---|---|
| `state-emblem-india.png` | dark line art — **light backgrounds only** |
| `state-emblem-india-white.png` | white — **dark backgrounds only** |
| `gov-maharashtra-seal.png` | gold/orange — works on both |

---

## What the mark means

An arch bridge spanning a gap, with the keystone picked out in teal.

The gap is the one the proposal is about: a department has a problem on one side, a startup has a solution on the other, and no lawful route runs between them. The bridge is the mechanism. The teal keystone is the **validation gate** — the single element that holds the span up, and the point where the Evidence Contract ends and the Deployment Contract begins.

Colours match the prototype site exactly: navy `#0b1f3a` → `#12559b`, keystone `#7fd4c1`.

---

## Two things to check before you submit

**1. Does the SIH template allow logos on the idea-submission slides?**
Some editions of the SIH idea-submission format ask you to keep slides free of identifying branding so evaluation stays anonymous. I have not verified the SIH 2026 rule — **read the official template notes before adding any of this to the submission deck.** If branding is restricted there, keep these assets for the round-2 / demo-day presentation instead, where they help a lot.

**2. Emblem usage.**
Use of the State Emblem of India is governed by the State Emblem of India (Prohibition of Improper Use) Act, 2005. On these slides the emblems identify **who the proposal is addressed to** — they are not a claim of endorsement. Keep a line like this on the title slide or in the footer:

> Proposal prepared for Smart India Hackathon 2026 (SIH26136). Not an official portal of, or endorsed by, the Government of Maharashtra or MSInS.

The prototype site carries the same notice in its footer.

---

## Known limitation — emblem resolution

The two government emblems were rebuilt from the images supplied in chat, which were flattened screenshots with a checkerboard background baked in. I removed the checkerboard, cropped them and cleaned the edge pixels, but the usable source is only about **90 px tall**.

That is fine at the sizes above — in the strips and title block they render at roughly 1:1. **They will go soft if you blow one up to fill half a slide.**

If you want a large emblem anywhere, download an official high-resolution file and drop it in — the layouts will take it without any other change.

The GovStart Bridge mark has no such limit: it is vector, and `govstart-bridge-icon.svg` is sharp at any size.

---

## Rebuilding

Everything here was generated from `govstart-bridge-icon.svg` plus the two cleaned emblem PNGs, composed in HTML and rasterised with headless Chrome at 2× device scale. To change the wordmark or the strip text, edit the HTML and re-render — the type is Inter and EB Garamond, the same faces as the prototype site.

---

## Deck slides

| File | What it is |
|---|---|
| `technical-approach.pptx` | One 16:9 slide — the five technical stages and the four-stage architecture |
| `key-innovations.pptx` | One 16:9 slide — six key innovations, what is built, and the numbers |
| `key-highlights.pptx` | One 16:9 slide — five problems in public procurement today, and the five answers |
| `impact-and-benefits.pptx` | One 16:9 slide — who is better off and how, grouped social / economic / governance |
| `impact-benefits-sih.pptx` | The same content laid out to the **SIH 2026 template** — team badge, two column headers, three impact chips, foot band |
| `govstart-bridge-research-strategy.pptx` | 24-slide research, evidence-base, evidence map, fragmentation/feasibility analysis, gap analysis, architecture, risk register and business strategy deck |

Both are **editable**: every box, arrow and block is a real PowerPoint shape.
A matching `.png` sits beside each if you only need to drop a picture in.
Rebuild with `python3 ../build/slide_technical.py`,
`python3 ../build/slide_innovations.py`, `python3 ../build/slide_highlights.py`
`python3 ../build/slide_impact.py` and `python3 ../build/slide_impact_sih.py`
(all need `python-pptx`).

`impact-benefits-sih.pptx` leaves a dashed placeholder where the SIH 2026 logo
goes — paste yours over it before you present.

Edit the content at the top of those two files rather than in PowerPoint, so
the slides and the site stay in step.

Every number on the innovations slide was checked against the build before it
was written down: 41 pages, zero external requests, 1,201 text styles measured
from rendered pixels with none below WCAG AA, and 279 automated checks. If the
site changes, re-run the suites before you re-use the slide.

## Technical Approach slide

| File | What it is |
|---|---|
| `technical-approach.pptx` | One 16:9 slide, **editable** — every box, arrow and block is a real PowerPoint shape |
| `technical-approach.png` | The same slide as an image, if you only need to drop a picture in |

Rebuild it with `python3 ../build/slide_technical.py` (needs `python-pptx`).
Edit the five left-hand blocks and the four stage rows at the top of that file
rather than in PowerPoint, so the two stay in step.

## Research strategy deck

`govstart-bridge-research-strategy.pptx` is generated by
`python3 ../build/slide_research_strategy.py`. It separates three kinds of
evidence: official mechanisms and policy documents, public GitHub/deployed
prototype claims, and features directly demonstrable in this repository.
Comparison slides include the source URLs and maturity caveats so prototype
claims are not presented as government deployment or measured field impact.

The deck is intentionally longer than a submission pitch. For a short
presentation, use slides 1, 2, 3, 8, 9, 10, 13, 15, 19, 22, 23 and 24. Keep the full
deck as the research appendix for senior review and questions.

**One thing to know before you present it.** The right-hand diagram shows only
what the prototype actually does. Four boxes from the flow diagram — DigiLocker
entity verification, expert-panel scoring, a sanction builder, and Treasury/PFMS
release — are drawn separately, dashed, under *Planned integrations*, because a
judge can open the site and check. If you would rather claim them as built, they
have to be built first.
