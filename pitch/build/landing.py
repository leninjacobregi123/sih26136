# -*- coding: utf-8 -*-
"""Stage 9: the landing page's main screen.

Built to a reference the author supplied: the photograph runs full strength
behind the government chrome, the claim sits left rather than centred, and
the navigation floats under it as a rounded bar rather than sitting in a
full-width strip above it.

Nothing goes white.  The reference put the floating bar and the cards on
light surfaces; here they stay dark glass, because the rest of the site is
dark and a white bar on this page alone would read as a different site.

Only index.html is touched.  Every other page keeps the standard chrome.
"""
import re, os

DOCS = "/home/lenin/Apps Developed/SIH 26136/docs"
CSS  = os.path.join(DOCS, "assets", "style.css")
HOME = os.path.join(DOCS, "index.html")


def block(html, start_tag, open_re):
    """Nesting-aware slice of one element, by its opening tag."""
    i = html.find(start_tag)
    if i < 0: return None
    depth, j = 0, i
    for m in re.finditer(open_re, html[i:]):
        depth += 1 if not m.group(0).startswith("</") else -1
        if depth == 0:
            j = i + m.end()
            break
    return i, j


def run():
    h = open(HOME, encoding="utf-8").read()
    if "landing-done" in h:
        return

    # ---- the navigation moves below the claim -------------------------
    hdr = block(h, '<header class="site">', r"</?header\b[^>]*>")
    assert hdr, "no site header"
    header_html = h[hdr[0]:hdr[1]]
    h = h[:hdr[0]] + h[hdr[1]:]

    hero = block(h, '<div class="hero">', r"</?div\b[^>]*>")
    assert hero, "no hero"
    h = h[:hero[1]] + "\n" + header_html + "\n" + h[hero[1]:]

    h = h.replace("<body ", '<body data-landing-done="1" ', 1)
    h = h.replace('class="ph-kokan">', 'class="ph-kokan home">', 1)

    # The landing page moves through three photographs rather than five.
    # The two left out are the dimmest of the set and the busiest of them,
    # which is what made this page feel heavy; these three are open
    # landscapes and the brightest we have.
    LANDING = [("ph-pratapgad", "bg-pratapgad.webp", "Pratapgad fort, Satara district"),
               ("ph-kaas",      "bg-kaas.webp",      "Kaas plateau, Satara district"),
               ("ph-kokan",     "bg-kokan.webp",     "Sahyadri range, Raigad district")]
    stack = ('<div class="bgshow" aria-hidden="true">'
             + "".join('<i class="%s" data-src="assets/img/%s" data-cap="%s"%s></i>'
                       % (c, f, cap,
                          (' data-on="1" style="background-image:url(assets/img/%s)"' % f)
                          if k == 0 else "")
                       for k, (c, f, cap) in enumerate(LANDING))
             + "<b></b></div>")
    h = re.sub(r'<div class="bgshow".*?</div>', stack, h, count=1, flags=re.S)

    # ---- four stacked bars become one notice line and one row ------
    # Everything the page is obliged to carry stays: the disclaimer (this
    # page shows both emblems, and is the one most likely to be seen on its
    # own), the skip link, the screen-reader page, text size, high contrast
    # and Marathi. They stop being four full-width bars.

    # 1. the notice keeps the sentence that matters; the full text is in the
    #    footer of every page, including this one
    h = h.replace(
      "<span>Student project for Smart India Hackathon 2026 (SIH26136). "
      "<b>Not an official portal of the Government of Maharashtra or MSInS, "
      "and not endorsed by them.</b> All data shown is simulated.</span>",
      "<span><b>Not an official portal of the Government of Maharashtra or "
      "MSInS.</b> Simulated data \u00b7 SIH26136.</span>", 1)

    # 2. the accessibility controls fold behind one labelled button. They stay
    #    in the DOM and keep their handlers, which are inline, so nothing is
    #    rebound; the skip link stays outside the fold where it belongs.
    h = h.replace(
      '<span class="u-sep" aria-hidden="true"></span>\n      '
      '<a href="#" onclick="openPolicy(\'screen\');return false" data-i18n="sr">',
      '<button class="a11y-t" id="a11yT" aria-expanded="false" '
      'aria-controls="a11yG" onclick="a11yToggle()">Accessibility</button>'
      '<span class="a11y-g" id="a11yG">'
      '<a href="#" onclick="openPolicy(\'screen\');return false" data-i18n="sr">', 1)
    h = h.replace(
      '<button class="lang-btn" onclick="toggleLang()" id="langBtn">'
      '<span lang="mr" class="on">\u092e\u0930\u093e\u0920\u0940</span></button>',
      '<button class="lang-btn" onclick="toggleLang()" id="langBtn">'
      '<span lang="mr" class="on">\u092e\u0930\u093e\u0920\u0940</span></button></span>', 1)

    # 3. the two halves of the utility bar move into the masthead row
    ul = block(h, '<span class="u-l">', r"</?span\b[^>]*>")
    ur = block(h, '<span class="u-r">', r"</?span\b[^>]*>")
    assert ul and ur, "utility bar not as expected"
    u_l, u_r = h[ul[0]:ul[1]], h[ur[0]:ur[1]]
    h = h.replace(u_r, "", 1).replace(u_l, "", 1)
    mh = '<div class="masthead">\n  <div class="wrap">'
    assert h.count(mh) == 1, "masthead not as expected"
    h = h.replace(mh, mh + u_l, 1)
    # product first, then the accessibility fold, at the far right
    mhs = block(h, '<span class="mh-site">', r"</?span\b[^>]*>")
    assert mhs, "no mh-site"
    h = h[:mhs[1]] + u_r + h[mhs[1]:]

    # the caption names the photograph, and the photograph has changed
    h = h.replace("<p class=\"hnote\">Sahyadri range, Raigad district</p>",
                  "<p class=\"hnote\">Pratapgad fort, Satara district</p>", 1)

    # CC BY-SA, so it is credited where the others are
    old_cr = "Cropped and compressed; otherwise unaltered.</p>"
    if h.count(old_cr) == 1:
        h = h.replace(old_cr, "Cropped and compressed; otherwise unaltered."
                      " Pratapgad fort, Satara \u2014 \u0938\u0941\u092c\u094b\u0927 "
                      "\u0915\u0941\u0932\u0915\u0930\u094d\u0923\u0940 (CC BY-SA 4.0).</p>")
    open(HOME, "w", encoding="utf-8").write(h)

    css = open(CSS, encoding="utf-8").read()
    if "THE LANDING PAGE" not in css:
        open(CSS, "w", encoding="utf-8").write(css + ADD)

    app = os.path.join(DOCS, "assets", "app.js")
    js = open(app, encoding="utf-8").read()
    if "a11yToggle" not in js:
        open(app, "w", encoding="utf-8").write(js + A11Y_JS)
    print("landing page: chrome over the photograph, claim left, nav floated")


