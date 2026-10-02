# -*- coding: utf-8 -*-
"""Stage 8: Mumbai, as a playback.

Mumbai is where the largest share of the state's departments, its listed
companies and its startups actually sit, and the site had nothing of it.
This puts it on `where-it-runs.html` as a sequence of six photographs that
plays by itself - the heritage precinct on one side, the commercial city
on the other - and says what either has to do with procurement.

It is a playback rather than a video on purpose.  The site makes a promise
that it runs from file:// with no network and no external request, and six
stills at 457 KB keep that promise where a video file would not.  The
motion is a slow cross-fade and a slow scale, which is what reads as
footage; `prefers-reduced-motion` turns both off and leaves the controls.
"""
import os, re, glob

DOCS  = "/home/lenin/Apps Developed/SIH 26136/docs"
CSS   = os.path.join(DOCS, "assets", "style.css")
APP   = os.path.join(DOCS, "assets", "app.js")
PAGE  = os.path.join(DOCS, "where-it-runs.html")

# slug, caption, what it is, photographer, licence, Commons file
FRAMES = [
 ("mum-gateway", "Gateway of India",
  "Apollo Bunder, 1924. The ceremonial arch the state still receives at.",
  "SriSriChinmaya", "CC BY-SA 4.0", "Gateway of India in the evening, Mumbai, India.jpg"),
 ("mum-csmt", "Chhatrapati Shivaji Maharaj Terminus",
  "A working terminus and a World Heritage Site at the same address.",
  "Archies2804", "CC BY-SA 4.0", "Chhatrapati Shivaji Maharaj Terminus (CSMT).jpg"),
 ("mum-court", "Bombay High Court",
  "One of India&rsquo;s three oldest chartered High Courts, sitting since 1862.",
  "Pinakpani", "CC BY-SA 4.0", "Mumbai High Court Building 02.jpg"),
 ("mum-rajabai", "Rajabai Clock Tower, University of Mumbai",
  "The university whose colleges supply much of the state&rsquo;s certified skill.",
  "Pinakpani", "CC BY-SA 4.0", "Rajabai Clock Tower in Mumbai University 06.jpg"),
 ("mum-sealink", "Bandra&ndash;Worli Sea Link",
  "Public infrastructure procured, built and now maintained under contract.",
  "Vworlikar", "CC BY-SA 4.0", "-bandra worli sealink.jpg"),
 ("mum-nariman", "Nariman Point, from Cuffe Parade",
  "The commercial district the department&rsquo;s buyers and sellers work from.",
  "Udaykumar PR", "CC BY 3.0", "Cuff Parade 4m Nariman Point - panoramio (33).jpg"),
]

# ---- 1. the markup ----------------------------------------------------
def frame_html(i, f):
    slug, cap, line, who, lic, _ = f
    return ('<figure class="mp-f %s" data-i="%d"%s>'
            '<figcaption><b>%s</b><span>%s</span></figcaption></figure>'
            % (slug, i, "" if i else ' data-on="1"', cap, line))

def dot_html(i, f):
    return ('<button class="mp-dot" type="button" data-go="%d" '
            'aria-label="Go to %s"><i></i></button>' % (i, f[1]))

SECTION = """
<section id="mumbai"><div class="wrap">
  <div class="s-head"><p class="eyebrow">Konkan &middot; the capital</p>
  <h2>Mumbai is where most of this actually lands</h2>
  <p>The state capital holds the largest concentration of departments that post problems,
  of firms that answer them, and of the finance that decides whether an answer survives
  its first year. The heritage precinct and the commercial district are the same city,
  a few kilometres apart, and this mechanism runs across both.</p></div>

  <div class="mplay" id="mumbaiPlay">
    <div class="mp-stage">%(frames)s</div>
    <div class="mp-bar"><i id="mpProg"></i></div>
    <div class="mp-ctl">
      <button class="mp-pp" id="mpToggle" type="button" aria-pressed="false">
        <span class="mp-ico" aria-hidden="true">&#9616;&#9612;</span>
        <span id="mpLabel">Pause</span></button>
      <div class="mp-dots" role="group" aria-label="Choose a photograph">%(dots)s</div>
      <p class="mp-cr" id="mpCredit"></p>
    </div>
  </div>

  <div class="grid g3" style="margin-top:22px">
    <div class="card"><h3>Departments, in one place</h3>
      <p>Mantralaya and the directorates sit inside a few square kilometres. A problem
      posted here is read by the officers who can fund a pilot, and by the ones who will
      have to run it afterwards.</p></div>
    <div class="card"><h3>Buyers and sellers, same city</h3>
      <p>The commercial district holds the listed companies, the exchanges and most of
      the state&rsquo;s DPIIT-recognised startups. Demand and supply are already in the
      same room; what has been missing is a lawful route between them.</p></div>
    <div class="card"><h3>Heritage is a procurement problem too</h3>
      <p>The Victorian Gothic and Art Deco Ensembles of Mumbai are a World Heritage Site.
      Conservation, drainage, crowd flow and fire safety in that precinct are bought under
      the same General Financial Rules as everything else here.</p></div>
  </div>
</div></section>
"""

