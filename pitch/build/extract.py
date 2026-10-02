"""Step 1 of the migration: pull CSS, JS and every embedded image out of the
single-page build into assets/, replacing data: URIs with relative paths."""
import re, os, base64, json, sys

SRC = "/home/lenin/Apps Developed/SIH 26136/.govstart-bridge.singlepage.bak.html"
OUT = "/home/lenin/Apps Developed/SIH 26136/docs"
IMG = os.path.join(OUT, "assets", "img")
os.makedirs(IMG, exist_ok=True)

src = open(SRC, encoding="utf-8").read()
css = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
js  = re.search(r"<script>\n(.*)\n</script>", src, re.S).group(1)

# ---- name every data: URI by what it actually is -------------------------
# CSS-embedded marks, in the order they appear
CSS_NAMES = {
    "emb-nat":   "emblem-india.png",          # dark line art, for light backgrounds
    "emb-nat-w": "emblem-india-white.png",    # inverted, for dark backgrounds
    "emb-moh":   "maha-seal.png",
    "warli-medallion": "warli.webp",
    "hero":      "hero.webp",
}
saved = {}

def save_uri(uri, filename):
    """Write a data: URI to assets/img/<filename>; return the relative path."""
    if filename in saved:
        return saved[filename]
    head, b64 = uri.split(",", 1)
    if "svg+xml" in head:
        # logo is a URL-encoded (not base64) SVG
        from urllib.parse import unquote
        data = unquote(b64).encode("utf-8")
    else:
        data = base64.b64decode(b64)
    open(os.path.join(IMG, filename), "wb").write(data)
    saved[filename] = "img/" + filename
    return saved[filename]

# CSS: replace each rule's data: URI with a file
def css_repl(m):
    cls, uri = m.group(1), m.group(2)
    fn = CSS_NAMES.get(cls)
    if not fn:
        return m.group(0)
    return m.group(0).replace(uri, save_uri(uri, fn))

css = re.sub(r"\.(emb-nat-w|emb-nat|emb-moh)\{background-image:url\((data:[^)]+)\)\}", css_repl, css)
css = re.sub(r"(\.warli-medallion)\{[^}]*?url\(\"(data:[^\"]+)\"\)",
             lambda m: m.group(0).replace(m.group(2), save_uri(m.group(2), "warli.webp")), css)
css = re.sub(r"(\.hero)\{background-image:linear-gradient\([^;]*?url\('(data:[^']+)'\)",
             lambda m: m.group(0).replace(m.group(2), save_uri(m.group(2), "hero.webp")), css)

# ---- photo-strip images live inline in the #statewide markup -------------
PHOTO_ORDER = ["konkan", "pune", "nashik", "ajanta", "raigad"]  # amravati.webp referenced directly
body = src
photo_uris = re.findall(r"background-image:url\('(data:image/webp[^']+)'\)", body)
photo_map = {}
for name, uri in zip(PHOTO_ORDER, photo_uris):
    photo_map[uri] = save_uri(uri, name + ".webp")
for uri, path in photo_map.items():
    body = body.replace(uri, "assets/" + path)

# Amravati had no photograph; Chikhaldara completes the six-division set.
body = body.replace('</div><p class="cite photocredit">',
  '<figure class="mphoto"><span class="mimg" '
  'style="background-image:url(\'assets/img/amravati.webp\')" role="img" '
  'aria-label="Chikhaldara, Amravati"></span>'
  '<figcaption><b>Chikhaldara, Amravati</b><span>Amravati division</span></figcaption></figure>'
  '</div><p class="cite photocredit">', 1)
body = body.replace('Reused unaltered except for cropping and compression.',
  ' &middot; <a href="https://commons.wikimedia.org/wiki/File:Chikhaldara.jpg" target="_blank" '
  'rel="noopener">Chikhaldara, Amravati</a> \u2014 Manishjghurde (CC BY-SA 4.0). '
  'Reused unaltered except for cropping and compression.', 1)

