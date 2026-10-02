"""Stage 5: flatten every gradient to solid colour, DMV-style.

Photographic overlays keep a single flat tint (still translucent so the
photograph shows) but stop being multi-stop ramps. Decorative gradients
that carry meaning - the risk meter, the range track - are left alone."""
import re, os
CSS = "/home/lenin/Apps Developed/SIH 26136/docs/assets/style.css"
css = open(CSS, encoding="utf-8").read()

FLAT = [
 # --- structural chrome: solid fills ---------------------------------
 ("linear-gradient(180deg,#7a2214,#65180d)", "#7a2214"),                       # nav bar
 ("linear-gradient(180deg,#fbf6ee,#f5ece0)", "#f8f2e8"),                       # utility bar
 ("linear-gradient(180deg,#f8f1e6,#f3e8d8)", "#f4ece0"),                       # breadcrumb
 ("linear-gradient(180deg,#fff,#fffaf2)", "#fff"),                             # masthead
 ("linear-gradient(180deg,#fffaf3,#fdf2e2)", "#fffaf3"),                       # stat strip
 ("linear-gradient(170deg,#fffdfa,#fff6ea)", "#fffdf9"),                       # white sections
 ("linear-gradient(170deg,#fffdf9,#fdf3e4)", "#fffdf9"),                       # walkthrough stage
 ("linear-gradient(150deg,#5a1508 0%,#76230f 58%,#8a3315 100%)", "#5f1a0b"),   # content footer
 ("linear-gradient(150deg,#461105 0%,#5e1c0a 60%,#742a11 100%)", "#4a1206"),   # statutory footer
 ("linear-gradient(135deg,#7a2214,#a8390f)", "#7a2214"),                       # video thumbs
 ("linear-gradient(120deg,#6d1b0b,#a8390f 45%,#c2601a)", "#7a2214"),           # CTA band
 ("linear-gradient(155deg,#6d1b0b 0%,#8f2c11 42%,#a8481a 74%,#b85a18 100%)", "#6d1b0b"),  # flow band
 ("linear-gradient(150deg,var(--navy),#1c4a85)", "#7a2214"),                   # logo tile fallback
 # --- alternating section washes: one flat ground --------------------
 ("linear-gradient(165deg,rgba(255,255,255,.72),rgba(255,246,232,.55))", "transparent"),
 ("linear-gradient(165deg,rgba(253,243,228,.55),rgba(255,255,255,.6))", "transparent"),
 ("linear-gradient(180deg,#fdf8f0 0%,#fbf1e2 30%,#fdf7ee 62%,#faefdf 100%)", "#fdf8f0"),
 # --- photographic overlays: single flat tint, still translucent -----
 ("linear-gradient(155deg,rgba(102,25,10,.80) 0%,rgba(133,40,15,.70) 45%,rgba(158,66,22,.64) 78%,rgba(170,80,20,.60) 100%)",
  "linear-gradient(rgba(98,24,9,.72),rgba(98,24,9,.72))"),   # flat tint, still a valid image layer
 ("linear-gradient(150deg,rgba(253,248,240,.965),rgba(255,244,230,.95) 55%,rgba(253,248,240,.965))",
  "linear-gradient(rgba(253,248,240,.955),rgba(253,248,240,.955))"),
 ("linear-gradient(150deg,rgba(102,25,10,.90),rgba(133,40,15,.84) 48%,rgba(158,66,22,.80))",
  "linear-gradient(rgba(102,25,10,.86),rgba(102,25,10,.86))"),
 ("linear-gradient(160deg,rgba(70,16,6,.80),rgba(104,30,11,.70) 50%,rgba(128,50,16,.76))",
  "linear-gradient(rgba(74,18,7,.76),rgba(74,18,7,.76))"),
]
n = 0
for a, b in FLAT:
    if a in css:
        css = css.replace(a, b); n += 1

# the hero's two scrims collapse into one flat veil
css = css.replace(
 'background:radial-gradient(ellipse 76% 68% at 50% 48%,rgba(64,13,4,.66),rgba(64,13,4,.20) 72%,transparent 100%),'
 'linear-gradient(to bottom,transparent 52%,rgba(66,15,5,.42) 88%,rgba(66,15,5,.50) 100%)',
 'background:rgba(62,13,4,.34)')
# divider text scrim
css = css.replace(
 'background:radial-gradient(ellipse 62% 58% at 50% 50%,rgba(52,12,4,.55),rgba(52,12,4,.18) 70%,transparent)',
 'background:rgba(52,12,4,.34)')
# the dotted hero texture goes; flat means flat
css = css.replace('background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.13) 1px,transparent 0);'
                  'background-size:26px 26px;opacity:.5', 'background:none')

# --- DMV-style card treatment: border, no shadow --------------------
css += """
/* ===== flat, DMV-style surfaces: borders carry the structure ===== */
.card,.lcard,.divcard,.cbox,.acc,.tier,.ms,.ticket,.pick,.vid,.appcard,.mphoto,
.doorchip,.stepchip,.door,.deptcard,.proofcard{box-shadow:none}
.card:hover,.lcard:hover,.mphoto:hover,.vid:hover,.deptcard:hover,
.stepchip:hover,.door:hover,.rev:hover{box-shadow:none;transform:none;border-color:var(--blue)}
:root{--sh:none}
.mm{box-shadow:0 1px 0 var(--line),0 12px 28px rgba(80,40,15,.13)}

/* section panels, the way DMV boxes a group */
.panelled>.wrap{background:#fff;border:1px solid var(--line);border-radius:14px;padding:34px 30px}
@media(max-width:700px){.panelled>.wrap{padding:22px 16px;border-radius:0;border-left:0;border-right:0}}
"""
open(CSS, "w", encoding="utf-8").write(css)
print(f"flattened {n}/{len(FLAT)} gradient rules")
left = len(re.findall(r"(?:linear|radial)-gradient", css))
print(f"gradients remaining: {left}  (meter/track/mm-shadow only)")
for g in re.findall(r"(?:linear|radial)-gradient\([^)]*\)", css):
    print("   ", g[:70])
