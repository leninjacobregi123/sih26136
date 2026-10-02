"""Step 3: turn in-page navigation into real page navigation."""
import re
APP = "/home/lenin/Apps Developed/SIH 26136/docs/assets/app.js"
js = open(APP, encoding="utf-8").read()

PAGES = '''
/* ============================================================
   MULTI-PAGE NAVIGATION
   Each walkthrough step is its own page; PAGE_STEP is set by the
   page itself. State travels between pages in localStorage.
   ============================================================ */
const STEP_PAGES=["step-1-define-the-problem.html","step-2-cap-the-risk.html",
 "step-3-see-whos-eligible.html","step-4-design-the-pilot.html",
 "step-5-run-and-validate.html","step-6-buy-it-lawfully.html"];
const PAGE_STEP = (typeof window.PAGE_STEP==="number") ? window.PAGE_STEP : -1;
'''
js = js.replace("/* ============================================================\n   FLOW STATE", PAGES +
                "\n/* ============================================================\n   FLOW STATE", 1)

# go(): navigate unless we are already on that step's page
old_go = js[js.index("function go(n){"):js.index("\n}", js.index("function go(n){"))+2]
new_go = '''function go(n){
  if(n<0||n>5)return;
  if(PAGE_STEP===n){ paintStepPage(); return; }      // already here
  save();                                            // carry choices across the page load
  location.href=STEP_PAGES[n];
}
function paintStepPage(){
  if(PAGE_STEP<0)return;
  step=PAGE_STEP;
  document.querySelectorAll("#steps a").forEach((a,i)=>{
    a.setAttribute("aria-current", i===PAGE_STEP ? "page" : "false");
    a.classList.toggle("done",done(i));
  });
  const p=$("prog"); if(p)p.textContent="Step "+(PAGE_STEP+1)+" of 6";
  paint();
}
'''
js = js.replace(old_go, new_go, 1)

js = js.replace('function startFlow(){go(0);scrollTo_($("flow"));}',
                'function startFlow(){location.href=STEP_PAGES[0];}')
js = js.replace('function resetFlow(){S=JSON.parse(JSON.stringify(DEF));try{localStorage.removeItem("gsb.v2");}catch(e){}',
                'function resetFlow(){S=JSON.parse(JSON.stringify(DEF));try{localStorage.removeItem("gsb.v2");}catch(e){}\n  if(PAGE_STEP!==0){location.href=STEP_PAGES[0];return;}')

# mega-menu helpers now only matter when you are already on the target page;
# menu items themselves become real <a href> links in the markup.
js = js.replace('function mmGo(sec,type){closeMenus();if(type&&type!=="all")$("mtype").value=type==="skill"?"skill":type;else if($("mtype"))$("mtype").value="";renderMarket();scrollTo_($(sec));}',
'''function mmGo(sec,type){
  closeMenus();
  if(!$("mtype")){location.href="marketplace.html"+(type&&type!=="all"?"#"+type:"");return;}
  $("mtype").value=(type&&type!=="all")?type:"";renderMarket();
}''')
js = js.replace('function mmGoSkill(t){closeMenus();skillTab(t);scrollTo_($("skills"));}',
'''function mmGoSkill(t){
  closeMenus();
  if(!$("skillPane")){location.href="skills.html#"+t;return;}
  skillTab(t);
}''')

# each page sets its own breadcrumb; applyLang must translate it, not overwrite it
js = js.replace("""    const k=el.dataset.i18n, v=I18N[k];
    if(v) el.innerHTML=v[LANG];""",
"""    const k=el.dataset.i18n, v=I18N[k];
    if(k==="crumb"){                       // per-page label, with optional Marathi
      const mr=el.dataset.mr;
      if(LANG===1&&mr) el.innerHTML=mr;
      else if(LANG===0&&el.dataset.en) el.innerHTML=el.dataset.en;
      return;
    }
    if(v) el.innerHTML=v[LANG];""", 1)

# arrow keys move between step pages (the old handler assumed one scrolling page)
js = js.replace("""  const box=$("flow").getBoundingClientRect();
  if(box.top<200&&box.bottom>300){
    if(e.key==="ArrowRight")go(step+1);
    if(e.key==="ArrowLeft")go(step-1);
  }""",
"""  if(PAGE_STEP>=0){
    if(e.key==="ArrowRight"&&PAGE_STEP<5)go(PAGE_STEP+1);
    if(e.key==="ArrowLeft"&&PAGE_STEP>0)go(PAGE_STEP-1);
  }""", 1)

