"""Stage 6: monochrome interface.

Colour survives in exactly two places, because in both it is evidence
rather than styling: the official insignia (tricolour rule, state seal)
and the photographs (real places). Everything the designer controls -
type, rules, cards, buttons, states - is black, white and grey.

Where colour used to carry meaning (pass / warn / fail), the distinction
moves to border weight and style, so it survives WCAG 1.4.1.

This runs after pages.py, not before it: the stylesheet is not the only
place colour lives, and the pages have to exist before their inline
styles can be swept."""
import re
CSS = "/home/lenin/Apps Developed/SIH 26136/docs/assets/style.css"
css = open(CSS, encoding="utf-8").read()

# ---- 1. the flag keeps its own tokens; --saffron becomes ink ---------
css = css.replace("--saffron:#ff9933;", "--saffron:#111;--flag-saffron:#ff9933;", 1)
css = css.replace("--ingreen:#138808;", "--ingreen:#111;--flag-green:#138808;", 1)
css = css.replace(".tricolour i:nth-child(1){background:var(--saffron)}",
                  ".tricolour i:nth-child(1){background:var(--flag-saffron)}")
css = css.replace(".tricolour i:nth-child(3){background:var(--ingreen)}",
                  ".tricolour i:nth-child(3){background:var(--flag-green)}")

# ---- 2. the palette ---------------------------------------------------
TOKENS = {
 "--navy:#12325c":"--navy:#111",      "--navy:#7a2214":"--navy:#111",
 "--ink:#1f2733":"--ink:#111",
 "--body:#474f5a":"--body:#333",
 "--muted:#666c75":"--muted:#666",
 "--blue:#b8560d":"--blue:#111",      "--blue-s:#fdf2e8":"--blue-s:#f4f4f4",
 "--blue-l:#f0d3b0":"--blue-l:#cfcfcf",
 "--link:#0b4a9c":"--link:#111",
 "--green:#137a3e":"--green:#111",    "--green-s:#e8f4ec":"--green-s:#f2f2f2",
 "--green-l:#bfe0cb":"--green-l:#c2c2c2",
 "--amber:#8a5a08":"--amber:#4a4a4a",  "--amber-s:#fdf3e2":"--amber-s:#f7f7f7",
 "--amber-l:#f0dcb4":"--amber-l:#d6d6d6",
 "--red:#9e2020":"--red:#000",        "--red-s:#fbeaea":"--red-s:#ededed",
 "--red-l:#eecaca":"--red-l:#b5b5b5",
 "--violet:#5b3fa8":"--violet:#111",  "--violet-s:#f0ebfb":"--violet-s:#f4f4f4",
 "--line:#e8dcca":"--line:#ddd",      "--line-2:#f5ede0":"--line-2:#eee",
 "--page:#fdf8f0":"--page:#fff",
 "--gov-bar:#f8f1e6":"--gov-bar:#f6f6f6",
}
for a, b in TOKENS.items():
    css = css.replace(a, b)

# ---- 3. hard-coded warm colours left in rules --------------------------
HARD = {
 "#7a2214":"#111", "#65180d":"#000", "#6d1b0b":"#1a1a1a", "#5f1a0b":"#111",
 "#4a1206":"#000",  "#4a1509":"#000", "#3d1108":"#000",  "#5a1508":"#111",
 "#76230f":"#111",  "#8a3315":"#111", "#461105":"#000",  "#5e1c0a":"#111",
 "#742a11":"#111",  "#6d1c0e":"#111", "#9c3418":"#333",  "#a8390f":"#333",
 "#12325c":"#111",  "#1c4a85":"#333",
 "#f8f2e8":"#f6f6f6", "#f4ece0":"#f2f2f2", "#fffaf3":"#fff", "#fffdf9":"#fff",
 "#fdf8f0":"#fff",   "#faf6ef":"#f7f7f7",
 "#e5c9b9":"#d8d8d8","#f2e0d4":"#e8e8e8","#f0dccf":"#e0e0e0","#e8cdbb":"#d4d4d4",
 "#f2ddcf":"#e2e2e2","#dcbda9":"#bdbdbd","#e3c3af":"#c6c6c6","#cba189":"#a8a8a8",
 "#c2917a":"#9a9a9a","#f7e6da":"#ececec","#f5e4d7":"#e9e9e9","#efd9c8":"#e4e4e4",
 "#d9b49e":"#b6b6b6","#f0ddce":"#e3e3e3","#ffdca8":"#dcdcdc","#ffc07a":"#cfcfcf",
 "#ffb457":"#c8c8c8","#7fd4c1":"#c8c8c8","#ffc94d":"#d8d8d8",
 "#dbe6f2":"#e6e6e6","#c8d6e5":"#dcdcdc","#93acc4":"#b0b0b0","#7c94ad":"#9a9a9a",
 "#a9c0d6":"#c0c0c0","#b7c8da":"#c8c8c8","#cfe0f0":"#e0e0e0","#9db6d0":"#b6b6b6",
}
for a, b in HARD.items():
    css = re.sub(a, b, css, flags=re.I)

