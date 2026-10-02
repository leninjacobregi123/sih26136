const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path');
const ROOT="/home/lenin/Apps Developed/SIH 26136/docs";
const css=fs.readFileSync(path.join(ROOT,"assets/style.css"),"utf8");
const app=fs.readFileSync(path.join(ROOT,"assets/app.js"),"utf8");
let pass=0,fail=0;
const ck=(l,c,x="")=>{c?(pass++,console.log("PASS  "+l)):(fail++,console.log("FAIL  "+l+(x?"  <- "+x:"")));};
const store={},sess={};
const mk=o=>({getItem:k=>(k in o?o[k]:null),setItem:(k,v)=>{o[k]=String(v)},removeItem:k=>{delete o[k]},clear:()=>{for(const k in o)delete o[k]}});
function open_(p,hash=""){
  const html=fs.readFileSync(path.join(ROOT,p),"utf8")
    .replace('<link rel="stylesheet" href="assets/style.css">',`<style>${css}</style>`)
    .replace('<script src="assets/app.js"></script>',`<script>${app}</script>`);
  return new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost/"+p+hash,
    virtualConsole:new VirtualConsole(),beforeParse(w){
      Object.defineProperty(w,"localStorage",{value:mk(store),configurable:true});
      Object.defineProperty(w,"sessionStorage",{value:mk(sess),configurable:true});
      w.scrollTo=()=>{};
      w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;}});   // jsdom 11 omits them; every browser has them
}
const fire=(w,el,t)=>el.dispatchEvent(new w.Event(t,{bubbles:true}));

console.log("--- KPI seal + tamper (step 1) ---");
let d=open_("step-1-define-the-problem.html"),w=d.window,c=w.document;
const h0=c.getElementById("sealHx").textContent.trim();
w.doSeal();
ck("seal captures the live hash", c.getElementById("sealHx").textContent.includes(h0));
const kt=c.querySelectorAll("#kpiList .kpi-row")[0].querySelectorAll("input")[2];
kt.value="≤ 85 min"; fire(w,kt,"input");
ck("editing after sealing breaks the seal", c.getElementById("sealBox").className.includes("broken"));
ck("both hashes shown when broken", (c.getElementById("sealHx").textContent.match(/[0-9a-f]{64}/g)||[]).length===2);
kt.value="≤ 60 min"; fire(w,kt,"input");
ck("repairing the text restores the seal", c.getElementById("sealBox").className.includes("ok"));
d.window.close();

console.log("--- risk ladder (step 2) ---");
d=open_("step-2-cap-the-risk.html");w=d.window;c=w.document;
const setR=o=>{Object.entries(o).forEach(([k,v])=>c.getElementById("a_"+k).value=v);w.calc();};
setR({users:0,sys:0,data:0,rev:0,exit:0});
ck("min risk -> full relaxation", c.getElementById("rVerdict").textContent.includes("Full"));
setR({users:4,sys:4,data:4,rev:4,exit:4});
ck("max risk -> none, and says shrink the pilot",
   c.getElementById("rVerdict").textContent.includes("None") && c.getElementById("rVerdict").textContent.includes("shrink the pilot"));
setR({users:1,sys:1,data:1,rev:0,exit:1}); d.window.close();

console.log("--- tier router (step 6) ---");
d=open_("step-6-buy-it-lawfully.html");w=d.window;c=w.document;
const route=(r,sc,gr)=>{w.setResult(r);c.getElementById("f_scope").value=sc;c.getElementById("f_gr").value=gr;w.sync();
  const on=[...c.querySelectorAll("#tiers .tier.on h4")];return on.length?on[0].textContent.trim():"none";};
ck("multi winners -> Tier 2", route("multi","same","0").startsWith("Tier 2"));
ck("cross-department -> Tier 3", route("pass","wide","1").startsWith("Tier 3"));
ck("failure -> no route, framed as the system working",
   route("fail","same","1")==="none" && c.getElementById("finalOut").textContent.includes("system working"));
d.window.close();

console.log("--- portal features on their own pages ---");
d=open_("grievance.html");w=d.window;c=w.document;
c.getElementById("gv_txt").value="Milestone three payment has not been sanctioned."; w.fileGrievance();
ck("grievance ticket raised", c.querySelectorAll("#grvList .ticket").length===1);
ck("payment ticket gets the 7-day clock", c.getElementById("grvList").textContent.includes("7-day"));
d.window.close();
d=open_("where-it-runs.html");w=d.window;c=w.document;
ck("six revenue divisions", c.querySelectorAll("#divGrid .divcard").length===6);
ck("photo strip with credits", c.querySelectorAll(".photostrip .mphoto").length===6 &&   // one per revenue division
   c.querySelector(".photocredit").textContent.includes("CC BY-SA"));
d.window.close();
d=open_("skill-gap.html");w=d.window;c=w.document;
ck("skill gap bars render", c.querySelectorAll("#gapBars .brow").length===6);
d.window.close();

console.log("--- accessibility controls survive on every page ---");
d=open_("about.html");w=d.window;c=w.document;
w.toggleHC(); ck("high contrast toggles", c.body.classList.contains("hc"));
w.toggleLang(); ck("Marathi toggles", c.documentElement.lang==="mr" && c.getElementById("navlinks").textContent.includes("यंत्रणा"));
ck("page breadcrumb not clobbered by the language switch",
   c.querySelector('[data-i18n="crumb"]').textContent.trim().length>0);
w.toggleLang(); w.toggleHC();
d.window.close();
d=open_("contact.html");w=d.window;c=w.document;
ck("contrast choice persisted across navigation", store["gsb.hc"]==="0");
ck("assistant thread restored across navigation", c.querySelectorAll("#aiM .msg").length>=1);
d.window.close();

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail?1:0);
