"""Stage 6: build an offline search index over every page, then wire the UI.

No server. The index is generated from the built pages at build time and
shipped as one JS file; matching happens in the browser."""
import os, re, json, glob
ROOT = "/home/lenin/Apps Developed/SIH 26136/docs"
APP  = os.path.join(ROOT, "assets", "app.js")

STOP = set("the a an and or of to in for on at by is are was were be been it its this that "
           "with from as if then than so but not no nor can will would should may might".split())

def words(t):
    return [w for w in re.findall(r"[a-z0-9()]+", t.lower()) if len(w) > 1 and w not in STOP]

docs = []
for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
    name = os.path.basename(p)
    s = open(p, encoding="utf-8").read()
    m = re.search(r'<main id="main">(.*?)</main>', s, re.S)
    if not m:
        continue
    body = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", m.group(1), flags=re.S)
    title = re.sub(r"\s*\|.*$", "", re.search(r"<title>(.*?)</title>", s, re.S).group(1)).strip()
    crumb = re.search(r'<span data-i18n="crumb"[^>]*>(.*?)</span>', s, re.S)
    crumb = re.sub(r"<[^>]+>", "", crumb.group(1)).strip() if crumb else ""
    h = re.search(r"<h2[^>]*>(.*?)</h2>", body, re.S)
    lede = re.sub(r"<[^>]+>", " ", h.group(1)) if h else ""
    text = re.sub(r"<[^>]+>", " ", body)
    text = re.sub(r"\s+", " ", text).strip()
    docs.append({"u": name, "t": title, "c": crumb, "a": "",
                 "d": (lede or text)[:120].strip(),
                 "k": " ".join(dict.fromkeys(words(title + " " + crumb + " " + text[:2600])))[:900]})

# hand-written aliases: what people type vs what the page is called
ALIAS = {
 "rule-book.html": "173 170 166 157 154 155 gfr statute law legal provision quoted",
 "government-laws.html": "gfr dpdp dap gem act rules statute law",
 "step-1-define-the-problem.html": "seal sha256 hash kpi criteria escrow tamper outcome baseline",
 "step-2-cap-the-risk.html": "risk ladder turnover relaxation 173 eligibility blast radius sliders",
 "step-3-see-whos-eligible.html": "startup discovery screening dpiit shortlist eligible",
 "step-4-design-the-pilot.html": "sandbox dpdp milestone evidence contract data masked ip annexure",
 "step-5-run-and-validate.html": "milestone payment sanction packet validator treasury pfms",
 "step-6-buy-it-lawfully.html": "tier tier1 tier2 tier3 \"tier 1\" \"tier 2\" \"tier 3\" proprietary pac limited tender gem runway scale up route purchase order",
 "grievance.html": "complaint ticket sla payment delay escalation redressal 24x7",
 "marketplace.html": "buy product service listing seller catalogue vendor",
 "licence.html": "dpiit udyam gst msme registration certificate iso",
 "buyer-login.html": "sign in otp officer account access password",
 "skill-gap.html": "demand supply trades district shortage workforce vacancy",
 "where-it-runs.html": "division konkan pune nashik sambhajinagar amravati nagpur district map "
   "gateway india mumbai shaniwar wada ajanta ellora raigad fort chikhaldara sahyadri vineyard photograph landmark",
 "schemes.html": "scheme yojana subsidy eligibility grant abhiyan",
 "templates.html": "template annexure contract clause rubric worksheet",
 "why-its-hard.html": "gap problem rule 166 157 173 constraint barrier gem runway startup week mahatenders eprocurement idex aditi dpiit portal existing landscape why not gem scale",
 "judges-questions.html": "gem why not gem startup week idex objection panel judge question answer direct award smart contract",
}
for d in docs:
    d["a"] = ALIAS.get(d["u"], "")

idx = json.dumps(docs, separators=(",", ":"), ensure_ascii=False)
js = open(APP, encoding="utf-8").read()

