"""Step 2: make app.js safe to run on a page that holds only one section.

Every renderer gets an early return when its root element is absent, so a page
with no #mktGrid simply skips renderMarket() instead of throwing and killing all
subsequent JS on that page."""
import re, sys

APP = "/home/lenin/Apps Developed/SIH 26136/docs/assets/app.js"
js = open(APP, encoding="utf-8").read()

# function name -> id of the element it cannot run without
GUARDS = {
    "renderKpis":      "kpiList",
    "paintSeal":       "sealBox",
    "paintRisk":       "rScore",
    "paintPicks":      "picks",
    "paintPilot":      "sbOut",
    "paintRun":        "msRun",
    "paintTiers":      "tiers",
    "paintRail":       "railList",
    "renderCats":      "catChips",
    "renderMarket":    "mktGrid",
    "skillTab":        "skillPane",
    "renderSchemes":   "schemeList",
    "renderGap":       "gapBars",
    "resTab":          "resPane",
    "renderTickets":   "grvList",
    "renderMilestones":"milestones",
    "renderNotice":    "notice",
}
added = []
for fn, need in GUARDS.items():
    # match "function name(args){" and insert the guard as the first statement
    pat = re.compile(r"(function\s+" + re.escape(fn) + r"\s*\([^)]*\)\s*\{)")
    if not pat.search(js):
        continue
    if f'if(!$("{need}"))return' in js:
        continue
    js = pat.sub(lambda m: m.group(1) + f'\n  if(!$("{need}"))return;', js, count=1)
    added.append(f"{fn} -> #{need}")

# init(): the unconditional element touches
js = js.replace(
 '  $("f_title").value=S.title;$("f_out").value=S.out;$("f_dept").value=S.dept;$("f_dist").value=S.dist;\n  renderKpis();',
 '  if($("f_title")){$("f_title").value=S.title;$("f_out").value=S.out;$("f_dept").value=S.dept;$("f_dist").value=S.dist;}\n  renderKpis();')
js = js.replace('  acc($("ruleAcc"),RULES);\n  acc($("qaAcc"),QA.map(q=>[q[0],"",null,q[1]]));',
 '  if($("ruleAcc"))acc($("ruleAcc"),RULES);\n  if($("qaAcc"))acc($("qaAcc"),QA.map(q=>[q[0],"",null,q[1]]));')
js = js.replace('if(localStorage.getItem("gsb.hc")==="1"){document.body.classList.add("hc");$("hcBtn").setAttribute("aria-pressed","true");}',
 'if(localStorage.getItem("gsb.hc")==="1"){document.body.classList.add("hc");if($("hcBtn"))$("hcBtn").setAttribute("aria-pressed","true");}')
js = js.replace('    io.observe(document.querySelector(".strip"));',
 '    const strip=document.querySelector(".strip"); if(strip)io.observe(strip); else countUp();')
js = js.replace('  acc($("helpAcc"),HELP.map(h=>[h[0],"",null,h[1]]));',
 '  if($("helpAcc"))acc($("helpAcc"),HELP.map(h=>[h[0],"",null,h[1]]));')
js = js.replace('  setDeriv(0,false);\n  dTimer=setInterval(()=>setDeriv(dIdx+1,false),5200);',
 '  if($("dText")){setDeriv(0,false);dTimer=setInterval(()=>setDeriv(dIdx+1,false),5200);}')
# setDeriv itself is called from inline onclick on index only
js = js.replace('function setDeriv(i,manual){\n  dIdx=i%DERIV.length;',
 'function setDeriv(i,manual){\n  if(!$("dText"))return;\n  dIdx=i%DERIV.length;')
# assistant greeting only where the panel exists
js = js.replace('  addMsg("Ask me anything', '  if($("aiM"))addMsg("Ask me anything')

# renderTraining fills two independent grids - a single early return would
# skip the videos on a videos-only page, so guard each grid on its own.
js = js.replace('function renderTraining(){\n  $("trainGrid").innerHTML',
                'function renderTraining(){\n  if($("trainGrid"))$("trainGrid").innerHTML')
js = js.replace('\n  $("vidGrid").innerHTML', '\n  if($("vidGrid"))$("vidGrid").innerHTML')

# a top-level listener on an element that may be absent aborts the whole script,
# leaving every later const in the temporal dead zone
js = js.replace('$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});',
 'if($("modal"))$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});')
js = js.replace('function closeModal(){$("modal").classList.remove("open");',
 'function closeModal(){if(!$("modal"))return;$("modal").classList.remove("open");')
js = js.replace('$("mTitle").textContent=t;$("mBody").innerHTML=h;$("modal").classList.add("open");',
 'if(!$("modal"))return;$("mTitle").textContent=t;$("mBody").innerHTML=h;$("modal").classList.add("open");')
js = js.replace('function toggleNav(){const o=$("navlinks").classList.toggle("open");',
 'function toggleNav(){if(!$("navlinks"))return;const o=$("navlinks").classList.toggle("open");')

open(APP, "w", encoding="utf-8").write(js)
print(f"guards inserted into {len(added)} renderers:")
for a in added: print("   ", a)