# sync() must only read the fields that exist on the page it is called from,
# otherwise changing a dropdown on step 4 or 6 throws on step 1's inputs.
old_sync = js[js.index("function sync(){"): js.index("\n}", js.index("function sync(){"))+2]
js = js.replace(old_sync, """function sync(){
  const v=id=>{const e=$(id);return e?e.value:null;};
  const t=v("f_title");
  if(t!==null){S.title=t;S.dept=v("f_dept");S.dist=v("f_dist");S.out=v("f_out");}
  const dc=v("f_data");
  if(dc!==null){S.dataClass=parseInt(dc,10);S.access=parseInt(v("f_acc"),10);}
  const sc=v("f_scope");
  if(sc!==null){S.scope=sc;S.gr=parseInt(v("f_gr"),10);}
  paint();
}
""", 1)

# deep links: activate the right tab/filter from the URL hash on arrival
js = js.replace("/* ===== init ===== */", '''/* ===== deep links: page.html#tab arrives with that tab open ===== */
function applyHash(){
  const h=(location.hash||"").replace(/^#\\/?/,"");
  if(!h)return;
  if($("mtype")&&["product","service","skill"].includes(h)){$("mtype").value=h;renderMarket();}
  if($("skillPane")&&["skill","employment","entre"].includes(h))skillTab(h);
  if($("resPane")&&["tpl","laws","reports","apps"].includes(h))resTab(h);
  const el=document.getElementById(h);
  if(el&&!["mtype","skillPane","resPane"].includes(h))scrollTo_(el);
}
addEventListener("hashchange",applyHash);

/* ===== init ===== */''',1)
js = js.replace("  if(restored)toast(", "  applyHash();\n  paintStepPage();\n  if(restored)toast(",1)
js = js.replace("  go(step);\n","",1)

# visitor counter: one visit per browser session, not one per page load
js = js.replace('''function visitorCount(){
  let n=0;
  try{n=parseInt(localStorage.getItem("gsb.visits")||"0",10)+1;localStorage.setItem("gsb.visits",n);}catch(e){n=1;}''',
'''function visitorCount(){
  let n=0;
  try{
    n=parseInt(localStorage.getItem("gsb.visits")||"0",10);
    if(!sessionStorage.getItem("gsb.counted")){n+=1;localStorage.setItem("gsb.visits",n);sessionStorage.setItem("gsb.counted","1");}
  }catch(e){n=1;}''')

# assistant thread survives navigation
js = js.replace('''function addMsg(t,c,ref){
  const d=document.createElement("div");d.className="msg "+c;d.textContent=t;''',
'''function saveThread(){
  try{
    const msgs=[...document.querySelectorAll("#aiM .msg")].map(m=>({
      c:m.className.includes("user")?"user":"bot",
      t:(m.childNodes[0]&&m.childNodes[0].nodeValue)||m.textContent,
      r:(m.querySelector(".ref")||{}).textContent||""}));
    sessionStorage.setItem("gsb.thread",JSON.stringify(msgs.slice(-24)));
  }catch(e){}
}
function restoreThread(){
  try{
    const msgs=JSON.parse(sessionStorage.getItem("gsb.thread")||"[]");
    if(!msgs.length)return false;
    msgs.forEach(m=>addMsg(m.t,m.c,m.r.replace(/^Source: /,""),true));
    return true;
  }catch(e){return false;}
}
function addMsg(t,c,ref,quiet){
  const d=document.createElement("div");d.className="msg "+c;d.textContent=t;''')
js = js.replace('  $("aiM").appendChild(d);$("aiM").scrollTop=$("aiM").scrollHeight;\n}',
                '  $("aiM").appendChild(d);$("aiM").scrollTop=$("aiM").scrollHeight;\n  if(!quiet)saveThread();\n}')
js = js.replace('  if($("aiM"))addMsg("Ask me anything',
                '  if($("aiM")&&!restoreThread())addMsg("Ask me anything')


# ---------------------------------------------------------------------
# Sub-feature pages reuse the dialog content: when a page provides a
# #pageBody container, openModal() renders into the page instead of a
# modal, so buyer login / seller / licence need no duplicate markup.
# ---------------------------------------------------------------------
js = js.replace('function openModal(t,h){',
"""let RENDER_TO_PAGE=false;
function openModal(t,h){
  if(RENDER_TO_PAGE){
    const el=$("pageBody");
    if(el){el.innerHTML='<div class="s-head"><h2>'+t+'</h2></div>'+h;return;}
  }""",1)