A11Y_JS = """
/* ---- the accessibility fold, landing page only --------------------
   The controls stay in the DOM and keep their inline handlers; this only
   shows and hides them. */
function a11yToggle(){
  var g=document.getElementById("a11yG"), b=document.getElementById("a11yT");
  if(!g||!b) return;
  var open=g.hasAttribute("data-open");
  if(open) g.removeAttribute("data-open"); else g.setAttribute("data-open","1");
  b.setAttribute("aria-expanded", open?"false":"true");
}
"""

ADD = """
/* ===================================================================
   THE LANDING PAGE
   The photograph runs behind the chrome, the claim sits left, and the
   navigation floats under it. Dark throughout - a white bar on this one
   page would read as a different site.
   =================================================================== */
body.home .bgshow i{background-position:center 68%}
/* .44 is the floor once the picture moves: with the chrome's own .44
   ground, 11px type clears 4.5:1 over a blown-out sky, which two of
   these three photographs contain */
body.home .bgshow b{background:rgba(0,0,0,.44)}      /* the picture, brighter */
/* the chrome keeps a thin ground: over a bright sky, 11px type on bare
   photograph comes in at 2.2:1, and the picture still reads through .42 */
body.home .utility,body.home .masthead{background:rgba(0,0,0,.44);border-bottom:0}
body.home .crumbs{display:none}                      /* a breadcrumb to itself */
body.home .masthead{padding-bottom:4px}

/* one chrome row: emblems and department left, product and the accessibility
   fold right. The notice above it is one line. */
body.home .protobar .wrap{padding:6px 24px;font-size:12px}
body.home .utility{display:none}
body.home .masthead>.wrap{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  padding:10px 24px}
body.home .masthead .u-l{display:flex;align-items:center;gap:8px;flex:none}
body.home .masthead .emb-nat-w{width:19px;height:27px}
body.home .masthead .emb-moh{width:42px;height:42px}
body.home .masthead .gname{font-size:11.5px;line-height:1.25;color:#dedede}
body.home .masthead .gname .mr{font-size:10.5px;display:block;color:#c4c4c4}
body.home .masthead .mh-txt{min-width:0}
body.home .masthead .dep-mr{font-size:14px}
body.home .masthead .dep-en{font-size:11.5px}
body.home .masthead .u-r{margin-left:auto;display:flex;align-items:center;gap:8px;
  flex-wrap:wrap;font-size:11.5px}
body.home .masthead .mh-site{margin-left:0;padding-left:14px;
  border-left:1px solid rgba(255,255,255,.22)}
body.home .u-skip{position:absolute;left:-9999px}
body.home .u-skip:focus{position:static;left:auto}
body.home .a11y-t{background:rgba(255,255,255,.12);color:#fff;
  border:1px solid rgba(255,255,255,.30);border-radius:99px;
  padding:3px 11px;font:600 11.5px var(--sans);cursor:pointer}
body.home .a11y-t:hover{background:rgba(255,255,255,.2)}
body.home .a11y-g{display:none;align-items:center;gap:8px}
body.home .a11y-g[data-open]{display:flex}
body.home .masthead .u-sep{display:none}
@media(max-width:700px){
  body.home .masthead .mh-site{border-left:0;padding-left:0}
  body.home .masthead .u-r{margin-left:0;width:100%}
}

/* the claim sits left, and the scrim is heaviest where the words are so the
   right-hand side of the photograph stays a photograph */
/* the dim fades out instead of stopping: a flat block left a hard line
   across the picture where the hero ended. Full strength through the type,
   then away to nothing across the padding below it. */
body.home .hero{background-color:transparent;padding:54px 0 128px;text-align:left;
  background-image:linear-gradient(rgba(0,0,0,.32) 0%,rgba(0,0,0,.32) 72%,
    rgba(0,0,0,.22) 85%,rgba(0,0,0,.08) 94%,rgba(0,0,0,0) 100%)}
/* an even dim rather than a directional wash: the gradient read as a black
   smear across the left of the picture. .30 over the page's .44 is what the
   17px lede needs over a blown-out sky, measured rather than guessed. */
body.home .hero:before{content:none}
body.home .hero>.wrap{position:relative;z-index:1;text-align:left}
body.home .hero h1{text-align:left;max-width:760px;font-size:52px;line-height:1.12;
  margin:0 0 18px;font-weight:600}
body.home .hero h1 em{font-style:normal;font-weight:800;color:#fff}
body.home .hero p{text-align:left;margin-left:0;max-width:46ch;font-size:17px;
  color:#ededed}
body.home .hero .hero-cta,body.home .hero .btnrow{justify-content:flex-start}
body.home .hero .cap,body.home .hero .photo-cap{text-align:left}

/* the navigation, floated under the claim */
body.home header.site{background:transparent;margin-top:-74px;position:relative;z-index:6}
body.home header.site>.wrap.nav{max-width:1240px;margin:0 auto;
  background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.20);
  border-radius:16px;padding:7px 12px;
  box-shadow:0 18px 40px rgba(0,0,0,.45)}
body.home header.site .navlinks{gap:2px}
body.home .navlinks>a,body.home .mmbtn{border-radius:10px}

/* a mark beside each nav item, in the same geometric family as the rest */
body.home [data-i18n="nav_mech"]:before  {content:"\\25F4\\00a0\\00a0"}
body.home [data-i18n="nav_market"]:before{content:"\\25C8\\00a0\\00a0"}
body.home [data-i18n="nav_ev"]:before    {content:"\\00a7\\00a0\\00a0"}
body.home [data-i18n="nav_dept"]:before  {content:"\\25A6\\00a0\\00a0"}
body.home [data-i18n="nav_about"]:before {content:"\\25CE\\00a0\\00a0"}
body.home .navlinks .cv:before{content:none}

/* the bands below sit on a ground of their own, because the page scrim is
   lighter here than anywhere else on the site */
body.home main>section>.wrap{background:rgba(0,0,0,.46);border-radius:20px;
  padding:40px 34px;margin-top:26px;margin-bottom:26px}
body.home main>section{background:transparent}

@media(max-width:900px){
  body.home .hero h1{font-size:34px;max-width:none}
  body.home .hero{padding:36px 0 96px}
  body.home header.site{margin-top:-58px}
  body.home header.site>.wrap.nav{margin:0 14px;border-radius:14px}
  body.home main>section>.wrap{padding:26px 18px;border-radius:16px}
}
body.hc.home .hero:before{background:#000!important}
body.hc.home .utility,body.hc.home .masthead{background:#000!important}
body.hc.home main>section>.wrap{background:#000!important;border:1px solid #ff0!important}
body.hc.home header.site>.wrap.nav{background:#000!important;border-color:#ff0!important}
"""

run()