# ---- 4. photographic tints go neutral; the photo keeps its colour ------
css = re.sub(r"linear-gradient\(rgba\(98,24,9,\.72\),rgba\(98,24,9,\.72\)\)",
             "linear-gradient(rgba(0,0,0,.58),rgba(0,0,0,.58))", css)
css = re.sub(r"linear-gradient\(rgba\(253,248,240,\.955\),rgba\(253,248,240,\.955\)\)",
             "linear-gradient(rgba(255,255,255,.90),rgba(255,255,255,.90))", css)
css = re.sub(r"linear-gradient\(rgba\(102,25,10,\.86\),rgba\(102,25,10,\.86\)\)",
             "linear-gradient(rgba(0,0,0,.66),rgba(0,0,0,.66))", css)
css = re.sub(r"linear-gradient\(rgba\(74,18,7,\.76\),rgba\(74,18,7,\.76\)\)",
             "linear-gradient(rgba(0,0,0,.62),rgba(0,0,0,.62))", css)
css = css.replace("background:rgba(62,13,4,.34)", "background:rgba(0,0,0,.30)")
css = css.replace("background:rgba(52,12,4,.34)", "background:rgba(0,0,0,.34)")
css = css.replace("box-shadow:0 0 0 3px rgba(255,153,51,.55),0 6px 18px rgba(70,30,10,.22)",
                  "box-shadow:0 0 0 2px #111")                      # warli medallion ring

css += """
/* ===== monochrome: meaning carried by weight and rule, not hue ===== */
a{color:var(--link);text-decoration:underline;text-underline-offset:2px}
a:hover{text-decoration-thickness:2px}
.btn,.door,.taskchip,.stepchip,.deptcard,.mphoto,.vid,.sr-item,.navlinks a,
.mmbtn,.policy-links a,footer a,.steps a,.rev,.chip,.role,.choice{text-decoration:none}
.btn-p{background:#111;color:#fff;border-color:#111}
.btn-p:hover{background:#000}
.btn-o{background:#fff;color:#111;border-color:#111}
.btn-o:hover{background:#f2f2f2;color:#000}
.btn-d{background:#111;color:#fff}

/* state is told by the border, so it survives without colour */
.ministate.ok,.verdict,.seal.ok{border-width:1px;border-style:solid}
.ministate.warn,.seal.live{border-style:dashed}
.ministate.bad,.seal.broken{border-width:2px;border-style:solid;border-color:#000}
.tag{background:#f4f4f4;color:#111;border:1px solid #c9c9c9}
.tag.g{background:#fff;border:1.5px solid #111;font-weight:800}
.tag.a{background:#f4f4f4;border:1px dashed #666}
.tag.r{background:#111;color:#fff;border-color:#111}
.tag.v{background:#fff;border:1px solid #666}
.tag.n{background:#f4f4f4;color:#666;border:1px solid #ddd}

/* the accent rule under a heading is now ink */
.s-head h2:after{background:#111}
.masthead{border-bottom:3px solid #111}
.govfoot{border-top:4px solid #111}
.taskchip,.divcard{border-left:3px solid #111}
.stepchip{border-top:3px solid #111}
.contract.evi{border-top:4px solid #111}
.contract.dep{border-top:4px solid #666}
.gate span{color:#000;background:#f2f2f2;border-color:#111}
.note-b{border-left-color:#111;background:#f6f6f6}
.note-a{border-left-color:#666;background:#f6f6f6;border-left-style:dashed}
.statute,.quote,.acc .panel-in .quote,.rev .quote{border-left-color:#111;background:#f6f6f6}
.clause{border-left-color:#111}
.meter{background:linear-gradient(90deg,#d8d8d8,#8a8a8a 52%,#111)}
.bar i,.fitbar i{background:#111!important}
.always:before{background:#111;box-shadow:0 0 0 3px #e8e8e8}
.hdrsearch input{border-color:rgba(255,255,255,.4)}
.hdrsearch input:focus{border-color:#111;outline-color:#bbb}
:focus-visible{outline-color:#111}
"""

# ---- 5. sweep: desaturate anything chromatic that slipped through -----
#        The allowlist is the flag, and the high-contrast mode's yellow.
KEEP = {"#ff9933", "#138808", "#ff0", "#ffff00"}
def _lum(r, g, b):
    return int(round(0.2126*r + 0.7152*g + 0.0722*b))
def _grey(m):
    h = m.group(0)
    if h.lower() in KEEP:
        return h
    v = h.lstrip("#")
    if len(v) == 3:
        v = "".join(c*2 for c in v)
    if len(v) != 6:
        return h
    r, g, b = int(v[0:2],16), int(v[2:4],16), int(v[4:6],16)
    if max(r,g,b) - min(r,g,b) <= 2:           # already neutral
        return h
    y = _lum(r, g, b)
    return "#%02x%02x%02x" % (y, y, y)
