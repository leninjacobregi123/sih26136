# -*- coding: utf-8 -*-
"""Impact & Benefits, laid out to the SIH 2026 template.

The template asks two specific questions, and the fill should answer those
rather than list adjectives:

  left  - potential impact on the TARGET AUDIENCE, so it is organised by
          audience, one concrete change each
  right - benefits, social / economic / environmental

Environmental is the weakest axis for a procurement mechanism and padding it
is worse than being brief. The honest argument is avoided waste: a failed
rollout is hardware installed and then stripped out, and buying the evidence
first is what stops that happening.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from slide_technical import textbox, INK, MUTED, ACCENT

OUT = "/home/lenin/Apps Developed/SIH 26136/slide-assets/impact-benefits-sih.pptx"

TEAL  = RGBColor(0x1F, 0x5A, 0x63)
BLUE  = RGBColor(0x1C, 0x6F, 0xC4)
PEACH = RGBColor(0xFB, 0xE7, 0xDA)
LEAD  = RGBColor(0xE8, 0xF1, 0xFA)

LEAD_RUNS = [
 ("A department can finally buy the thing that fixes a public problem — because it "
  "buys the ", 0), ("evidence first", 1), (", and the product only once that evidence "
  "exists. Spend is capped at the cost of finding out, first-time suppliers compete on "
  "merit, and ", 0), ("no rule is amended", 1), (", so any state can begin this "
  "financial year.", 0)]

AUDIENCE = [
 ("Departments",
  "Can procure a solution to a problem that was previously unbuyable — with spend "
  "capped at the cost of the evidence, not of a rollout that has to be unwound."),
 ("Startups and small firms",
  "A first-time supplier with no turnover history and no prior contract can compete "
  "and win, and is paid at each milestone rather than months afterwards."),
 ("Citizens",
  "Services that were stuck get fixed: OPD waiting time, non-revenue water, grievance "
  "backlogs and last-mile delivery in the districts reached last."),
 ("Auditors and evaluators",
  "Every award is defensible: criteria sealed before any result existed, and an "
  "independent validator named in advance."),
]

BENEFITS = [
 ("Social", RGBColor(0x1B, 0x3A, 0x6B), [
   "Better services in the divisions reached last \u2014 Gadchiroli, Nandurbar",
   "Merit replaces turnover as the filter, so young firms get a fair route in",
   "WCAG AA and bilingual, so the public it serves can actually use it"]),
 ("Economic", RGBColor(0x1F, 0x5A, 0x63), [
   "Public money buys proven outcomes; a failed trial costs evidence, not a rollout",
   "A wider supplier base and local jobs, not repeat awards to incumbents",
   "Faster cash to small firms: milestone payment and a seven-day grievance clock"]),
 ("Environmental", RGBColor(0x22, 0x5A, 0x33), [
   "Fewer failed deployments \u2014 kit installed then stripped out is the real waste",
   "Pilots run on masked data in one taluka \u2014 less travel, no duplicate kit",
   "Paperless end to end — sealed digital criteria, digital evidence, digital audit "
   "trail"]),
]


def bar(sl, x, y, w, h, text):
    b = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y),
                            Inches(w), Inches(h))
    b.fill.solid(); b.fill.fore_color.rgb = TEAL
    b.line.fill.background(); b.shadow.inherit = False
    tf = b.text_frame; tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = text
    r.font.name = "Calibri"; r.font.size = Pt(12); r.font.bold = True
    r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)


def build():
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    sl = prs.slides.add_slide(prs.slide_layouts[6])

    # ---- header -----------------------------------------------------
    badge = sl.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.34), Inches(0.20),
                                Inches(1.78), Inches(0.62))
    badge.fill.background()
    badge.line.color.rgb = RGBColor(0x7A, 0x5E, 0xA8); badge.line.width = Pt(1.5)
    badge.shadow.inherit = False
    tf = badge.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = "G Nexus"
    r.font.name = "Calibri"; r.font.size = Pt(15); r.font.bold = True
    r.font.color.rgb = INK

    textbox(sl, 2.4, 0.16, 8.3, 0.7, [("IMPACT & BENEFITS", 0)],
            size=31, align=PP_ALIGN.CENTER, colour=INK)

    ph = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(10.95), Inches(0.18),
                             Inches(2.08), Inches(0.70))
    ph.fill.background()
    ph.line.color.rgb = RGBColor(0xC0, 0xC0, 0xC0); ph.line.width = Pt(0.75)
    ph.line.dash_style = 4; ph.shadow.inherit = False
    tf = ph.text_frame; tf.word_wrap = True; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = "paste the SIH 2026 logo here"
    r.font.name = "Calibri"; r.font.size = Pt(8); r.font.color.rgb = RGBColor(0x99,0x99,0x99)

    # ---- the claim, two lines ---------------------------------------
    lead = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.34), Inches(0.94),
                               Inches(12.65), Inches(0.72))
    lead.fill.solid(); lead.fill.fore_color.rgb = LEAD
    lead.line.color.rgb = BLUE; lead.line.width = Pt(1)
    lead.shadow.inherit = False; lead.text_frame.text = ""
    textbox(sl, 0.52, 1.04, 12.29, 0.56, LEAD_RUNS, size=11, colour=INK, space=1.14)

    # ---- column headers ---------------------------------------------
    bar(sl, 0.34, 1.78, 6.05, 0.40, "Potential impact on the target audience")
    bar(sl, 6.62, 1.78, 6.37, 0.40,
        "Benefits of the solution — social, economic, environmental")

    # ---- left: by audience ------------------------------------------
    box = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.34), Inches(2.28),
                              Inches(6.05), Inches(3.98))
    box.fill.solid(); box.fill.fore_color.rgb = PEACH
    box.line.color.rgb = RGBColor(0x3A, 0x3A, 0x3A); box.line.width = Pt(1)
    box.shadow.inherit = False; box.text_frame.text = ""
    y = 2.44
    for head, body in AUDIENCE:
        t = textbox(sl, 0.60, y, 5.55, 0.24, [("▸  " + head, 0)],
                    size=12.5, colour=RGBColor(0x8A, 0x3A, 0x0E))
        t.text_frame.paragraphs[0].runs[0].font.bold = True
        textbox(sl, 0.85, y + 0.26, 5.30, 0.62, [(body, 0)],
                size=10, colour=RGBColor(0x33, 0x33, 0x33), space=1.10)
        y += 0.98

    # ---- right: the three axes --------------------------------------
    ty, tw = 2.28, 4.92
    chip_x, chip_w = 11.72, 1.27
    for name, col, points in BENEFITS:
        t = textbox(sl, 6.62, ty, tw, 0.24, [(name, 0)], size=12.5, colour=col)
        t.text_frame.paragraphs[0].runs[0].font.bold = True
        yy = ty + 0.28
        for pt in points:
            textbox(sl, 6.78, yy, tw - 0.16, 0.40, [("•  " + pt, 0)],
                    size=9.6, colour=RGBColor(0x33, 0x33, 0x33), space=1.08)
            yy += 0.36
        chip = sl.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(chip_x),
                                   Inches(ty + 0.04), Inches(chip_w), Inches(1.02))
        chip.fill.solid(); chip.fill.fore_color.rgb = col
        chip.line.fill.background(); chip.shadow.inherit = False
        ctf = chip.text_frame; ctf.word_wrap = True
        ctf.vertical_anchor = MSO_ANCHOR.MIDDLE
        for li, word in enumerate((name.lower(), "impact")):
            cp = ctf.paragraphs[0] if li == 0 else ctf.add_paragraph()
            cp.alignment = PP_ALIGN.CENTER; cp.line_spacing = 0.95
            cr = cp.add_run(); cr.text = word
            cr.font.name = "Calibri"; cr.font.size = Pt(10); cr.font.bold = True
            cr.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        ty += 1.30

    # ---- the band at the foot, used rather than left empty ----------
    band = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.34), Inches(6.42),
                               Inches(12.65), Inches(0.52))
    band.fill.solid(); band.fill.fore_color.rgb = BLUE
    band.line.fill.background(); band.shadow.inherit = False
    tf = band.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = ("Problems that were unprocurable become solvable — this financial "
              "year, without changing a single rule.")
    r.font.name = "Calibri"; r.font.size = Pt(12.5); r.font.bold = True
    r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    textbox(sl, 0.34, 7.02, 12.65, 0.22,
            [("The case for adoption. What exists today is a working prototype of the "
              "mechanism — not measured field results.", 0)],
            size=8, colour=RGBColor(0x8A, 0x8A, 0x8A), align=PP_ALIGN.CENTER)

    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    build()
