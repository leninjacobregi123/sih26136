# -*- coding: utf-8 -*-
"""Build the research, gap-analysis and strategy deck for GovStart Bridge.

This deck deliberately separates:
* official mechanisms and policy evidence;
* public prototype/repository claims; and
* features currently built in this repository.

It is an editable PowerPoint generated with python-pptx. URLs are printed in
small source lines on the relevant slides so a reviewer can verify the claims.
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

OUT = "/home/lenin/Apps Developed/SIH 26136/slide-assets/govstart-bridge-research-strategy.pptx"

NAVY = RGBColor(0x0B, 0x1F, 0x3A)
BLUE = RGBColor(0x1F, 0x3B, 0x63)
TEAL = RGBColor(0x12, 0x75, 0x72)
INK = RGBColor(0x1F, 0x1F, 0x1F)
MUTED = RGBColor(0x52, 0x5A, 0x63)
LINE = RGBColor(0xD5, 0xDB, 0xE1)
PALE = RGBColor(0xF5, 0xF7, 0xF9)
GOOD = RGBColor(0xE8, 0xF3, 0xEC)
WARN = RGBColor(0xFC, 0xF3, 0xDF)
BAD = RGBColor(0xF9, 0xE9, 0xE7)
PURPLE = RGBColor(0xF0, 0xEA, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

SOURCES = {
    "problem": "SIH26136 official problem statement supplied by the team",
    "gfr": "https://doe.gov.in/sites/default/files/GFR2017_0.pdf",
    "startup": "https://www.startupindia.gov.in/content/sih/en/government-schemes/public-procurement.html",
    "gem": "https://gem.gov.in/Startup_Runway",
    "idex": "https://idex.gov.in/how_to_apply",
    "msins": "https://msins.in/MaharashtraStartupMain",
    "oecd": "https://www.oecd.org/en/publications/public-procurement-for-public-sector-innovation_9aad76b7-en.html",
    "sparsh": "https://github.com/LAKSHYAMARODIA01/SPARSH_SIH_2026",
    "mahasetu": "https://github.com/Ushasandhiya/SIH",
    "sihrepo": "https://github.com/Sachinscn/sih26136-startup-procurement",
    "site": "https://leninjacobregi123.github.io/govstart-bridge/",
}


def tx(slide, x, y, w, h, text, size=12, colour=INK, bold=False,
       align=PP_ALIGN.LEFT, font="Aptos", margin=0.02):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(margin)
    tf.margin_top = tf.margin_bottom = Inches(margin)
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = 1.05
    r = p.add_run()
    r.text = text
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = colour
    return shape


def rich(slide, x, y, w, h, runs, size=12, colour=INK, align=PP_ALIGN.LEFT):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.02)
    tf.margin_top = tf.margin_bottom = Inches(0.02)
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = 1.04
    for text, emph, tint in runs:
        r = p.add_run()
        r.text = text
        r.font.name = "Aptos"
        r.font.size = Pt(size)
        r.font.bold = emph
        r.font.color.rgb = tint or colour
    return shape


def box(slide, x, y, w, h, fill=PALE, line=LINE, radius=False):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line
    shape.line.width = Pt(0.7)
    shape.shadow.inherit = False
    shape.text_frame.text = ""
    return shape


def header(slide, title, kicker="GovStart Bridge · SIH26136"):
    tx(slide, 0.35, 0.18, 4.3, 0.25, kicker, 10, MUTED)
    tx(slide, 4.05, 0.12, 8.9, 0.48, title, 24, INK, True, PP_ALIGN.CENTER)
    line = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(0.35), Inches(0.70),
                                      Inches(12.98), Inches(0.70))
    line.line.color.rgb = LINE
    line.line.width = Pt(1)


def footer(slide, source=None, note=None):
    if source:
        tx(slide, 0.38, 7.13, 12.55, 0.18, "Source: " + source, 7.2, MUTED)
    elif note:
        tx(slide, 0.38, 7.13, 12.55, 0.18, note, 7.2, MUTED)


def add_slide(prs, title, source=None, note=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    header(slide, title)
    footer(slide, source, note)
    return slide


def card(slide, x, y, w, h, title, body, fill=PALE, accent=BLUE, body_size=10.6):
    box(slide, x, y, w, h, fill, LINE)
    bar = box(slide, x, y, 0.06, h, accent, accent)
    tx(slide, x + 0.18, y + 0.14, w - 0.34, 0.28, title, 12, INK, True)
    tx(slide, x + 0.18, y + 0.53, w - 0.34, h - 0.68, body, body_size, MUTED)


def bullet_list(slide, x, y, w, items, size=11, gap=0.42, colour=MUTED):
    for i, item in enumerate(items):
        cy = y + i * gap
        tx(slide, x, cy, 0.22, 0.24, "•", size + 2, TEAL, True)
        tx(slide, x + 0.25, cy, w - 0.25, gap - 0.03, item, size, colour)


def build():
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)

    # 1
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    sl.background.fill.solid(); sl.background.fill.fore_color.rgb = NAVY
    tx(sl, 0.65, 0.55, 5.8, 0.3, "GOVSTART BRIDGE · SIH26136", 13, RGBColor(0x9E,0xD9,0xD2), True)
    tx(sl, 0.65, 1.25, 11.5, 1.2,
       "From government problem\nto lawful, reusable proof", 36, WHITE, True)
    tx(sl, 0.68, 2.78, 10.8, 0.72,
       "Research, evidence map, gap analysis and implementation strategy", 18, RGBColor(0xD8,0xE4,0xF0))
    box(sl, 0.68, 4.15, 11.9, 1.18, RGBColor(0x12,0x35,0x58), RGBColor(0x2C,0x62,0x86))
    tx(sl, 0.95, 4.42, 11.35, 0.55,
       "Our thesis: discovery is only the beginning. The missing product is continuity of evidence from baseline → pilot → validation → payment → procurement → adoption.",
       17, WHITE, True)
    tx(sl, 0.68, 6.72, 11.5, 0.28,
       "Prepared 01 October 2026 · Evidence status is labelled throughout · Not an official government portal",
       9, RGBColor(0xB6,0xC9,0xD9))

    # 2
    sl = add_slide(prs, "The decision we are solving")
    card(sl, 0.55, 1.05, 3.85, 4.85, "Government has a real problem",
         "A department knows the outcome it needs — shorter queues, lower leakage, faster service — but may not know which technology can achieve it.\n\nConventional procurement is strongest when the product can already be specified.", BAD, RGBColor(0xA8,0x3A,0x2E))
    card(sl, 4.75, 1.05, 3.85, 4.85, "Startups have unproven capability",
         "A young company may have a credible solution but lack turnover, prior government contracts, long references or cash to finance a slow pilot.\n\nThe filter can exclude the very supplier innovation requires.", WARN, RGBColor(0xB0,0x7B,0x16))
    card(sl, 8.95, 1.05, 3.85, 4.85, "The pilot-to-purchase bridge is weak",
         "Even a successful pilot can end as a report. The next official still needs a defensible record, payment trail, validation and a lawful route to scale.\n\nThat is the gap GovStart Bridge owns.", GOOD, TEAL)
    tx(sl, 0.75, 6.22, 11.9, 0.55, "Problem statement requirement → not a marketplace alone, but an end-to-end, transparent, competitive and legally compliant innovation-procurement pathway.", 16, BLUE, True, PP_ALIGN.CENTER)
    footer(sl, SOURCES["problem"])

    # 3
    sl = add_slide(prs, "Evidence base behind the proposed idea")
    tx(sl, 0.72, 0.96, 11.9, 0.35,
       "The solution was not invented from one example; it was triangulated from policy, operating programmes, research and comparable builds.",
       14.5, NAVY, True, PP_ALIGN.CENTER)
    evidence = [
        ("01 · POLICY AND RULES",
         "GFR Rule 173(i) and Startup India procurement guidance",
         "Confirmed the startup-entry barrier and the possibility of relaxing prior turnover/experience when quality and technical requirements are met.",
         SOURCES["gfr"] + "\n" + SOURCES["startup"], GOOD, TEAL),
        ("02 · GOVERNMENT MECHANISMS",
         "GeM Startup Runway · iDEX · Maharashtra Startup Week",
         "Showed that listing, challenge-led prototyping, milestone funding, trials and government pilots already exist — but in separate rails.",
         SOURCES["gem"] + "\n" + SOURCES["idex"] + "\n" + SOURCES["msins"], PALE, BLUE),
        ("03 · INDEPENDENT RESEARCH",
         "OECD public procurement for public-sector innovation",
         "Validated recurring barriers: administrative complexity, risk aversion, limited information/capacity and difficulty moving from pilot to scale.",
         SOURCES["oecd"], PURPLE, RGBColor(0x7A,0x4E,0x9A)),
        ("04 · COMPARABLE PROJECTS",
         "SPARSH · MahaSetu · SIH26136 procurement repository",
         "Proved that peers are already building AI matching, role-based workflows, pilots, evidence, validation and procurement/scale-up concepts.",
         SOURCES["sparsh"] + "\n" + SOURCES["mahasetu"] + "\n" + SOURCES["sihrepo"], WARN, RGBColor(0xB0,0x7B,0x16)),
    ]
    positions = [(0.72, 1.55), (6.72, 1.55), (0.72, 4.0), (6.72, 4.0)]
    for (label, title, body, source, fill, accent), (x, y) in zip(evidence, positions):
        box(sl, x, y, 5.85, 2.05, fill, LINE)
        box(sl, x, y, 0.07, 2.05, accent, accent)
        tx(sl, x + 0.22, y + 0.17, 5.35, 0.22, label, 9.3, accent, True)
        tx(sl, x + 0.22, y + 0.51, 5.35, 0.34, title, 11.5, INK, True)
        tx(sl, x + 0.22, y + 0.93, 5.35, 0.5, body, 9.6, MUTED)
        tx(sl, x + 0.22, y + 1.52, 5.35, 0.4, source, 6.4, MUTED)
    box(sl, 0.72, 6.38, 11.85, 0.45, NAVY, NAVY)
    tx(sl, 0.93, 6.49, 11.42, 0.2,
       "Evidence conclusion → the rails exist, but a unified, authorised and reusable evidence-to-adoption layer is not established by these sources.",
       10.8, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, "Evidence reviewed 01 October 2026 · Official mechanisms, research and public project claims are labelled separately")

    # 4
    sl = add_slide(prs, "What the official problem statement requires")
    reqs = [
        ("1", "Challenge identification", "Outcome-based government problem statements"),
        ("2", "Discovery + screening", "Startup discovery, eligibility and verification"),
        ("3", "Evaluation", "Expert assessment against declared criteria"),
        ("4", "Pilot design", "Sandbox, data/IP, cyber and risk controls"),
        ("5", "Evidence + payment", "Milestones, performance measurement and timely payment"),
        ("6", "Validation + scale", "Independent validation, lawful procurement and replication"),
    ]
    y = 1.02
    for n, title, body in reqs:
        box(sl, 0.72, y, 0.58, 0.62, BLUE, BLUE, True)
        tx(sl, 0.72, y + 0.13, 0.58, 0.28, n, 15, WHITE, True, PP_ALIGN.CENTER)
        tx(sl, 1.55, y + 0.03, 3.1, 0.25, title, 12.5, INK, True)
        tx(sl, 4.85, y + 0.02, 7.2, 0.35, body, 11.3, MUTED)
        y += 0.85
    box(sl, 0.72, 6.2, 11.75, 0.58, NAVY, NAVY)
    tx(sl, 0.95, 6.35, 11.3, 0.24, "Design consequence: every stage must create a record that the next stage can trust — not merely a screen that looks complete.", 13, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, SOURCES["problem"])

    # 5
    sl = add_slide(prs, "The evidence standard used in this deck")
    cols = [
        ("Official mechanism", "Government page, rule, scheme or policy document.\nCan support what exists as policy/process.", GOOD, TEAL),
        ("Public project claim", "GitHub README or deployed prototype.\nCan support what a project says it implements; not production proof.", WARN, RGBColor(0xB0,0x7B,0x16)),
        ("Our current build", "Directly inspectable in this repository/site.\nCan support what we can demo today.", PURPLE, RGBColor(0x7A,0x4E,0x9A)),
    ]
    x = 0.72
    for title, body, fill, accent in cols:
        card(sl, x, 1.25, 3.85, 2.35, title, body, fill, accent, 12)
        x += 4.2
    tx(sl, 0.78, 4.05, 11.4, 0.35, "Rules for honest comparison", 15, BLUE, True)
    bullet_list(sl, 0.85, 4.55, 11.5, [
        "A public prototype can demonstrate a design direction, but its README cannot prove legal approval, live treasury integration or field impact.",
        "An official scheme proves an operating mechanism exists, but it may not provide a reusable cross-department evidence record.",
        "A gap is credible only when the same missing capability appears across the problem statement and multiple evidence sources.",
    ], 11.5, 0.62)
    footer(sl, "Research synthesis · URLs and maturity labels appear on comparison slides")

    # 5
    sl = add_slide(prs, "Official mechanisms already cover important parts")
    rows = [
        ("GFR Rule 173(i)", "Eligibility", "Prior turnover/experience may be relaxed for startups if quality and technical specifications are met.", "Policy evidence", SOURCES["gfr"]),
        ("GeM Startup Runway", "Trial → procurement", "Startup listings and trial-order pathway; an existing government marketplace rail.", "Official mechanism", SOURCES["gem"]),
        ("iDEX", "Challenge → prototype → trials", "Milestone-linked funding, testing support and a defence procurement pathway.", "Official mechanism", SOURCES["idex"]),
        ("Maharashtra Startup Week", "Selection → paid pilot", "MSInS-led selection and government work-order/pilot opportunity.", "Official mechanism", SOURCES["msins"]),
    ]
    y = 1.0
    for name, stage, claim, maturity, source in rows:
        box(sl, 0.55, y, 2.35, 1.05, PALE, LINE)
        tx(sl, 0.75, y + 0.13, 1.95, 0.25, name, 11.3, BLUE, True)
        tx(sl, 0.75, y + 0.53, 1.95, 0.24, stage, 9.5, TEAL, True)
        box(sl, 3.15, y, 1.6, 1.05, GOOD if maturity == "Official mechanism" else WARN, LINE)
        tx(sl, 3.28, y + 0.34, 1.34, 0.27, maturity, 9, INK, True, PP_ALIGN.CENTER)
        tx(sl, 5.0, y + 0.12, 4.7, 0.68, claim, 10.7, MUTED)
        tx(sl, 9.85, y + 0.14, 2.8, 0.65, source, 7.7, MUTED)
        y += 1.35
    tx(sl, 0.75, 6.48, 11.7, 0.35, "Conclusion: the baseline is not “nobody has a pathway.” The baseline is that pathways are fragmented, sector-specific or stop before reusable evidence and adoption.", 13.5, BLUE, True, PP_ALIGN.CENTER)
    footer(sl, "Official sources: GFR 2017 · GeM Startup Runway · iDEX · MSInS")

    # 6
    sl = add_slide(prs, "Public comparable projects: what their repositories claim")
    projects = [
        ("SPARSH", "LAKSHYAMARODIA01/SPARSH_SIH_2026", "5-stage path: challenge, AI match, jury, milestone escrow pilot, validation and GeM scale-up.\nNext.js + Supabase + Groq described.", SOURCES["sparsh"]),
        ("MahaSetu", "Ushasandhiya/SIH", "10-stage decision-support lifecycle, FastAPI + SQLite foundation, JWT/RBAC roles, demo seed and evidence upload roadmap.", SOURCES["mahasetu"]),
        ("SIH26136 procurement", "Sachinscn/sih26136-startup-procurement", "Government requirement → verification → AI matching → pilot → evaluation → procurement → scale-up; README says MVP in development.", SOURCES["sihrepo"]),
    ]
    y = 1.0
    for name, repo, body, source in projects:
        box(sl, 0.68, y, 2.15, 1.3, NAVY, NAVY)
        tx(sl, 0.87, y + 0.24, 1.78, 0.28, name, 15, WHITE, True)
        tx(sl, 0.87, y + 0.68, 1.78, 0.32, "Public project", 9, RGBColor(0xB6,0xD4,0xE6))
        box(sl, 3.08, y, 6.65, 1.3, PALE, LINE)
        tx(sl, 3.3, y + 0.12, 6.2, 0.24, repo, 10.5, BLUE, True)
        tx(sl, 3.3, y + 0.47, 6.15, 0.63, body, 10.1, MUTED)
        tx(sl, 10.0, y + 0.16, 2.55, 0.85, source, 7.7, MUTED)
        y += 1.62
    box(sl, 0.68, 5.95, 11.87, 0.7, WARN, RGBColor(0xE5,0xC9,0x8C))
    tx(sl, 0.92, 6.12, 11.35, 0.32, "Maturity caveat: public repositories prove published architecture and claimed scope. They do not, by themselves, prove government adoption, lawful approval, live payment rails or measured outcomes.", 11.2, INK, True, PP_ALIGN.CENTER)
    footer(sl, "Public GitHub README review · accessed 01 October 2026")

    # 7
    sl = add_slide(prs, "Stage-by-stage evidence map")
    stages = ["Problem", "Screen", "Evaluate", "Pilot", "Evidence", "Validate", "Procure", "Adopt / reuse"]
    sources = [
        ("GeM",       [0,0,0,1,1,0,1,0]),
        ("iDEX",      [1,1,1,1,1,1,1,0]),
        ("MSInS",     [1,1,1,1,0,0,0,0]),
        ("SPARSH",    [1,1,1,1,1,1,1,0]),
        ("MahaSetu",  [1,1,1,1,1,1,1,0]),
        ("Our current", [1,1,0,1,1,1,1,0]),
    ]
    x0, y0 = 2.55, 1.15
    cw = 1.22
    for i, stage in enumerate(stages):
        tx(sl, x0 + i*cw, 0.86, cw - 0.06, 0.28, stage, 8.5, BLUE, True, PP_ALIGN.CENTER)
    y = y0
    for name, vals in sources:
        tx(sl, 0.55, y + 0.13, 1.8, 0.25, name, 10.5, INK, True)
        for i, val in enumerate(vals):
            fill = GOOD if val else BAD
            box(sl, x0 + i*cw, y, cw - 0.12, 0.52, fill, LINE)
            tx(sl, x0 + i*cw, y + 0.13, cw - 0.12, 0.22, "✓" if val else "—", 14, TEAL if val else RGBColor(0xA8,0x3A,0x2E), True, PP_ALIGN.CENTER)
        y += 0.75
    tx(sl, 0.72, 6.1, 11.85, 0.48, "The common blank is not challenge discovery. It is durable post-pilot continuity: adoption outcomes, cross-department reuse, evidence portability and a transparent payment-to-procurement chain.", 14, NAVY, True, PP_ALIGN.CENTER)
    footer(sl, "Coverage is a qualitative synthesis of cited official pages, public READMEs and this repository; ✓ means the source claims or demonstrates the stage, not production proof.")

    # 8
    sl = add_slide(prs, "The real market gap: fragmented rails, not zero solutions")
    tx(sl, 0.72, 0.98, 11.9, 0.4,
       "A department may have to move between mechanisms, spreadsheets and approvals to complete one innovation journey.",
       16.5, NAVY, True, PP_ALIGN.CENTER)
    rails = [
        ("Demand", "Department problem\nand baseline", "Department / programme intake"),
        ("Discovery", "Startup India / MSInS\nGeM listing", "Registry and marketplace"),
        ("Pilot", "iDEX / Startup Week\nlocal pilot files", "Programme-specific workflow"),
        ("Proof", "Reports, validator\nand payment records", "Often separate artefacts"),
        ("Scale", "GeM / tender / route\nand adoption", "Procurement system"),
    ]
    x = 0.55
    for i, (title, body, owner) in enumerate(rails):
        box(sl, x, 2.0, 2.25, 1.65, PALE if i != 3 else WARN, LINE, True)
        tx(sl, x + 0.12, 2.22, 2.01, 0.25, title, 12, BLUE, True, PP_ALIGN.CENTER)
        tx(sl, x + 0.14, 2.62, 1.97, 0.48, body, 10.1, INK, True, PP_ALIGN.CENTER)
        tx(sl, x + 0.14, 3.25, 1.97, 0.24, owner, 8.5, MUTED, False, PP_ALIGN.CENTER)
        if i < len(rails)-1:
            ar = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x+2.28), Inches(2.82), Inches(x+2.48), Inches(2.82))
            ar.line.color.rgb = TEAL; ar.line.width = Pt(1.25)
        x += 2.52
    box(sl, 0.75, 4.45, 5.8, 1.4, BAD, LINE)
    tx(sl, 1.0, 4.7, 5.3, 0.25, "What the evidence does prove", 12, RGBColor(0xA8,0x3A,0x2E), True)
    tx(sl, 1.0, 5.08, 5.25, 0.55, "Each rail solves a legitimate part of the problem. Some public prototypes claim to connect many rails.", 10.8, MUTED)
    box(sl, 6.8, 4.45, 5.8, 1.4, GOOD, LINE)
    tx(sl, 7.05, 4.7, 5.3, 0.25, "What the evidence does not prove", 12, TEAL, True)
    tx(sl, 7.05, 5.08, 5.25, 0.55, "It does not prove one authorised, production, cross-department Maharashtra platform with a portable evidence and adoption record.", 10.8, MUTED)
    box(sl, 0.75, 6.2, 11.8, 0.52, NAVY, NAVY)
    tx(sl, 0.95, 6.34, 11.4, 0.22, "Opportunity: unify the journey without replacing GeM, GFR, validators or departmental authority.", 12.5, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, "Research synthesis: official mechanisms are complementary; public prototypes describe broader unification but do not establish government production deployment")

    # 9
    sl = add_slide(prs, "Would one unified platform make a real difference?")
    tx(sl, 0.72, 0.98, 11.9, 0.35,
       "Yes — if “unified” means one governed case record and handoff layer, not one system that illegally replaces every official system.",
       15.5, NAVY, True, PP_ALIGN.CENTER)
    tests = [
        ("Operational value", "One case ID, one timeline and one passport reduce repeated data entry and missing handoffs.", GOOD, "High"),
        ("Evidence value", "Baseline, artefacts, validator decision, payment state and adoption outcome travel together.", GOOD, "High"),
        ("Legal value", "The platform guides and records decisions; authorised officials and existing procurement rails retain authority.", GOOD, "High"),
        ("Integration value", "Adapters can connect approved registries, GeM and finance later without making them prerequisites for the demo.", WARN, "Medium"),
        ("Market value", "A programme office can reuse the same evidence object across departments and districts.", GOOD, "Potentially high"),
    ]
    y = 1.55
    for title, body, fill, score in tests:
        box(sl, 0.75, y, 2.45, 0.67, fill, LINE)
        tx(sl, 0.95, y + 0.2, 2.05, 0.22, title, 10.8, BLUE, True)
        box(sl, 3.45, y, 7.2, 0.67, PALE, LINE)
        tx(sl, 3.7, y + 0.15, 6.7, 0.34, body, 10.4, MUTED)
        box(sl, 10.95, y, 1.55, 0.67, NAVY, NAVY, True)
        tx(sl, 11.05, y + 0.2, 1.35, 0.22, score, 10.2, WHITE, True, PP_ALIGN.CENTER)
        y += 0.86
    box(sl, 0.75, 6.12, 11.75, 0.62, PURPLE, LINE)
    tx(sl, 0.98, 6.29, 11.25, 0.28, "Feasibility verdict: strong as a phased decision-support and evidence layer; not feasible or desirable as an immediate replacement for GeM, treasury or statutory approvals.", 11.6, INK, True, PP_ALIGN.CENTER)
    footer(sl, "Feasibility assessment based on the official problem scope, cited mechanisms and current prototype maturity")

    # 8
    sl = add_slide(prs, "SPARSH breakdown: strong overlap, visible opening")
    card(sl, 0.62, 1.05, 4.0, 4.95, "What SPARSH claims to solve",
         "• AI matchmaking\n• Jury-led evaluation\n• GFR startup relaxation\n• Milestone escrow / RTGS payout\n• Independent validation\n• Immutable audit trail\n• GeM scale-up export\n\nThis is already close to the generic “end-to-end platform” pitch.", GOOD, TEAL, 11.2)
    card(sl, 4.86, 1.05, 3.75, 4.95, "What it makes visible",
         "• Challenge dossier\n• Pilot progress\n• Evidence upload\n• Validator decision\n• Procurement scale-up\n\nThe evidence story is present, so “we also have milestones and validation” is not a differentiator.", WARN, RGBColor(0xB0,0x7B,0x16), 11.2)
    card(sl, 8.84, 1.05, 3.85, 4.95, "Where our wedge must be sharper",
         "• A portable passport another department can reuse\n• Adoption measurement after deployment\n• Route alternatives and rejected-route reasons\n• Payment/evidence SLA ledger\n• Failure as a reusable learning record\n\nThese must be implemented, not merely renamed.", PURPLE, RGBColor(0x7A,0x4E,0x9A), 11.2)
    footer(sl, SOURCES["sparsh"])

    # 11
    sl = add_slide(prs, "MahaSetu and the peer baseline")
    left = [
        "MahaSetu explicitly positions itself as decision support, not an autonomous contract-awarding system.",
        "Its README describes role-based access, demo personas, a 10-stage lifecycle and a FastAPI/SQLite foundation.",
        "The SIH26136 procurement repository describes the same broad chain: requirement → verified startup → AI match → pilot → evaluation → procurement → scale-up.",
    ]
    right = [
        "The broad workflow is now an expected baseline among peer solutions.",
        "The differentiator cannot be “we have roles,” “we have AI matching” or “we have a pilot dashboard.”",
        "Our claim must be narrower: we own the reusable evidence object and the post-deployment decision loop.",
    ]
    box(sl, 0.62, 1.04, 5.9, 4.95, PALE, LINE)
    tx(sl, 0.9, 1.3, 5.25, 0.3, "WHAT PEERS MAKE BASELINE", 12, BLUE, True)
    bullet_list(sl, 0.92, 1.82, 5.25, left, 11.2, 1.06)
    box(sl, 6.82, 1.04, 5.9, 4.95, GOOD, LINE)
    tx(sl, 7.1, 1.3, 5.25, 0.3, "WHAT WE MUST OWN", 12, TEAL, True)
    bullet_list(sl, 7.12, 1.82, 5.25, right, 11.2, 1.06)
    box(sl, 0.62, 6.22, 12.1, 0.52, NAVY, NAVY)
    tx(sl, 0.83, 6.36, 11.65, 0.22, "Safe positioning: “AI-assisted, rule-constrained and human-approved — with a portable evidence record for lawful reuse.”", 12.5, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, SOURCES["mahasetu"] + " · " + SOURCES["sihrepo"])

    # 12
    sl = add_slide(prs, "The common gaps across the evidence")
    gaps = [
        ("G1", "No durable baseline-to-outcome chain", "The record often ends at pilot success or procurement recommendation; post-deployment persistence is not central."),
        ("G2", "Evidence is not portable", "A second department cannot reliably consume the same tested conditions, artefacts, exceptions and validator attestation."),
        ("G3", "Payment is not linked to evidence SLAs", "Milestone state, packet completeness, expected date, delay reason and grievance clock are rarely one visible ledger."),
        ("G4", "Route decisions are opaque", "The system may recommend scale-up, but does not always show the facts, alternatives, rejected routes and required human approvals."),
        ("G5", "Failure is discarded", "A failed pilot should become a bounded learning record; otherwise government repeats the same uncertainty."),
        ("G6", "Live data is overclaimed", "Public demos may show integrations or escrow language without authorised production connectors."),
    ]
    y = 1.0
    for code, title, body in gaps:
        box(sl, 0.7, y, 0.7, 0.62, NAVY, NAVY, True)
        tx(sl, 0.7, y + 0.16, 0.7, 0.22, code, 10.5, WHITE, True, PP_ALIGN.CENTER)
        tx(sl, 1.65, y + 0.02, 3.7, 0.26, title, 11.5, INK, True)
        tx(sl, 5.55, y + 0.02, 6.65, 0.4, body, 10.2, MUTED)
        y += 0.87
    footer(sl, "Synthesis of the official problem statement, cited mechanisms and public project READMEs")

    # 13
    sl = add_slide(prs, "What our current application already proves")
    current = [
        ("1", "Sealed challenge criteria", "Outcome/KPI authoring with SHA-256 tamper detection"),
        ("2", "Risk-proportionate access", "Five-axis risk ladder and explainable eligibility behavior"),
        ("3", "Controlled pilot logic", "Sandbox, milestones, data/IP/cyber controls in the walkthrough"),
        ("4", "Validation gate", "Independent validation and failure as a valid outcome"),
        ("5", "Lawful routing", "Tier 1 / Tier 2 / Tier 3 route behavior with refusal when facts do not fit"),
        ("6", "Evidence Passport foundation", "Baseline, startup, validator, payment trace, adoption and reuse status card"),
    ]
    y = 1.02
    for n, title, body in current:
        box(sl, 0.75, y, 0.58, 0.58, TEAL, TEAL, True)
        tx(sl, 0.75, y + 0.15, 0.58, 0.22, n, 13, WHITE, True, PP_ALIGN.CENTER)
        tx(sl, 1.58, y + 0.04, 3.35, 0.24, title, 11.8, INK, True)
        tx(sl, 5.15, y + 0.04, 7.15, 0.34, body, 10.5, MUTED)
        y += 0.79
    box(sl, 0.75, 6.12, 11.55, 0.62, WARN, RGBColor(0xE5,0xC9,0x8C))
    tx(sl, 0.96, 6.28, 11.15, 0.27, "Current status: working static/offline prototype. Not yet a production backend, live government integration, treasury connector or field-impact measurement system.", 11.2, INK, True, PP_ALIGN.CENTER)
    footer(sl, SOURCES["site"] + " · repository inspection")

    # 14
    sl = add_slide(prs, "Our focus: make the Evidence Passport the system of record")
    tx(sl, 0.72, 1.02, 12.0, 0.42, "One object carries trust across the lifecycle", 19, NAVY, True, PP_ALIGN.CENTER)
    labels = ["Baseline", "KPI seal", "Risk", "Startup", "Pilot", "Evidence", "Validator", "Payment", "Route", "Adoption", "Reuse"]
    x = 0.62
    for i, label in enumerate(labels):
        fill = GOOD if i < 8 else PURPLE
        box(sl, x, 2.0, 1.05, 0.62, fill, LINE, True)
        tx(sl, x + 0.02, 2.18, 1.01, 0.22, label, 8.4, BLUE if i < 8 else RGBColor(0x7A,0x4E,0x9A), True, PP_ALIGN.CENTER)
        if i < len(labels)-1:
            ar = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x+1.07), Inches(2.31), Inches(x+1.20), Inches(2.31))
            ar.line.color.rgb = TEAL; ar.line.width = Pt(1.25)
        x += 1.15
    cards = [
        ("Portable", "Another department can review the same conditions, artefacts, exceptions and validator decision."),
        ("Auditable", "Every transition has actor, timestamp, evidence reference and approval state."),
        ("Honest", "A failed pilot becomes a learning record, not a false success story."),
    ]
    x = 0.85
    for title, body in cards:
        card(sl, x, 3.35, 3.75, 2.0, title, body, PALE, TEAL, 11)
        x += 4.05
    box(sl, 0.85, 5.86, 11.4, 0.64, NAVY, NAVY)
    tx(sl, 1.06, 6.04, 10.95, 0.26, "This is the defensible product boundary: not “we match startups,” but “we preserve evidence that makes lawful reuse possible.”", 13, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, "Product strategy derived from the gap analysis; passport foundation is present in the current prototype")

    # 15
    sl = add_slide(prs, "Target logical flow: a live, human-governed operating model")
    flow = [
        ("Department", "Submit problem + baseline"),
        ("Quality gate", "Check KPI, risk, data and route"),
        ("Marketplace", "Eligibility + explainable ranking"),
        ("Pilot", "Evidence contract + milestones"),
        ("Validator", "Independent attestation"),
        ("Route compiler", "Facts → routes → human approval"),
        ("Deployment", "Outcome + adoption measurement"),
        ("Reuse", "Passport for next department"),
    ]
    x = 0.45
    for i, (title, body) in enumerate(flow):
        box(sl, x, 2.05, 1.38, 1.3, GOOD if i in (4,6,7) else PALE, LINE, True)
        tx(sl, x + 0.08, 2.22, 1.22, 0.25, title, 10.2, BLUE, True, PP_ALIGN.CENTER)
        tx(sl, x + 0.08, 2.65, 1.22, 0.45, body, 8.3, MUTED, False, PP_ALIGN.CENTER)
        if i < len(flow)-1:
            ar = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x+1.40), Inches(2.70), Inches(x+1.55), Inches(2.70))
            ar.line.color.rgb = TEAL; ar.line.width = Pt(1.25)
        x += 1.61
    tx(sl, 0.68, 1.13, 11.9, 0.42, "Real-time means shared state, notifications and approvals — not autonomous procurement.", 17, NAVY, True, PP_ALIGN.CENTER)
    box(sl, 0.72, 4.18, 3.75, 1.5, WARN, LINE)
    tx(sl, 0.95, 4.43, 3.3, 0.25, "Human decisions", 12, INK, True)
    tx(sl, 0.95, 4.82, 3.2, 0.58, "Publish challenge · select startup · accept evidence · validate · approve route", 10.7, MUTED)
    box(sl, 4.8, 4.18, 3.75, 1.5, GOOD, LINE)
    tx(sl, 5.03, 4.43, 3.3, 0.25, "Automation assists", 12, INK, True)
    tx(sl, 5.03, 4.82, 3.2, 0.58, "Quality checks · retrieval · ranking · reminders · hashes · packet completeness", 10.7, MUTED)
    box(sl, 8.88, 4.18, 3.75, 1.5, PURPLE, LINE)
    tx(sl, 9.11, 4.43, 3.3, 0.25, "Public transparency", 12, INK, True)
    tx(sl, 9.11, 4.82, 3.2, 0.58, "Aggregate outcomes · route rationale · payment SLA · reuse status", 10.7, MUTED)
    footer(sl, "Target design; human approval is mandatory for consequential decisions")

    # 16
    sl = add_slide(prs, "Architecture: modules, records and controlled integrations")
    layers = [
        ("Users", "Department · startup · evaluator · validator · procurement · public viewer", PALE),
        ("Application", "Challenge studio · eligibility · matching · pilot ledger · Evidence Passport · route compiler · adoption", GOOD),
        ("Trust layer", "RBAC · append-only audit · hashes · evidence chain of custody · approval gates", PURPLE),
        ("Data", "PostgreSQL · object storage · event log · anonymised public aggregates", WARN),
        ("Integrations later", "Startup registry · identity · GeM · treasury/PFMS — only through authorised interfaces", BAD),
    ]
    y = 0.98
    for title, body, fill in layers:
        box(sl, 0.75, y, 11.8, 0.78, fill, LINE)
        tx(sl, 1.0, y + 0.15, 2.15, 0.25, title, 12, BLUE, True)
        tx(sl, 3.35, y + 0.15, 8.85, 0.3, body, 10.6, MUTED)
        y += 0.93
    tx(sl, 0.82, 5.86, 11.7, 0.3, "First build: one tenant, one scenario, one complete evidence chain. Integrate only after the workflow is reliable.", 14, NAVY, True, PP_ALIGN.CENTER)
    box(sl, 1.6, 6.28, 10.1, 0.45, NAVY, NAVY)
    tx(sl, 1.8, 6.39, 9.7, 0.2, "Browser → API → state machine → evidence store → audit events → notifications", 11.2, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, "Target architecture; current repository remains a static prototype")

    # 17
    sl = add_slide(prs, "Data strategy: mock, hybrid or live?")
    options = [
        ("A · Coherent mock", "Best for hackathon demo", "Seed one OPD hospital scenario end to end. Fast, deterministic and safe. Label every record simulated.", GOOD, "Use now"),
        ("B · Hybrid sandbox", "Best next MVP", "Real backend, roles, uploads, events and audit log; synthetic data and approved CSV import; no unauthorised government connectors.", WARN, "Recommended"),
        ("C · Live production", "Only after approvals", "Authorised identity, registry, GeM and treasury interfaces; legal review, security controls, data-sharing agreements and operations team.", BAD, "Later"),
    ]
    x = 0.62
    for title, sub, body, fill, status in options:
        card(sl, x, 1.18, 3.95, 4.55, title, sub + "\n\n" + body + "\n\nDecision: " + status, fill, TEAL if status == "Recommended" else BLUE, 11)
        x += 4.2
    box(sl, 0.75, 6.12, 11.8, 0.58, NAVY, NAVY)
    tx(sl, 0.98, 6.28, 11.35, 0.25, "Recommendation: present the coherent mock now; build the hybrid sandbox next; never claim live integration until it is authorised and testable.", 12.6, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, "Implementation recommendation; no live government data is required to demonstrate the mechanism")

    # 18
    sl = add_slide(prs, "One demo scenario that proves the whole chain")
    tx(sl, 0.72, 1.0, 11.9, 0.35, "District hospital OPD waiting-time reduction", 21, NAVY, True, PP_ALIGN.CENTER)
    scenario = [
        ("Need", "Baseline: median wait 180 min\nTarget: ≤90 min"),
        ("Candidates", "6 startups\n2 fail hard eligibility\n4 explainable matches"),
        ("Pilot", "4 milestones\nmasked data\nmilestone evidence"),
        ("Validation", "Independent validator\npass / conditional / fail"),
        ("Scale", "Route rationale\npayment trace\nadoption at 30/90 days"),
    ]
    x = 0.55
    for i, (title, body) in enumerate(scenario):
        box(sl, x, 2.05, 2.35, 2.2, GOOD if i in (3,4) else PALE, LINE, True)
        tx(sl, x + 0.15, 2.32, 2.05, 0.25, title, 12, BLUE, True, PP_ALIGN.CENTER)
        tx(sl, x + 0.18, 2.82, 1.99, 0.82, body, 11, MUTED, False, PP_ALIGN.CENTER)
        if i < len(scenario)-1:
            ar = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x+2.38), Inches(3.14), Inches(x+2.57), Inches(3.14))
            ar.line.color.rgb = TEAL; ar.line.width = Pt(1.25)
        x += 2.57
    tx(sl, 0.82, 4.78, 11.6, 0.28, "Demo controls", 13, BLUE, True)
    bullet_list(sl, 0.9, 5.2, 11.5, [
        "Load demo · reset · switch role · advance stage · view audit timeline · print/download passport",
        "Every record carries “Simulated demonstration data — not an official government record.”",
    ], 11.3, 0.55)
    footer(sl, "Recommended seeded scenario from APPLICATION_UPDATE.md")

    # 19
    sl = add_slide(prs, "Failure modes: what can go wrong and how we respond")
    failures = [
        ("Legal overreach", "AI appears to award or give legal advice", "Rules engine only recommends; named official approves; show route inputs and rejected alternatives."),
        ("Criteria drift", "KPI changes after the winner is visible", "Seal canonical criteria; validator recomputes hash; immutable audit event."),
        ("Garbage matching", "Similar words produce unsafe shortlist", "Hard filters first; risk/data compatibility; explainable factors; human panel."),
        ("Evidence gaming", "Cherry-picked or unverifiable artefacts", "Pre-register method; timestamps/hashes; independent validator; exception log."),
        ("Payment delay", "Startup submits proof but money stalls", "Evidence-to-payment SLA ledger; packet completeness; escalation and grievance clock."),
        ("Adoption failure", "Pilot passes but staff/citizens do not use it", "30/90-day adoption metrics; classify as learning record; no automatic replication."),
        ("Data breach", "Sensitive department or citizen data exposed", "Synthetic/masked default; least privilege; retention rules; security review; incident plan."),
        ("Integration fiction", "Demo implies GeM/PFMS/DigiLocker is live", "Mark planned; use adapters and sandbox fixtures until authorised connector exists."),
    ]
    y = 0.97
    for failure, symptom, response in failures:
        tx(sl, 0.62, y + 0.04, 2.0, 0.25, failure, 10.6, RGBColor(0xA8,0x3A,0x2E), True)
        tx(sl, 2.75, y + 0.04, 3.1, 0.26, symptom, 9.7, INK, True)
        tx(sl, 5.98, y + 0.04, 6.48, 0.32, response, 9.4, MUTED)
        line = sl.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(0.62), Inches(y+0.43), Inches(12.45), Inches(y+0.43))
        line.line.color.rgb = LINE; line.line.width = Pt(0.5)
        y += 0.72
    footer(sl, "Risk register for the proposed platform; legal and security review remain required before production")

    # 20
    sl = add_slide(prs, "Business case: value before revenue")
    tx(sl, 0.72, 0.98, 11.85, 0.35, "Do not present invented ROI as measured impact. Present a transparent value model.", 17, NAVY, True, PP_ALIGN.CENTER)
    vals = [
        ("Government", "Avoids full rollout before proof; reduces duplicate pilots; gets a defensible audit packet; shortens startup discovery and evidence review."),
        ("Startups", "Lower entry barrier; milestone-linked cash flow; clearer demand; reusable validated evidence; fewer dead-end pilots."),
        ("Citizens", "Faster access to service improvements; better outcomes can be measured after deployment instead of assumed."),
        ("GovStart Bridge", "Potential model: implementation subscription / managed programme fee / evidence-pack export fee — subject to public procurement and conflict-of-interest review."),
    ]
    x = 0.62
    for title, body in vals:
        card(sl, x, 1.62, 2.95, 3.45, title, body, PALE if title != "GovStart Bridge" else PURPLE, TEAL if title != "GovStart Bridge" else RGBColor(0x7A,0x4E,0x9A), 10.4)
        x += 3.17
    box(sl, 0.75, 5.5, 11.75, 1.0, WARN, LINE)
    tx(sl, 1.0, 5.73, 11.25, 0.55, "Measurement plan: baseline outcome · pilot cost · time to decision · payment cycle time · adoption rate · replication count · avoided repeat discovery. These become the numbers after a live pilot, not before.", 12.2, INK, True, PP_ALIGN.CENTER)
    footer(sl, "Value model; no field savings or revenue are claimed in this deck")

    # 21
    sl = add_slide(prs, "Success metrics and rollout plan")
    phases = [
        ("0 · Demo", "Complete seeded scenario\nPassport export\n3 proof screens", "Pass: judge can run flow in <10 min"),
        ("1 · Sandbox MVP", "Auth/RBAC\nPostgreSQL + object store\nAudit events + notifications", "Pass: role-safe end-to-end test"),
        ("2 · Evidence layer", "Quality gate\nroute trace\npayment/SLA ledger\nadoption records", "Pass: passport reused by second mock department"),
        ("3 · Controlled pilot", "One authorised department\nsynthetic or approved data\nnamed validator", "Pass: measured outcome + payment cycle"),
        ("4 · Scale", "Authorised integrations\npublic aggregates\nreplication playbook", "Pass: independent review and adoption evidence"),
    ]
    x = 0.45
    for title, body, gate in phases:
        box(sl, x, 1.2, 2.35, 4.5, GOOD if title.startswith(("0","1","2")) else PALE, LINE, True)
        tx(sl, x + 0.14, 1.42, 2.07, 0.3, title, 11.5, BLUE, True, PP_ALIGN.CENTER)
        tx(sl, x + 0.16, 1.98, 2.03, 1.55, body, 10.2, MUTED, False, PP_ALIGN.CENTER)
        box(sl, x + 0.16, 4.42, 2.03, 0.78, NAVY, NAVY)
        tx(sl, x + 0.25, 4.58, 1.85, 0.4, gate, 8.7, WHITE, True, PP_ALIGN.CENTER)
        x += 2.55
    tx(sl, 0.74, 6.15, 11.85, 0.38, "The adoption proof is not “we built a dashboard.” It is “a department can make a better, safer decision because the record survives every stage.”", 14, NAVY, True, PP_ALIGN.CENTER)
    footer(sl, "Recommended phased plan")

    # 22
    sl = add_slide(prs, "How the proposed solution closes the mapped gaps")
    rows = [
        ("G1 · Baseline-to-outcome chain", "Passport links baseline, sealed KPI, validation and 30/90-day adoption outcome."),
        ("G2 · Evidence portability", "Exportable passport with artefact hashes, conditions, exceptions, validator and reuse status."),
        ("G3 · Payment transparency", "Milestone evidence → acceptance → packet complete → sanctioned → paid → delayed/disputed."),
        ("G4 · Route explainability", "Facts → eligible routes → rejected routes → human approvals → generated packet."),
        ("G5 · Failure learning", "Failed pilots remain searchable learning records with bounded cost and next-step recommendation."),
        ("G6 · Honest live-data posture", "Mock now, hybrid sandbox next, authorised integrations only after legal/security review."),
    ]
    y = 1.03
    for gap, answer in rows:
        box(sl, 0.72, y, 3.55, 0.64, BAD, LINE)
        tx(sl, 0.92, y + 0.18, 3.15, 0.23, gap, 10.6, RGBColor(0xA8,0x3A,0x2E), True)
        box(sl, 4.55, y, 7.95, 0.64, GOOD, LINE)
        tx(sl, 4.78, y + 0.15, 7.47, 0.3, answer, 10.5, TEAL)
        y += 0.84
    box(sl, 0.72, 6.22, 11.78, 0.55, NAVY, NAVY)
    tx(sl, 0.95, 6.37, 11.3, 0.22, "Result: discovery remains a feature; evidence continuity becomes the defensible platform.", 13, WHITE, True, PP_ALIGN.CENTER)
    footer(sl, "Gap-to-solution traceability matrix")

    # 23
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    sl.background.fill.solid(); sl.background.fill.fore_color.rgb = NAVY
    tx(sl, 0.65, 0.55, 5.5, 0.28, "THE PROPOSITION", 13, RGBColor(0x9E,0xD9,0xD2), True)
    tx(sl, 0.65, 1.2, 11.8, 1.0, "Make government pilots\nreusable, auditable and lawfully purchasable.", 34, WHITE, True)
    box(sl, 0.68, 3.0, 11.9, 1.28, RGBColor(0x12,0x35,0x58), RGBColor(0x2C,0x62,0x86))
    tx(sl, 0.95, 3.28, 11.35, 0.68,
       "Not another AI marketplace.\nA live evidence and governance layer from sealed baseline to measurable public adoption.",
       18, WHITE, True, PP_ALIGN.CENTER)
    tx(sl, 0.8, 5.05, 11.65, 0.75,
       "Ask: approve the coherent demo now → build the hybrid sandbox → validate one authorised department pilot → earn the right to integrate and scale.",
       16, RGBColor(0xD8,0xE4,0xF0), False, PP_ALIGN.CENTER)
    tx(sl, 0.68, 6.7, 11.6, 0.28, "GovStart Bridge · SIH26136 · evidence-backed strategy deck · 01 October 2026", 9, RGBColor(0xB6,0xC9,0xD9), False, PP_ALIGN.CENTER)

    prs.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    build()
