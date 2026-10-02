const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path');
const ROOT="/home/lenin/Apps Developed/SIH 26136/docs";
const css=fs.readFileSync(path.join(ROOT,"assets/style.css"),"utf8");
const app=fs.readFileSync(path.join(ROOT,"assets/app.js"),"utf8");
const pages=fs.readdirSync(ROOT).filter(f=>f.endsWith(".html")).sort();
let pass=0,fail=0;
const ck=(l,c,x="")=>{c?(pass++):(fail++,console.log("  FAIL  "+l+(x?"  <- "+x:"")));};

// what each page must render, beyond the shared chrome
const EXPECT={
 "index.html":            [".hero h1", "#gap .card", "#idea .contract", ".stepstrip .stepchip", ".proofcard .minidemo", ".doorgrid .door"],
 "department-services.html":[".deptgroup", ".deptcard"],
 "why-its-hard.html":     ["#why .rev", ".strip [data-count]"],
 "run-a-challenge.html":  ["#steps a", ".stage .card"],
 "where-it-runs.html":    ["#divGrid .divcard", ".photostrip .mphoto", ".warli-medallion",
                          "#mumbaiPlay .mp-f", "#mumbaiPlay .mp-dot"],
 "marketplace.html":      ["#mktGrid .lcard", "#catChips .chip"],
 "skills.html":           ["#skillPane .card"],
 "schemes.html":          ["#schemeList .lcard"],
 "skill-gap.html":        ["#gapBars .brow", "#gapCards .card"],
 "training.html":         ["#trainGrid .lcard", "#vidGrid .vid"],
 "resources.html":        ["#resPane .lcard"],
 "rule-book.html":        ["#ruleAcc .acc"],
 "judges-questions.html": ["#qaAcc .acc"],
 "help.html":             ["#helpAcc .acc"],
 "about.html":            ["#about .card"],
 "grievance.html":        ["#grvList", "#gv_txt"],
 "contact.html":          [".contact-grid .cbox"],
};
Object.assign(EXPECT,{
 "categories.html":       ["#catChips .chip","#mktGrid .lcard"],
 "products.html":         ["#mktGrid .lcard"],
 "services.html":         ["#mktGrid .lcard"],
 "skill-purchase.html":   ["#mktGrid .lcard"],
 "sellers.html":          ["#pageBody .kv"],
 "licence.html":          ["#pageBody table"],
 "become-a-seller.html":  ["#pageBody .steps-mini"],
 "buyer-login.html":      ["#pageBody .otpwrap"],
 "buyer-registration.html":["#pageBody input"],
 "buyer-background.html": ["#pageBody .tick"],
 "skill.html":            ["#skillPane .card"],
 "employment.html":       ["#skillPane .card"],
 "entrepreneurship.html": ["#skillPane .card"],
 "templates.html":        ["#resPane .lcard"],
 "government-laws.html":  ["#resPane .lcard"],
 "working-reports.html":  ["#resPane .lcard"],
 "apps.html":             ["#resPane .appcard"],
 "training-videos.html":  ["#vidGrid .vid"],
});
for(let i=1;i<=6;i++) EXPECT[`step-${i}-${["define-the-problem","cap-the-risk","see-whos-eligible","design-the-pilot","run-and-validate","buy-it-lawfully"][i-1]}.html`]=["#steps a","#railList dt",".pane"];

(async()=>{
for(const p of pages){
  const html=fs.readFileSync(path.join(ROOT,p),"utf8")
      .replace('<link rel="stylesheet" href="assets/style.css">',`<style>${css}</style>`)
      .replace('<script src="assets/app.js"></script>',`<script>${app}</script>`);
  const errs=[];const vc=new VirtualConsole();
  vc.on("jsdomError",e=>errs.push(e.message.split("\n")[0]));
  const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost/"+p,virtualConsole:vc,
    beforeParse(w){w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;}});   // jsdom 11 omits them; every browser has them
  const d=dom.window.document;
  await new Promise(r=>setTimeout(r,60));
  ck(`${p}: no runtime errors`, errs.length===0, errs[0]);
  ck(`${p}: chrome present`, !!d.querySelector(".emb-nat-w, .utility .emb")   // the landing page folds its chrome into one row
     && !!d.querySelector("header.site nav") && !!d.querySelector("footer") && !!d.querySelector(".govfoot")
     && !!d.getElementById("aiP") && !!d.getElementById("modal"));
  if(p==="where-it-runs.html"){
    const fr=d.querySelectorAll("#mumbaiPlay .mp-f");
    const on=d.querySelectorAll("#mumbaiPlay .mp-f[data-on]");
    const dot=d.querySelector('#mumbaiPlay .mp-dot[aria-current="true"]');
    ck("mumbai: six frames", fr.length===6, fr.length+" frames");
    ck("mumbai: exactly one frame showing", on.length===1, on.length+" showing");
    ck("mumbai: the dot follows the frame",
       !!dot && on.length===1 && dot.getAttribute("data-go")===on[0].getAttribute("data-i"),
       dot?dot.getAttribute("data-go"):"no current dot");
    ck("mumbai: the photograph is credited",
       /Wikimedia Commons/.test((d.getElementById("mpCredit")||{}).textContent||""),
       ((d.getElementById("mpCredit")||{}).textContent||"").slice(0,40));
    const pause=d.getElementById("mpToggle");
    ck("mumbai: play/pause is a real control",
       !!pause && pause.hasAttribute("aria-pressed"), "no aria-pressed");
  }
  const cur=d.querySelectorAll('#navlinks [aria-current="page"]');
  ck(`${p}: <=1 nav item marked current`, cur.length<=1, cur.length+" marked");
  // search must be present and correct on every page
  ck(`${p}: header search present`, !!d.getElementById("hdrSearch") && !!d.getElementById("hdrResults"));
  if(typeof dom.window.searchSite === "function"){
    const q=(t)=>dom.window.searchSite(t).map(x=>x.u);
    if(p==="index.html"){
      ck("search: '173' finds the risk ladder or rule book",
         ["step-2-cap-the-risk.html","rule-book.html"].includes(q("173")[0]), q("173")[0]);
      ck("search: 'tier 3' finds step 6", q("tier 3")[0]==="step-6-buy-it-lawfully.html", q("tier 3")[0]);
      ck("search: 'nashik' finds where it runs", q("nashik")[0]==="where-it-runs.html", q("nashik")[0]);
      ck("search: 'seal' finds step 1", q("seal")[0]==="step-1-define-the-problem.html", q("seal")[0]);
      ck("search: nonsense returns nothing", q("zzqqxx").length===0);
    }
  } else if(p==="index.html"){ ck("search: searchSite is defined", false, "missing"); }

  for(const sel of (EXPECT[p]||[])){
    ck(`${p}: renders ${sel}`, d.querySelectorAll(sel).length>0);
  }
  dom.window.close();
}
console.log(`\n=== ${pass} passed, ${fail} failed across ${pages.length} pages ===`);
process.exit(fail?1:0);
})();