js = js.replace("/* ===== deep links",
"""/* ===== landing page: three live proof teasers =====
   These reuse sha256(), relax() and the tier logic rather than duplicating them. */
function proofSeal(){
  const el=$("pf_kpi"); if(!el) return;
  const SEALED="\u2264 60 min";
  const live=sha256(JSON.stringify({target:el.value}));
  const ref =sha256(JSON.stringify({target:SEALED}));
  $("pf_hash").textContent=live;
  const ok=live===ref, st=$("pf_state");
  st.className="ministate "+(ok?"ok":"bad");
  st.textContent=ok?"\u2713 Matches the published seal":"\u26a0 Seal broken \u2014 the bar moved, and anyone can prove it";
}
function proofRisk(){
  const el=$("pf_risk"); if(!el) return;
  const v=parseInt(el.value,10);
  const r=v<=5?["Full relaxation lawful","ok"]
        :v<=11?["Partial relaxation","warn"]
              :["No relaxation \u2014 shrink the pilot instead","bad"];
  const st=$("pf_relax");
  st.className="ministate "+r[1];
  st.textContent=v+"/20 \u00b7 "+r[0];
}
function proofTier(){
  const el=$("pf_case"); if(!el) return;
  const m={gr:["Tier 1 \u2014 Proprietary Article Certificate","ok"],
           nogr:["Tier 3 \u2014 Tier 1 needs a state GR, so it falls back","warn"],
           multi:["Tier 2 \u2014 limited tender to the winners","ok"],
           wide:["Tier 3 \u2014 GeM catalogue replication","ok"],
           fail:["No route \u2014 and that is the system working","bad"]}[el.value];
  const st=$("pf_tier");
  st.className="ministate "+m[1];
  st.textContent=m[0];
}
function initProof(){
  if(!$("pf_kpi")) return;
  proofSeal(); proofRisk(); proofTier();
}

/* ===== sub-feature pages: one feature, one URL ===== */
function initSubPage(){
  const cfg=window.PAGE_FEATURE;
  if(!cfg)return;
  if(cfg.marketType!==undefined&&$("mtype")){
    $("mtype").value=cfg.marketType;                 // Product / Service / Skill page
    const w=$("mtype").closest(".mktfilters"); if(w)w.classList.add("filtered");
    renderMarket();
  }
  if(cfg.skill&&$("skillPane")){skillTab(cfg.skill);}
  if(cfg.res&&$("resPane")){resTab(cfg.res);}
  if(cfg.dialog){                                    // buyer login / seller / licence
    RENDER_TO_PAGE=true;
    if(cfg.dialog==="seller")openSeller(cfg.arg||0);
    else if(cfg.dialog==="licence")openLicence();
    else if(cfg.dialog==="becomeSeller")openModal("Become a seller",SELLER_HTML);
    else openLogin(cfg.dialog);
    RENDER_TO_PAGE=false;
  }
}

/* ===== deep links""",1)
js = js.replace("  applyHash();\n  paintStepPage();","  initSubPage();\n  applyHash();\n  paintStepPage();",1)
js = js.replace("  initSubPage();\n", "  initSubPage();\n  initProof();\n", 1)
# the regrouped navigation needs its own Marathi strings
js = js.replace(' nav_run:["Run a challenge","\u0906\u0935\u094d\u0939\u093e\u0928 \u091a\u093e\u0932\u0935\u093e"],',
 ' nav_run:["Run a challenge","\u0906\u0935\u094d\u0939\u093e\u0928 \u091a\u093e\u0932\u0935\u093e"],\n'
 ' nav_mech:["The mechanism","\u092f\u0902\u0924\u094d\u0930\u0923\u093e"],\n'
 ' nav_ev:["Evidence &amp; rules","\u092a\u0941\u0930\u093e\u0935\u0947 \u0935 \u0928\u093f\u092f\u092e"],\n'
 ' nav_dept:["Department services","\u0935\u093f\u092d\u093e\u0917\u0940\u092f \u0938\u0947\u0935\u093e"],', 1)

# the films do not exist yet; an inert play button reads as broken
js = js.replace('`<button class="vid" onclick="playVideo(${i})">',
                '`<button class="vid soon" onclick="playVideo(${i})">')
js = js.replace('<span class="pl" aria-hidden="true">\u25b6</span><span class="dur">${esc(v[1])}</span>',
                '<span class="pl" aria-hidden="true">Script ready</span><span class="dur">${esc(v[1])}</span>')

open(APP,"w",encoding="utf-8").write(js)
print("navigation rewritten for multi-page")
