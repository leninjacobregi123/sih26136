const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('fs'),path=require('path');
const ROOT="/home/lenin/Apps Developed/SIH 26136/docs";
const css=fs.readFileSync(path.join(ROOT,"assets/style.css"),"utf8");
const app=fs.readFileSync(path.join(ROOT,"assets/app.js"),"utf8");
let pass=0,fail=0;
const ck=(l,c,x="")=>{c?(pass++,console.log("PASS  "+l)):(fail++,console.log("FAIL  "+l+(x?"  <- "+x:"")));};
// one shared localStorage/sessionStorage across "navigations", like a real browser
const store={}, sess={};
const mkStore=o=>({getItem:k=>(k in o?o[k]:null),setItem:(k,v)=>{o[k]=String(v)},
                   removeItem:k=>{delete o[k]},clear:()=>{for(const k in o)delete o[k]}});
function open_(p,hash=""){
  const html=fs.readFileSync(path.join(ROOT,p),"utf8")
    .replace('<link rel="stylesheet" href="assets/style.css">',`<style>${css}</style>`)
    .replace('<script src="assets/app.js"></script>',`<script>${app}</script>`);
  return new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,
    url:"http://localhost/"+p+hash,virtualConsole:new VirtualConsole(),
    beforeParse(w){   // shared storage, so pages behave like one browser session
      Object.defineProperty(w,"localStorage",{value:mkStore(store),configurable:true});
      Object.defineProperty(w,"sessionStorage",{value:mkStore(sess),configurable:true});
      w.scrollTo=()=>{};
      w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;   // jsdom 11 omits them; every browser has them
    }});
}
console.log("--- state carries across page loads ---");
let d=open_("step-1-define-the-problem.html");
d.window.doSeal();
const sealed=d.window.document.getElementById("sealHx").textContent.trim();
ck("step 1: seal produced", /^[0-9a-f]{64}$/.test(sealed));
ck("step 1: state written to localStorage", !!store["gsb.v2"]);
d.window.close();

d=open_("step-2-cap-the-risk.html");
let doc=d.window.document;
ck("step 2: rail carries the sealed challenge", doc.getElementById("railList").textContent.includes("sealed indicators"));
ck("step 2: seal shown intact on the rail", doc.getElementById("railSeal").textContent.includes("intact"));
["a_users","a_sys","a_data","a_rev","a_exit"].forEach(k=>doc.getElementById(k).value="4");
d.window.calc();
ck("step 2: max risk -> no relaxation", doc.getElementById("rVerdict").textContent.includes("None"));
d.window.close();

d=open_("step-3-see-whos-eligible.html");
doc=d.window.document;
const blockedHigh=doc.querySelectorAll("#picks .pick.blocked").length;
ck("step 3: risk cap from step 2 carried over", doc.getElementById("railList").textContent.includes("20/20"),
   doc.getElementById("railList").textContent.match(/\d+\/20/)||"");
ck("step 3: eligibility reflects that cap", blockedHigh===0, blockedHigh+" blocked at max cap");
d.window.pickFirm(0);
d.window.close();

d=open_("step-4-design-the-pilot.html");
doc=d.window.document;
ck("step 4: startup choice carried over", doc.getElementById("railList").textContent.includes("QueueSense"));
d.window.close();

d=open_("step-5-run-and-validate.html");
doc=d.window.document;
for(let i=0;i<4;i++) d.window.advanceMs();
d.window.setResult("pass");
ck("step 5: milestones released", doc.querySelectorAll("#msRun .ms.on").length===4);
d.window.close();

d=open_("step-6-buy-it-lawfully.html");
doc=d.window.document;
ck("step 6: validator result carried over", doc.getElementById("railList").textContent.includes("Met the criteria"));
doc.getElementById("f_scope").value="same"; doc.getElementById("f_gr").value="0"; d.window.sync();
ck("step 6: routes to Tier 3 fallback", doc.getElementById("finalOut").textContent.includes("single policy ask"));
doc.getElementById("f_gr").value="1"; d.window.sync();
ck("step 6: GR in force -> Tier 1", [...doc.querySelectorAll("#tiers .tier.on h4")][0].textContent.includes("Tier 1"));
d.window.close();

console.log("\n--- deep links open the right tab ---");
const deep=[["marketplace.html","#skill","mtype","skill"],
            ["skills.html","#employment","st-employment",null],
            ["resources.html","#laws","rt-laws",null]];
for(const [p,h,id,val] of deep){
  const dd=open_(p,h); const dc=dd.window.document;
  dd.window.applyHash();
  if(val!==null) ck(`${p}${h} sets the filter`, dc.getElementById(id).value===val, dc.getElementById(id).value);
  else ck(`${p}${h} activates the tab`, dc.getElementById(id).getAttribute("aria-selected")==="true");
  dd.window.close();
}
console.log("\n--- session behaviour ---");
sess["gsb.counted"]=null; delete sess["gsb.counted"];
const before=parseInt(store["gsb.visits"]||"0",10);
let d1=open_("about.html"); d1.window.visitorCount(); const after1=parseInt(store["gsb.visits"],10); d1.window.close();
let d2=open_("contact.html"); d2.window.visitorCount(); const after2=parseInt(store["gsb.visits"],10); d2.window.close();
ck("visitor counter increments once per session, not per page", after1===after2 && after1>before, `${before}->${after1}->${after2}`);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail?1:0);