# ---- 2. the stylesheet ------------------------------------------------
CSS_ADD = """
/* ===================================================================
   MUMBAI PLAYBACK
   Six stills, cross-faded and slowly scaled, which is what reads as
   footage. Reduced motion turns both off and leaves the controls.
   =================================================================== */
.mplay{margin-top:20px;border:1px solid rgba(255,255,255,.26);border-radius:14px;
  overflow:hidden;background:rgba(0,0,0,.46)}
.mp-stage{position:relative;aspect-ratio:16/9;overflow:hidden;background:#0c0c0c}
/* the photograph scales, the caption does not: put the zoom on a layer of
   its own or the words ride out of the frame with it */
.mp-f{position:absolute;inset:0;margin:0;opacity:0;overflow:hidden;
  transition:opacity 1.1s ease}
.mp-f[data-on]{opacity:1}
.mp-f:before{content:"";position:absolute;inset:0;background-size:cover;
  background-position:center;background-image:inherit;transform:scale(1.03)}
.mp-f[data-on]:before{transform:scale(1.10);transition:transform 7.5s linear}
.mp-f:after{content:"";position:absolute;inset:0;
  background:linear-gradient(transparent 40%,rgba(0,0,0,.86))}
.mp-f figcaption{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:18px 20px}
.mp-f figcaption b{display:block;font:600 21px/1.25 var(--serif);color:#fff}
.mp-f figcaption span{display:block;margin-top:4px;font-size:13.5px;color:#e7e7e7;max-width:60ch}
.mp-bar{height:3px;background:rgba(255,255,255,.18)}
.mp-bar i{display:block;height:100%;width:0;background:#fff}
.mp-ctl{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:11px 14px}
.mp-pp{display:inline-flex;align-items:center;gap:7px;background:#fff;color:#111;border:0;
  border-radius:99px;padding:6px 14px;font:600 12.5px var(--sans);cursor:pointer}
.mp-pp:hover{background:#dcdcdc}
.mp-ico{font-size:10px;letter-spacing:-1px}
.mp-dots{display:flex;gap:7px}
.mp-dot{background:none;border:0;padding:5px 2px;cursor:pointer;line-height:0}
.mp-dot i{display:block;width:22px;height:4px;border-radius:2px;background:rgba(255,255,255,.34)}
.mp-dot[aria-current="true"] i{background:#fff}
.mp-cr{margin:0 0 0 auto;font-size:11px;color:#c4c4c4;text-align:right}
.mp-cr a{color:#e7e7e7}
@media(max-width:700px){
  .mp-f figcaption b{font-size:17px}
  .mp-cr{margin:4px 0 0;text-align:left;width:100%}
}
@media(prefers-reduced-motion:reduce){
  .mp-f,.mp-f[data-on]{transition:none}
  .mp-f:before,.mp-f[data-on]:before{transform:none;transition:none}
}
body.hc .mplay{border-color:#ff0!important;background:#000!important}
body.hc .mp-f figcaption b{color:#ff0!important}
body.hc .mp-dot[aria-current="true"] i,body.hc .mp-bar i{background:#ff0!important}
"""
for slug, _, _, _, _, _ in FRAMES:
    CSS_ADD += ".mp-f.%s{background-image:url(img/%s.webp)}\n" % (slug, slug)

# ---- 3. the script ----------------------------------------------------
CREDITS_JS = ",".join(
    '{c:"%s",w:"%s",l:"%s"}' % (cap.replace('"', '\\"'), who, lic)
    for _, cap, _, who, lic, _ in FRAMES)