css = re.sub(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", _grey, css)

# rgb()/rgba() with a colour cast, excluding the flag and pure blacks/whites
def _grey_rgba(m):
    r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if max(r,g,b) - min(r,g,b) <= 2:
        return m.group(0)
    y = _lum(r, g, b)
    tail = m.group(4) or ""
    return "rgba(%d,%d,%d%s)" % (y, y, y, tail) if tail else "rgb(%d,%d,%d)" % (y, y, y)
css = re.sub(r"rgba?\((\d+),\s*(\d+),\s*(\d+)(\s*,\s*[\d.]+)?\)", _grey_rgba, css)

# ---- 5b. contrast the conversion exposes ------------------------------
# Three places leaned on a hue to separate two things that are now both
# grey, or carried dark-band colours onto a light band.  Appended last,
# so these win over the rules they correct.
css += """
/* ---- monochrome contrast repairs ---- */
/* the PROTOTYPE badge was a saffron fill behind dark text; on ink it vanished */
.protobar .tagp{background:#fff;color:#111}
/* the eyebrow takes its value from the band it sits on, not from an inline style */
.eyebrow{color:#4a4a4a}
.flow .eyebrow,.hero .eyebrow{color:#d4d4d4}
/* the stepper is light-on-dark inside the flow; the plain rules are the default
   for a stepper placed anywhere else */
.steps a{background:#f2f2f2;border-bottom:3px solid #ddd;color:#444}
.steps a:hover{background:#e8e8e8;color:#111}
.steps a[aria-current="page"]{background:#fff;color:#111;border-bottom-color:#111}
.steps .sn{opacity:1;color:#666}
.flow .steps a{background:rgba(255,255,255,.06);border-bottom-color:rgba(255,255,255,.14);color:#bdbdbd}
.flow .steps a:hover{background:rgba(255,255,255,.11);color:#fff}
.flow .steps a[aria-current="page"]{background:#fff;color:#111;border-bottom-color:#fff}
.flow .steps .sn{opacity:.8;color:inherit}
/* high contrast keeps its own palette, so the two repaired parts join it */
body.hc .protobar .tagp{background:#000!important;color:#ff0!important;border:1px solid #ff0!important}
body.hc .steps a{background:#000!important;color:#ff0!important;border-bottom-color:#ff0!important}
body.hc .steps a[aria-current="page"]{background:#000!important;color:#fff!important;border-bottom-color:#fff!important}
"""

import os
open(CSS, "w", encoding="utf-8").write(css)

# ---- 7. inline styles in the markup and in app.js ---------------------
# The stylesheet is not the only place colour lives: pages carry
# style="..." attributes and app.js builds a few inline styles as strings.
# Only property values inside a style attribute are touched, so an href
# fragment or a DOM id can never be mistaken for a colour.
import glob
DOCS = "/home/lenin/Apps Developed/SIH 26136/docs"
HEX  = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b")
RGB  = re.compile(r"rgba?\((\d+),\s*(\d+),\s*(\d+)(\s*,\s*[\d.]+)?\)")
STYLE = re.compile(r"""style=(["'])(.*?)\1""", re.S)

def _grey_inline(m):
    q, body = m.group(1), m.group(2)
    body = HEX.sub(_grey, body)
    body = RGB.sub(_grey_rgba, body)
    return "style=%s%s%s" % (q, body, q)

touched = 0
for f in sorted(glob.glob(DOCS + "/*.html")) + [DOCS + "/assets/app.js"]:
    src = open(f, encoding="utf-8").read()
    out = STYLE.sub(_grey_inline, src)
    if out != src:
        open(f, "w", encoding="utf-8").write(out)
        touched += 1
print("inline styles greyed in %d files" % touched)

# The eyebrow carried an inline colour chosen for a dark band, which then
# followed it onto light ones.  Dropping it hands the decision back to CSS.
freed = 0
for f in sorted(glob.glob(DOCS + "/*.html")):
    src = open(f, encoding="utf-8").read()
    out = re.sub(r'(<p class="eyebrow")\s+style="color:#[0-9a-fA-F]{3,6};?"', r"\1", src)
    if out != src:
        open(f, "w", encoding="utf-8").write(out)
        freed += 1
print("eyebrow colour handed back to CSS in %d files" % freed)

left = re.findall(r"#(?!fff\b|ffffff\b|000\b|000000\b|111\b|222\b|333\b|444\b|555\b|666\b|777\b|888\b|999\b)"
                  r"[0-9a-fA-F]{3,6}\b", css)
def chromatic(h):
    h = h.lstrip("#")
    if len(h) == 3: h = "".join(c*2 for c in h)
    if len(h) != 6: return False
    r, g, b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    return max(r,g,b) - min(r,g,b) > 14
bad = sorted({c for c in left if chromatic(c)})
print(f"chromatic colours left in the stylesheet: {len(bad)}")
for c in bad: print("   ", c)