# assets/style.css lives in assets/, so img/ is correct relative to it
# the stepper is <a> in the multi-page build, not <button>
css = css.replace(".steps button{", ".steps a{").replace(".steps button:hover{", ".steps a:hover{")
css = css.replace('.steps button[aria-current="true"]{', '.steps a[aria-current="page"]{')
css = css.replace(".steps button.done .sn:after{", ".steps a.done .sn:after{")
css += """
/* ===== site search ===== */
.visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.hdrsearch{position:relative}
.hdrsearch input{width:190px;padding:7px 11px;border:1px solid rgba(255,255,255,.34);
  border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:13px}
.hdrsearch input::placeholder{color:rgba(255,255,255,.72)}
.hdrsearch input:focus{background:#fff;color:var(--ink);border-color:var(--saffron);outline:2px solid rgba(255,153,51,.45)}
.hdrsearch input:focus::placeholder{color:var(--muted)}
@media(max-width:1180px){.hdrsearch input{width:130px}}
@media(max-width:820px){.hdrsearch{display:none}}

.sr-box{position:absolute;top:calc(100% + 6px);right:0;width:min(420px,84vw);background:#fff;
  border:1px solid var(--line);border-radius:10px;z-index:90;overflow:hidden;
  box-shadow:0 12px 30px rgba(80,40,15,.16)}
.sr-item{display:block;padding:10px 13px;border-bottom:1px solid var(--line-2);text-decoration:none}
.sr-item:last-child{border-bottom:0}
.sr-item:hover,.sr-item:focus{background:var(--blue-s);text-decoration:none}
.sr-item b{display:block;font:600 13.5px var(--sans);color:var(--ink)}
.sr-crumb{display:block;font-size:11px;color:var(--blue);margin-top:1px}
.sr-desc{display:block;font-size:12px;color:var(--muted);margin-top:3px;line-height:1.45;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sr-none{padding:14px;font-size:13px;color:var(--muted);margin:0}

/* ===== landing: "what do you want to do?" ===== */
.tasks{background:#fff;border-bottom:1px solid var(--line);padding:44px 0 48px}
.tasks-h{text-align:center;font-size:30px;margin-bottom:18px}
.bigsearch{position:relative;max-width:640px;margin:0 auto 26px}
.bigsearch input{width:100%;padding:14px 16px;font-size:15px;border:2px solid var(--line);border-radius:10px}
.bigsearch input:focus{border-color:var(--blue);outline:3px solid var(--blue-s)}
.sr-big{left:0;right:auto;width:100%}
.taskgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:940px;margin:0 auto}
.taskchip{display:flex;flex-direction:column;gap:5px;padding:16px 15px;background:#fff;
  border:1px solid var(--line);border-left:3px solid var(--saffron);border-radius:10px;
  text-decoration:none;transition:.15s}
.taskchip:hover{border-color:var(--blue);border-left-color:var(--blue);text-decoration:none}
.tk-i{font-size:17px;color:var(--blue);line-height:1}
.taskchip b{font:600 15px var(--serif);color:var(--ink)}
.taskchip span:not(.tk-i){font-size:12px;color:var(--muted);line-height:1.45}
@media(max-width:900px){.taskgrid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.taskgrid{grid-template-columns:1fr}.tasks-h{font-size:23px}}

/* six divisions, six photographs */
.photostrip{grid-template-columns:repeat(6,1fr)}
@media(max-width:1100px){.photostrip{grid-template-columns:repeat(3,1fr)}}
@media(max-width:620px){.photostrip{grid-template-columns:1fr 1fr}}

/* training films are not produced yet - say so, rather than show a dead play button */
.vid.soon{cursor:default}
.vid.soon .vthumb .pl{background:rgba(255,255,255,.18);color:#fff;font-size:11px;
  width:auto;height:auto;padding:6px 12px;border-radius:99px;letter-spacing:.06em;
  text-transform:uppercase;font-weight:700}
.vid.soon .vthumb{filter:saturate(.5)}

section.pb-amravati,.pb-amravati{background-image:url(img/bg-amravati.webp)}

/* ===== two-contract diagram (landing band 3) ===== */
.contracts{display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;margin-top:8px}
.contract{border:1px solid var(--line);border-radius:14px;padding:22px;background:#fff}
.contract.evi{border-top:4px solid var(--blue)}
.contract.dep{border-top:4px solid var(--green)}
.contract h4{font-size:17px;margin-bottom:3px}
.contract .who{font-size:12px;color:var(--muted);margin-bottom:13px}
.contract ul{list-style:none;font-size:13px;margin:0;padding:0}
.contract li{padding:6px 0 6px 20px;position:relative;border-bottom:1px dashed var(--line-2)}
.contract li:before{content:"\u25b8";position:absolute;left:2px;color:var(--blue)}
.contract.dep li:before{color:var(--green)}
.contract li:last-child{border-bottom:0}
.gate{width:78px;display:grid;place-items:center}
.gate span{writing-mode:vertical-rl;transform:rotate(180deg);font:800 10.5px/1 var(--sans);
  letter-spacing:.16em;text-transform:uppercase;color:var(--red);background:var(--red-s);
  border:1px solid var(--red-l);padding:14px 7px;border-radius:999px}
@media(max-width:860px){
  .contracts{grid-template-columns:1fr;gap:12px}
  .gate{width:auto;height:52px}
  .gate span{writing-mode:horizontal-tb;transform:none}
}

/* ===== landing: the six-step strip ===== */
.stepstrip{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.stepchip{display:flex;flex-direction:column;gap:5px;background:#fff;border:1px solid var(--line);
  border-top:3px solid var(--saffron);border-radius:12px;padding:16px 14px;text-decoration:none;transition:.18s}
.stepchip:hover{transform:translateY(-3px);box-shadow:var(--sh);text-decoration:none;border-color:var(--blue-l)}
.sc-n{font:700 10.5px/1 var(--mono);letter-spacing:.1em;color:var(--blue)}
.sc-i{font-size:21px;color:var(--blue);line-height:1}
.stepchip b{font:600 14.5px/1.25 var(--serif);color:var(--ink)}
.sc-d{font-size:11.5px;color:var(--muted);line-height:1.45}
@media(max-width:1000px){.stepstrip{grid-template-columns:repeat(3,1fr)}}
@media(max-width:620px){.stepstrip{grid-template-columns:1fr 1fr}}

/* ===== landing: the three live proof cards ===== */
.proofcard{display:flex;flex-direction:column;gap:8px}
.proofcard h3{margin:8px 0 0}
.proofcard>a{margin-top:auto;font:600 12.5px var(--sans);color:var(--blue);padding-top:4px}
.minidemo{background:#faf6ef;border:1px solid var(--line);border-radius:10px;padding:12px;margin-top:4px}
.minidemo label{font:700 10.5px/1 var(--sans);letter-spacing:.07em;text-transform:uppercase;
  color:var(--muted);display:block;margin-bottom:6px}
.minidemo input[type=text],.minidemo input:not([type]),.minidemo select{padding:7px 9px;font-size:12.5px}
.minihash{font:11px/1.5 var(--mono);word-break:break-all;color:var(--muted);margin-top:8px;
  max-height:32px;overflow:hidden}
.ministate{margin-top:8px;font:600 12px var(--sans);padding:7px 9px;border-radius:7px;border:1px solid}
.ministate.ok{background:var(--green-s);border-color:var(--green);color:var(--green)}
.ministate.bad{background:var(--red-s);border-color:var(--red);color:var(--red)}
.ministate.warn{background:var(--amber-s);border-color:var(--amber);color:var(--amber)}
.ministate.info{background:var(--blue-s);border-color:var(--blue-l);color:var(--blue)}

/* ===== department services hub ===== */
.deptgroup{margin-bottom:34px}
.deptgroup h3{font-size:19px;margin-bottom:3px}
.deptlede{font-size:13.5px;color:var(--muted);margin-bottom:14px}
.deptcard{display:flex;flex-direction:column;gap:6px;text-decoration:none}
.deptcard:hover{text-decoration:none}
.deptcard h3{font-size:16px;margin:0}
.deptcard p{color:var(--muted)}
.deptgo{margin-top:auto;padding-top:10px;font:600 12.5px var(--sans);color:var(--blue)}

/* ===== prototype banner: visible without scrolling on a public URL ===== */
.protobar{background:#6d1b0b;color:#ffe6cf;border-bottom:2px solid var(--saffron);font-size:12.5px}
.protobar .wrap{display:flex;align-items:center;gap:10px;padding:8px 24px;flex-wrap:wrap;justify-content:center;text-align:center}
.protobar b{color:#fff}
.protobar .tagp{background:var(--saffron);color:#4a1005;font:800 10px/1 var(--sans);
  letter-spacing:.1em;text-transform:uppercase;padding:4px 8px;border-radius:4px;flex:none}
body.hc .protobar{background:#000!important;color:#ff0!important;border-bottom-color:#ff0}
@media(max-width:700px){.protobar .wrap{font-size:11.5px;padding:7px 16px}}

/* ===================================================================
   PHOTOGRAPHS
   The photographs appear full-bleed, in their own bands, and never
   behind body text: a picture under a paragraph is a picture you
   cannot see and a paragraph you cannot read.  These rules only name
   the images; .bandrule below places them.
   =================================================================== */
section.pb-kokan,.pb-kokan{background-image:url(img/bg-kokan.webp)}
section.pb-ellora,.pb-ellora{background-image:url(img/bg-ellora.webp)}
section.pb-kaas,.pb-kaas{background-image:url(img/bg-kaas.webp)}
section.pb-deeksha,.pb-deeksha{background-image:url(img/bg-deekshabhoomi.webp)}
section.pb-sula,.pb-sula{background-image:url(img/bg-sula.webp)}

/* a thin photographic rule between sections instead of empty cream */
/* Full-bleed photographic divider. No body text sits here, so the
   photograph runs at full strength - this is where Maharashtra shows. */
.bandrule{position:relative;min-height:290px;display:grid;place-items:center;
  background-size:cover;background-position:center 52%;background-attachment:fixed;overflow:hidden}
.bandrule:before{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(160deg,rgba(70,16,6,.80),rgba(104,30,11,.70) 50%,rgba(128,50,16,.76))}
/* a second scrim directly behind the words, so a bright patch in the photograph
   cannot swallow them */
.bandrule:after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 62% 58% at 50% 50%,rgba(52,12,4,.55),rgba(52,12,4,.18) 70%,transparent)}
.bandrule-in{z-index:2}
.bandrule-in{position:relative;z-index:1;text-align:center;padding:38px 24px;max-width:820px}
.bandrule h2{color:#fff;font-size:33px;margin-bottom:10px;text-shadow:0 2px 18px rgba(50,14,4,.6)}
.bandrule p{color:#fff;font-size:16.5px;line-height:1.6;text-shadow:0 2px 14px rgba(50,14,4,.65)}
.bandrule .cap{display:block;margin-top:16px;font:600 11px var(--sans);letter-spacing:.1em;
  text-transform:uppercase;color:rgba(255,255,255,.82);text-shadow:0 1px 10px rgba(50,14,4,.7)}
@media(max-width:900px){.bandrule{background-attachment:scroll;min-height:230px}.bandrule h2{font-size:25px}}
@media(prefers-reduced-motion:reduce){.bandrule{background-attachment:scroll}}
body.hc .bandrule{background-image:none!important;border-block:2px solid #ff0}
body.hc .bandrule:before{background:#000!important}
body.hc .bandrule{background-image:none!important}



/* ===== landing page: welcome + three doors ===== */
.hero h1{font-size:54px;margin-top:0}
.hero:has(.doors-lead),body:has(.doors) .hero{padding:96px 0 104px}
body:has(.doors) .hero p{font-size:18px;max-width:560px}
.hero h1 em{font-style:normal;color:#ffc07a}
.doors{padding:52px 0 58px}
.doors-lead{text-align:center;font:700 11.5px/1 var(--sans);letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);margin-bottom:22px}
.doorgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:1000px;margin:0 auto}
.door{display:flex;flex-direction:column;gap:7px;background:#fff;border:1px solid var(--line);
  border-top:4px solid var(--saffron);border-radius:14px;padding:26px 22px 22px;
  text-decoration:none;transition:.18s}
.door:hover{transform:translateY(-3px);box-shadow:var(--sh);border-color:var(--blue-l);text-decoration:none}
.door-ico{font-size:26px;color:var(--blue);line-height:1;margin-bottom:6px}
.door b{font:600 19px/1.25 var(--serif);color:var(--ink)}
.door span:not(.door-ico):not(.door-go){font-size:13.5px;color:var(--muted);line-height:1.55}
.door-go{margin-top:auto;padding-top:12px;font:600 13px var(--sans);color:var(--blue)}
.doors-alt{text-align:center;margin-top:26px;font-size:13.5px;color:var(--muted)}
.doors-alt a{color:var(--link);font-weight:600}
@media(max-width:860px){.doorgrid{grid-template-columns:1fr}.hero h1{font-size:34px}}

/* multi-page stepper: links, not buttons */
.steps a{display:block;text-decoration:none}
.steps a[aria-current="page"]{background:var(--page);color:var(--ink);border-bottom-color:var(--saffron)}
.steps a:hover{text-decoration:none}
.crumbs .upd{margin-left:auto}
"""
# hero lede measured 4.47:1 against the photograph - deepen the centre scrim to clear AA
css = css.replace(
 "radial-gradient(ellipse 70% 62% at 50% 46%,rgba(70,16,6,.52),rgba(70,16,6,.10) 70%,transparent 100%)",
 "radial-gradient(ellipse 76% 68% at 50% 48%,rgba(64,13,4,.66),rgba(64,13,4,.20) 72%,transparent 100%)", 1)