JS_ADD = """
/* ---- Mumbai playback ------------------------------------------------
   Guarded like every other renderer: absent root, nothing runs.
   Advancing is a timer and the progress bar is a CSS transition, so the
   playback does not depend on requestAnimationFrame being driven - which
   it is not under a headless virtual clock, and is throttled in a
   background tab. */
(function(){
  var root=document.getElementById("mumbaiPlay");
  if(!root) return;
  var CR=[%(credits)s];
  var frames=[].slice.call(root.querySelectorAll(".mp-f"));
  var dots=[].slice.call(root.querySelectorAll(".mp-dot"));
  var prog=document.getElementById("mpProg");
  var credit=document.getElementById("mpCredit");
  var toggle=document.getElementById("mpToggle");
  var label=document.getElementById("mpLabel");
  var ico=toggle?toggle.querySelector(".mp-ico"):null;
  var still=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HOLD=7000, i=0, playing=false, timer=0;

  function show(n){
    i=(n+frames.length)%%frames.length;
    frames.forEach(function(f,k){
      if(k===i) f.setAttribute("data-on","1"); else f.removeAttribute("data-on"); });
    dots.forEach(function(d,k){ d.setAttribute("aria-current", k===i?"true":"false"); });
    var c=CR[i];
    credit.textContent="Photograph: "+c.c+" \u2014 "+c.w+" ("+c.l+"), Wikimedia Commons";
  }
  function bar(on){
    prog.style.transition="none";
    prog.style.width="0";
    void prog.offsetWidth;                       // commit the reset
    if(on){ prog.style.transition="width "+HOLD+"ms linear"; prog.style.width="100%%"; }
  }
  function schedule(){
    clearTimeout(timer);
    if(!playing) return;
    bar(true);
    timer=setTimeout(function(){ show(i+1); schedule(); }, HOLD);
  }
  function play(on){
    playing=on;
    toggle.setAttribute("aria-pressed", on?"false":"true");
    label.textContent=on?"Pause":"Play";
    if(ico) ico.innerHTML=on?"\u2590\u258c":"\u25b6";
    if(on) schedule(); else { clearTimeout(timer); bar(false); }
  }
  toggle.addEventListener("click",function(){ play(!playing); });
  dots.forEach(function(d){
    d.addEventListener("click",function(){
      show(parseInt(d.getAttribute("data-go"),10));
      if(playing) schedule(); else bar(false);
    });
  });
  document.addEventListener("visibilitychange",function(){
    if(document.hidden) clearTimeout(timer); else if(playing) schedule();
  });
  show(0);
  play(!still);
})();
""" % {"credits": CREDITS_JS}


def run():
    # markup
    html = open(PAGE, encoding="utf-8").read()
    if 'id="mumbai"' not in html:
        block = SECTION % {
            "frames": "".join(frame_html(i, f) for i, f in enumerate(FRAMES)),
            "dots":   "".join(dot_html(i, f) for i, f in enumerate(FRAMES)),
        }
        # after the page's own opening section, before anything else
        m = re.search(r"</section>", html)
        assert m, "where-it-runs.html has no section to follow"
        html = html[:m.end()] + block + html[m.end():]
        # the photographs are CC BY-SA, so they are credited where the others are
        extra = (" Mumbai photographs: "
                 + " &middot; ".join("%s &mdash; %s (%s)" % (cap, who, lic)
                                     for _, cap, _, who, lic, _ in FRAMES)
                 + ".")
        old = "Cropped and compressed; otherwise unaltered.</p>"
        assert html.count(old) == 1, "credit paragraph not found"
        html = html.replace(old, "Cropped and compressed; otherwise unaltered." + extra + "</p>")
        open(PAGE, "w", encoding="utf-8").write(html)

    css = open(CSS, encoding="utf-8").read()
    if "MUMBAI PLAYBACK" not in css:
        open(CSS, "w", encoding="utf-8").write(css + CSS_ADD)

    js = open(APP, encoding="utf-8").read()
    if "Mumbai playback" not in js:
        open(APP, "w", encoding="utf-8").write(js + JS_ADD)

    print("Mumbai playback: %d frames on where-it-runs.html" % len(FRAMES))

run()
