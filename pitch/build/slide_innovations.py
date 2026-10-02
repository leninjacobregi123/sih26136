# -*- coding: utf-8 -*-
"""Build the 'Key innovations and highlights' slide as an editable .pptx.

Every claim on it was checked against the built site before it was written
down. The numbers in the strip along the foot come from the test suites and
the contrast sweep, not from an estimate.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from slide_technical import textbox, INK, MUTED, ACCENT, LINE

OUT = "/home/lenin/Apps Developed/SIH 26136/slide-assets/key-innovations.pptx"

TINTS = [RGBColor(0xE7,0xF0,0xFA), RGBColor(0xE6,0xF4,0xEA), RGBColor(0xFD,0xEC,0xEC),
         RGBColor(0xF3,0xEA,0xF9), RGBColor(0xFD,0xF6,0xE3), RGBColor(0xEA,0xF2,0xF0)]

INNOVATIONS = [
 ("Criteria sealed before any solution is seen",
  [("The success criteria are canonicalised and hashed with ", 0), ("SHA-256", 1),
   (", then published with the challenge. Change one target afterwards and the "
    "seal visibly breaks. Pre-registration, borrowed from clinical trials.", 0)]),
 ("Two contracts, one validation gate",
  [("An ", 0), ("Evidence Contract", 1), (" buys a defined question, a defined test "
    "and a report. A gate. Then a ", 0), ("Deployment Contract", 1),
   (" buys a now-specifiable product — so the department never contracts for a "
    "thing it cannot describe.", 0)]),
 ("Eligibility from capped risk, not turnover",
  [("Five axes — blast radius, data exposure, reversibility, spend, dependency "
    "— set the relaxation envelope. ", 0),
   ("Turnover is only a proxy for delivery risk", 1),
   ("; cap the risk in the contract and the proxy is redundant, which is the "
    "condition ", 0), ("Rule 173(i)", 1), (" attaches.", 0)]),
 ("A route finder that is willing to refuse",
  [("From facts already held it picks Tier 1 (PAC under 166(i)), Tier 2 (limited "
    "tender) or Tier 3 (GeM catalogue). Where no lawful route exists it ", 0),
   ("says so rather than manufacturing one", 1), (".", 0)]),
 ("The validator is named before the result exists",
  [("Appointed at step 1, recomputing the seal at step 5. That single ordering "
    "removes both ", 0), ("criteria drift and validator shopping", 1), (".", 0)]),
 ("No legislative dependency",
  [("No amendment to the General Financial Rules. ", 0),
   ("One state Government Resolution", 1), (" unlocks Tier 1 — and Tiers 2 and 3 "
    "work without even that, so a state can adopt it next quarter.", 0)]),
]

HIGHLIGHTS = [
 "41 working pages; the six-step walkthrough carries your answers across all of them",
 "Runs offline from file:// — no server, no account, zero external requests",
 "SHA-256 written in plain JavaScript, checked against Node’s crypto on five vectors",
 "All six revenue divisions modelled, Gadchiroli and Nandurbar as the hardest cases",
 "GIGW 3.0 chrome: both emblems, 12 statutory policy links, high contrast, Marathi",
 "Grievance desk carrying a seven-day payment-resolution clock",
]

STATS = [("41", "pages"), ("0", "external requests"),
         ("1,201", "text styles measured,\nnone below WCAG AA"),
         ("279", "automated checks\npassing")]


def build():
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    sl = prs.slides.add_slide(prs.slide_layouts[6])

    textbox(sl, 0.30, 0.22, 3.4, 0.3, [("GovStart Bridge  ·  SIH26136", 0)],
            size=12, colour=MUTED)
    textbox(sl, 3.55, 0.16, 9.4, 0.7, [("KEY INNOVATIONS", 0)],
            size=30, align=PP_ALIGN.CENTER, colour=INK)
    ln = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(0.30), Inches(0.82),
                                 Inches(13.03), Inches(0.82))
    ln.line.color.rgb = RGBColor(0xBF, 0xBF, 0xBF); ln.line.width = Pt(1)

    # ---- the six innovations ----------------------------------------
    x, w, y, bh, gap = 0.30, 7.55, 0.98, 0.88, 0.085
    for i, (title, runs) in enumerate(INNOVATIONS):
        card = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y),
                                   Inches(w), Inches(bh))
        card.fill.solid(); card.fill.fore_color.rgb = TINTS[i]
        card.line.fill.background(); card.shadow.inherit = False
        card.text_frame.text = ""
        chip = sl.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.16), Inches(y + 0.20),
                                   Inches(0.34), Inches(0.34))
        chip.fill.solid(); chip.fill.fore_color.rgb = RGBColor(0x1F, 0x3B, 0x63)
        chip.line.fill.background(); chip.shadow.inherit = False
        ctf = chip.text_frame; ctf.vertical_anchor = MSO_ANCHOR.MIDDLE
        cp = ctf.paragraphs[0]; cp.alignment = PP_ALIGN.CENTER
        cr = cp.add_run(); cr.text = str(i + 1)
        cr.font.size = Pt(12); cr.font.bold = True; cr.font.name = "Calibri"
        cr.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        t = textbox(sl, x + 0.62, y + 0.12, w - 0.80, 0.24, [(title, 0)],
                    size=12, colour=INK)
        t.text_frame.paragraphs[0].runs[0].font.bold = True
        textbox(sl, x + 0.62, y + 0.38, w - 0.80, bh - 0.46, runs,
                size=9.2, colour=MUTED, space=1.04)
        y += bh + gap

    # ---- what is actually built --------------------------------------
    rx, rw = 8.05, 4.98
    panel = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(rx), Inches(0.98),
                                Inches(rw), Inches(4.30))
    panel.fill.solid(); panel.fill.fore_color.rgb = RGBColor(0xF5, 0xF7, 0xF9)
    panel.line.color.rgb = RGBColor(0xD6, 0xDC, 0xE2); panel.line.width = Pt(0.75)
    panel.shadow.inherit = False; panel.text_frame.text = ""
    t = textbox(sl, rx + 0.22, 1.12, rw - 0.44, 0.26,
                [("BUILT, AND CHECKABLE TODAY", 0)], size=10, colour=RGBColor(0x1F,0x3B,0x63))
    t.text_frame.paragraphs[0].runs[0].font.bold = True

    hy = 1.48
    for item in HIGHLIGHTS:
        tick = sl.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(rx + 0.22),
                                   Inches(hy + 0.04), Inches(0.14), Inches(0.14))
        tick.fill.solid(); tick.fill.fore_color.rgb = RGBColor(0x1F, 0x3B, 0x63)
        tick.line.fill.background(); tick.shadow.inherit = False
        tick.text_frame.text = ""
        textbox(sl, rx + 0.46, hy, rw - 0.70, 0.60, [(item, 0)],
                size=9.2, colour=MUTED, space=1.06)
        hy += 0.63

    # ---- the numbers -------------------------------------------------
    sy = 5.42
    band = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(rx), Inches(sy),
                               Inches(rw), Inches(1.42))
    band.fill.solid(); band.fill.fore_color.rgb = RGBColor(0xEC, 0xF1, 0xF6)
    band.line.fill.background(); band.shadow.inherit = False; band.text_frame.text = ""
    cw = rw / 2
    for k, (big, small) in enumerate(STATS):
        cx = rx + (k % 2) * cw
        cy = sy + 0.12 + (k // 2) * 0.66
        t = textbox(sl, cx + 0.22, cy, cw - 0.34, 0.28, [(big, 0)],
                    size=17, colour=RGBColor(0x1F, 0x3B, 0x63))
        t.text_frame.paragraphs[0].runs[0].font.bold = True
        textbox(sl, cx + 0.22, cy + 0.27, cw - 0.34, 0.36,
                [(small.replace("\n", " "), 0)], size=8, colour=MUTED, space=0.98)

    # ---- foot band ---------------------------------------------------
    foot = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.30), Inches(6.92),
                               Inches(12.73), Inches(0.42))
    foot.fill.solid(); foot.fill.fore_color.rgb = RGBColor(0x1F, 0x3B, 0x63)
    foot.line.fill.background(); foot.shadow.inherit = False
    tf = foot.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = ("You cannot buy an innovation. You can buy the evidence about it — "
              "and then buy the product, once that evidence has made it specifiable.")
    r.font.name = "Calibri"; r.font.size = Pt(11.5); r.font.bold = True
    r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    build()