# ---- the invented mark comes out ---------------------------------------
# The bridge mark was drawn for this prototype.  A department's site
# carries the insignia it is entitled to carry - the State Emblem and the
# seal of the Government of Maharashtra - and nothing a designer invented
# beside them.  The wordmark stays; the picture goes.
body = re.sub(
    r'[ \t]*<span class="emblem"[^>]*>[^<]*</span>\n?', "", body)
# Two of the high-contrast rules name the mark alongside the real emblems
# (`body.hc .emb,body.hc .emblem{...}`).  Deleting `.emblem{...}` out of the
# middle of those glued each one onto the line below it, which is how
# `body.hc body.hc .tag` - a selector that can never match - got into the
# stylesheet.  Drop the mark from a selector list first, whole rules second.
css = re.sub(r",[^,{}\n]*\.emblem(?=[,{])", "", css)
css = re.sub(r"(?m)^[^,\n{}]*\.emblem\{[^}]*\}\n?", "", css)
_logo = os.path.join(OUT, "assets", "img", "logo.svg")
if os.path.exists(_logo):
    os.remove(_logo)
    print("removed the generated mark")

open(os.path.join(OUT, "assets", "style.css"), "w", encoding="utf-8").write(css)
open(os.path.join(OUT, "assets", "app.js"),  "w", encoding="utf-8").write(js)
open("/home/lenin/Apps Developed/SIH 26136/build/_body.html", "w", encoding="utf-8").write(body)

print("assets written to", os.path.join(OUT, "assets"))
for f in sorted(os.listdir(IMG)):
    print(f"   img/{f:<26} {os.path.getsize(os.path.join(IMG,f))/1024:7.1f} KB")
print(f"   style.css                  {len(css)/1024:7.1f} KB")
print(f"   app.js                     {len(js)/1024:7.1f} KB")
leftover = len(re.findall(r"data:image/", css))
print(f"\n   data: URIs left in CSS: {leftover}")
