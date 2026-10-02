# -*- coding: utf-8 -*-
"""Stage 10: strip the top chrome to the two emblems.

What is left at the top of every page is the State Emblem of India and the
seal of the Government of Maharashtra, top left, and nothing else.

Two things do not simply get deleted, because neither is decoration:

  the disclaimer - this site shows both emblems, and use of the State Emblem
    is governed by the State Emblem of India (Prohibition of Improper Use)
    Act, 2005. Showing them with no correction anywhere above the fold would
    present a student prototype as a government portal. It becomes one small
    line under the emblems instead of a full-width banner, and the full
    notice stays in the footer where it already was.

  the accessibility controls - the site claims GIGW 3.0 in its own footer,
    and these are the only route to high contrast, text size and Marathi.
    They move down to sit beside the statutory policy links, which is where
    most government sites keep them. The skip link stays out of the way
    until it is focused.
"""
import re, os, glob

DOCS = "/home/lenin/Apps Developed/SIH 26136/docs"
CSS  = os.path.join(DOCS, "assets", "style.css")

NOTE = ""   # the disclosure lives in the footer


def block(html, start_tag, open_re):
    i = html.find(start_tag)
    if i < 0:
        return None
    depth = 0
    for m in re.finditer(open_re, html[i:]):
        depth += 1 if not m.group(0).startswith("</") else -1
        if depth == 0:
            return i, i + m.end()
    return None


def strip(path):
    h = open(path, encoding="utf-8").read()
    if 'class="mh-embs"' in h:
        return False

    # 1. the accessibility cluster moves to the footer, beside the policies
    ur = block(h, '<span class="u-r">', r"</?span\b[^>]*>")
    if ur:
        cluster = h[ur[0]:ur[1]]
        h = h[:ur[0]] + h[ur[1]:]
        anchor = '<nav class="policy-links"'
        if anchor in h:
            h = h.replace(anchor, '<div class="gf-a11y">' + cluster + "</div>" + anchor, 1)

    # 2. the prototype banner comes off the top; the footer still carries it
    pb = block(h, '<div class="protobar">', r"</?div\b[^>]*>")
    if pb:
        h = h[:pb[0]] + h[pb[1]:]

    # 3. the masthead keeps both emblems and the wording that identifies
    #    whose site this is: Government of Maharashtra, the department, and
    #    the product. Only the prototype banner and the rule come off.
    head = h[:h.find("<main")]
    ul = block(h, '<span class="u-l">', r"</?span\b[^>]*>")
    u_l = h[ul[0]:ul[1]] if ul else ""
    if ul:
        h = h[:ul[0]] + h[ul[1]:]
    mh = block(h, '<div class="masthead">', r"</?div\b[^>]*>")
    assert mh, "no masthead in " + os.path.basename(path)
    seg = h[mh[0]:mh[1]]

    def keep(tag, cls):
        b = block(seg, '<%s class="%s"' % (tag, cls), r"</?%s\b[^>]*>" % tag)
        return seg[b[0]:b[1]] if b else ""

    moh   = (re.search(r'<span class="emb emb-moh"[^>]*></span>', seg)
             or re.search(r'<span class="emb emb-moh"[^>]*></span>', head))
    assert moh, "no state seal in " + os.path.basename(path)
    mh_txt  = keep("span", "mh-txt")
    mh_site = keep("span", "mh-site")
    h = (h[:mh[0]]
         + '<div class="masthead"><div class="wrap">'
         + '<span class="mh-embs">' + u_l + moh.group(0) + "</span>"
         + mh_txt + mh_site
         + "</div></div>"
         + h[mh[1]:])

    # 4. the tricolour rule is decoration, and it is aria-hidden already
    tc = block(h, '<div class="tricolour"', r"</?div\b[^>]*>")
    if tc:
        h = h[:tc[0]] + h[tc[1]:]

    # 5. the utility bar has nothing left in it
    ut = block(h, '<div class="utility">', r"</?div\b[^>]*>")
    if ut:
        h = h[:ut[0]] + h[ut[1]:]

    open(path, "w", encoding="utf-8").write(h)
    return True


ADD = """
/* ===================================================================
   THE TOP OF THE PAGE
   Both emblems and the wording that says whose site this is. No band
   behind it - the photograph shows through a gradient that fades out,
   which is what keeps 11px type legible over a blown-out sky.
   =================================================================== */
.masthead,body.home .masthead{border-bottom:0;padding:0;
  background:linear-gradient(rgba(0,0,0,.66),rgba(0,0,0,.30) 70%,rgba(0,0,0,.12))}
.masthead>.wrap{max-width:none;width:100%;display:flex;align-items:center;
  gap:13px;flex-wrap:wrap;padding:10px 22px}
.mh-embs{display:flex;align-items:center;gap:10px;flex:none}
.masthead .emb-nat-w{width:21px;height:30px}
.masthead .emb-moh{width:40px;height:40px}
.masthead .gname{font-size:11px;line-height:1.25;color:#e8e8e8}
.masthead .gname .mr{display:block;font-size:10px;color:#dcdcdc}
.masthead .mh-txt{min-width:0}
.masthead .dep-mr{font-size:14px;color:#fff}
.masthead .dep-en{font-size:11.5px;color:#e4e4e4}
.masthead .mh-site{margin-left:auto;padding-left:14px;
  border-left:1px solid rgba(255,255,255,.26)}
.masthead .mh-site b{color:#fff}
.masthead .mh-site span{color:#e0e0e0}

/* the accessibility controls, now beside the statutory policy links */
.gf-a11y{display:flex;align-items:center;gap:9px;flex-wrap:wrap;
  padding:0 0 12px;margin:0 0 12px;border-bottom:1px solid rgba(255,255,255,.14);
  font-size:11.5px}
.gf-a11y .u-sep{display:none}
.gf-a11y .u-skip{position:absolute;left:-9999px}
.gf-a11y .u-skip:focus{position:static;left:auto}
.gf-a11y a{color:#e0e0e0}
.gf-a11y .a11y-t{display:none}
.gf-a11y .a11y-g{display:flex!important;align-items:center;gap:9px;flex-wrap:wrap}

@media(max-width:820px){
  .masthead>.wrap{padding:9px 16px;gap:10px}
  .masthead .mh-site{margin-left:0;border-left:0;padding-left:0;width:100%}
}
body.hc .masthead{background:#000!important}
"""

def run():
    n = 0
    for f in sorted(glob.glob(DOCS + "/*.html")):
        if strip(f):
            n += 1
    css = open(CSS, encoding="utf-8").read()
    if "THE TOP OF THE PAGE" not in css:
        open(CSS, "w", encoding="utf-8").write(css + ADD)
    print("top chrome reduced to the emblems on %d pages" % n)


run()