SEARCH = """
/* ============================================================
   SITE SEARCH - offline, over a prebuilt index. No server.
   ============================================================ */
const SEARCH_INDEX=__INDEX__;
const WORDCH=/[a-z0-9]/;
function hasWord(hay,t){            // word-start match, no RegExp built from user input
  if(!hay||!t) return false;
  let i=hay.indexOf(t);
  while(i>=0){
    if(i===0||!WORDCH.test(hay.charAt(i-1))) return true;
    i=hay.indexOf(t,i+1);
  }
  return false;
}
function searchSite(q){
  q=(q||"").toLowerCase().trim();
  if(q.length<2) return [];
  const terms=q.split(/\\s+/).filter(Boolean);
  return SEARCH_INDEX.map(d=>{
    const title=(d.t||"").toLowerCase(), crumb=(d.c||"").toLowerCase();
    const alias=(d.a||"").toLowerCase(), body=(d.k||"").toLowerCase();
    let sc=0;
    for(const t of terms){
      if(hasWord(alias,t))      sc+=18;                // curated: what people actually type
      if(title===t)             sc+=20;
      else if(hasWord(title,t)) sc+=t.length>1?11:4;   // a bare digit in a title proves little
      if(hasWord(crumb,t))      sc+=6;
      if(hasWord(body,t))       sc+=t.length>2?3:1;
      else if(t.length>3&&body.indexOf(t)>=0) sc+=1;
    }
    if(sc&&terms.length>1){
      const all=terms.every(t=>hasWord(title+" "+crumb+" "+alias+" "+body,t));
      if(all) sc+=8;                                   // reward matching every term
    }
    if(d.u==="index.html") sc-=10;                     // the landing is an overview, not an answer
    return {d,sc};
  }).filter(r=>r.sc>0).sort((a,b)=>b.sc-a.sc).slice(0,8).map(r=>r.d);
}
function renderResults(box,list,q){
  if(!box) return;
  if(!q||q.length<2){box.innerHTML="";box.hidden=true;return;}
  box.hidden=false;
  if(!list.length){
    box.innerHTML='<p class="sr-none">Nothing matches &ldquo;'+esc(q)+'&rdquo;. '
      +'Try a rule number, a district, or a task \\u2014 <b>173</b>, <b>Nashik</b>, <b>payment</b>.</p>';
    return;
  }
  box.innerHTML=list.map(d=>
    '<a class="sr-item" href="'+d.u+'"><b>'+esc(d.t)+'</b>'
    +(d.c?'<span class="sr-crumb">'+esc(d.c)+'</span>':'')
    +'<span class="sr-desc">'+esc(d.d)+'</span></a>').join("");
}
function wireSearch(inputId,boxId){
  const i=$(inputId),b=$(boxId);
  if(!i||!b) return;
  const run=()=>renderResults(b,searchSite(i.value),i.value.trim());
  i.addEventListener("input",run);
  i.addEventListener("focus",run);
  i.addEventListener("keydown",e=>{
    if(e.key==="Escape"){i.value="";renderResults(b,[],"");i.blur();}
    if(e.key==="Enter"){const a=b.querySelector(".sr-item"); if(a) location.href=a.getAttribute("href");}
  });
  document.addEventListener("click",e=>{
    if(!e.target.closest("."+b.className.split(" ")[0])&&e.target!==i){b.hidden=true;}
  });
}
function initSearch(){ wireSearch("hdrSearch","hdrResults"); wireSearch("bigSearch","bigResults"); }
""".replace("__INDEX__", idx)

js = js.replace("/* ===== init ===== */", SEARCH + "\n/* ===== init ===== */", 1)
js = js.replace("  initSubPage();\n", "  initSubPage();\n  initSearch();\n", 1)
open(APP, "w", encoding="utf-8").write(js)
print(f"search index built over {len(docs)} pages  ({len(idx)/1024:.1f} KB)")
