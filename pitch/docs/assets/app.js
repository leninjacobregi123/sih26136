"use strict";
/* ===== SHA-256 (pure JS so it works from file://) ===== */
const SHA_K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rr=(n,x)=>(x>>>n)|(x<<(32-n));
function sha256(str){
  const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const b=new TextEncoder().encode(str),l=b.length,buf=new Uint8Array((((l+8)>>6)+1)<<6);
  buf.set(b);buf[l]=0x80;
  const dv=new DataView(buf.buffer),bits=l*8;
  dv.setUint32(buf.length-8,Math.floor(bits/4294967296));dv.setUint32(buf.length-4,bits>>>0);
  const w=new Uint32Array(64);
  for(let i=0;i<buf.length;i+=64){
    for(let t=0;t<16;t++)w[t]=dv.getUint32(i+t*4);
    for(let t=16;t<64;t++){const p=w[t-15],q=w[t-2];
      w[t]=(w[t-16]+(rr(7,p)^rr(18,p)^(p>>>3))+w[t-7]+(rr(17,q)^rr(19,q)^(q>>>10)))>>>0;}
    let a=H[0],b2=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for(let t=0;t<64;t++){
      const t1=(h+(rr(6,e)^rr(11,e)^rr(25,e))+((e&f)^(~e&g))+SHA_K[t]+w[t])>>>0;
      const t2=((rr(2,a)^rr(13,a)^rr(22,a))+((a&b2)^(a&c)^(b2&c)))>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b2;b2=a;a=(t1+t2)>>>0;
    }
    H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b2)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
  }
  return Array.from(H).map(x=>x.toString(16).padStart(8,"0")).join("");
}

/* ===== helpers ===== */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
let tTimer;
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(tTimer);tTimer=setTimeout(()=>t.classList.remove("show"),3800);}
let RENDER_TO_PAGE=false;
function openModal(t,h){
  if(RENDER_TO_PAGE){
    const el=$("pageBody");
    if(el){el.innerHTML='<div class="s-head"><h2>'+t+'</h2></div>'+h;return;}
  }if(!$("modal"))return;$("mTitle").textContent=t;$("mBody").innerHTML=h;$("modal").classList.add("open");document.body.style.overflow="hidden";}
function closeModal(){if(!$("modal"))return;$("modal").classList.remove("open");document.body.style.overflow="";}
if($("modal"))$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});
function toggleNav(){if(!$("navlinks"))return;const o=$("navlinks").classList.toggle("open");$("burger").setAttribute("aria-expanded",o);}
document.querySelectorAll("#navlinks a").forEach(a=>a.addEventListener("click",()=>$("navlinks").classList.remove("open")));
let fs=0;function setFont(d){fs=d===0?0:Math.max(-1,Math.min(2,fs+d));document.documentElement.style.fontSize=(100+fs*10)+"%";const n=$("tsN");if(n)n.setAttribute("aria-pressed",String(fs===0));}
function scrollTo_(el){if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"start"});}
function rev(btn){const o=btn.getAttribute("aria-expanded")==="true";btn.setAttribute("aria-expanded",String(!o));btn.querySelector(".hint").textContent=o?"Show the rule ▾":"Hide ▴";}

/* ===== hero derivation clicker ===== */
const DERIV=[
 ["A1","Procurement law exists to buy <b>specifiable</b> things at the lowest price under competition. Every fairness guarantee depends on describing the thing in advance."],
 ["A2","An innovation is, by definition, <b>not specifiable in advance</b>. If it were, it would be a commodity — and ordinary procurement would already work."],
 ["A3","So you cannot buy an innovation. You can only buy <b>the reduction of uncertainty about it</b> — evidence — and then buy the thing once it has become specifiable."],
 ["A4","Which makes the pilot and the deployment <b>two different purchases</b>, under two instruments. Rule 157 forces the same answer from the opposite direction."]
];
let dIdx=0,dTimer=null;
function setDeriv(i,manual){
  if(!$("dText"))return;
  dIdx=i%DERIV.length;
  $("dLab").textContent=DERIV[dIdx][0];
  $("dText").innerHTML=DERIV[dIdx][1];
  $("dCount").textContent=(dIdx+1)+" of 4";
  $("dNext").textContent=dIdx===3?"Start again ↺":"Next →";
  document.querySelectorAll(".deriv-track button").forEach((b,k)=>b.setAttribute("aria-current",String(k===dIdx)));
  if(manual!==false&&dTimer){clearInterval(dTimer);dTimer=null;}
}

/* ===== count-up strip ===== */
function countUp(){
  document.querySelectorAll("[data-count]").forEach(el=>{
    const target=parseInt(el.dataset.count,10);let n=0;
    if(target===0){el.textContent="0";return;}
    const step=Math.max(1,Math.round(target/22));
    const t=setInterval(()=>{n+=step;if(n>=target){n=target;clearInterval(t);}el.textContent=n;},34);
  });
}


/* ============================================================
   MULTI-PAGE NAVIGATION
   Each walkthrough step is its own page; PAGE_STEP is set by the
   page itself. State travels between pages in localStorage.
   ============================================================ */
const STEP_PAGES=["step-1-define-the-problem.html","step-2-cap-the-risk.html",
 "step-3-see-whos-eligible.html","step-4-design-the-pilot.html",
 "step-5-run-and-validate.html","step-6-buy-it-lawfully.html"];
const PAGE_STEP = (typeof window.PAGE_STEP==="number") ? window.PAGE_STEP : -1;

/* ============================================================
   FLOW STATE
   ============================================================ */
const DEF={
  title:"Reduce OPD waiting time at district hospitals",dept:"Public Health",dist:"Nagpur",
  out:"Cut median wait from registration to first clinician contact, with no extra sanctioned staff and no change to the existing HMIS.",
  kpis:[["Median wait, registration → clinician","94 min","≤ 60 min"],
        ["95th-percentile wait","212 min","≤ 120 min"],
        ["Patients per clinician-hour","4.1","≥ 4.1 (no drop)"],
        ["Writes to the HMIS of record","0","0 (read-only)"]],
  risk:{users:1,sys:1,data:1,rev:0,exit:1},
  sealed:null, pick:null, dataClass:1, access:0, ms:0, result:null, scope:"wide", gr:0
};
let S=JSON.parse(JSON.stringify(DEF));
let step=0;
const FEE=15, MS=[
 ["Sandbox provisioned, baseline re-measured","Independent baseline study, signed by the Civil Surgeon",3.00],
 ["Instrumentation live, read-only confirmed","Access log extract showing zero writes to the HMIS",3.75],
 ["90-day operating window complete","Raw timestamp dataset, analysis notebook, deviation log",4.50],
 ["Exit, data deletion certified","Deletion certificate under the exit annexure",3.75]
];

function save(){try{localStorage.setItem("gsb.v2",JSON.stringify({S,step}));}catch(e){}}
function load(){try{const r=JSON.parse(localStorage.getItem("gsb.v2")||"null");
  if(r&&r.S&&Array.isArray(r.S.kpis)){S=Object.assign(JSON.parse(JSON.stringify(DEF)),r.S);step=r.step||0;return true;}}catch(e){}return false;}

/* read the form into state */
function sync(){
  const v=id=>{const e=$(id);return e?e.value:null;};
  const t=v("f_title");
  if(t!==null){S.title=t;S.dept=v("f_dept");S.dist=v("f_dist");S.out=v("f_out");}
  const dc=v("f_data");
  if(dc!==null){S.dataClass=parseInt(dc,10);S.access=parseInt(v("f_acc"),10);}
  const sc=v("f_scope");
  if(sc!==null){S.scope=sc;S.gr=parseInt(v("f_gr"),10);}
  paint();
}

function payload(){
  return JSON.stringify({t:S.title,d:S.dept,x:S.dist,o:S.out,k:S.kpis,r:S.risk});
}

/* ===== step 1: KPI editor + live seal ===== */
function renderKpis(){
  if(!$("kpiList"))return;
  $("kpiList").innerHTML=S.kpis.map((k,i)=>`<div class="kpi-row">
    <input value="${esc(k[0])}" aria-label="Criterion ${i+1}" oninput="S.kpis[${i}][0]=this.value;paint()">
    <input value="${esc(k[1])}" aria-label="Baseline ${i+1}" oninput="S.kpis[${i}][1]=this.value;paint()">
    <input value="${esc(k[2])}" aria-label="Target ${i+1}" oninput="S.kpis[${i}][2]=this.value;paint()">
    <button class="kx" aria-label="Remove criterion ${i+1}" onclick="S.kpis.splice(${i},1);renderKpis();paint()">×</button>
  </div>`).join("");
}
function addKpi(){S.kpis.push(["","",""]);renderKpis();paint();}
function doSeal(){
  if(!S.kpis.some(k=>k[0]&&k[2])){toast("Add at least one criterion with a target before sealing.");return;}
  S.sealed={hash:sha256(payload()),ts:new Date().toISOString().slice(0,16).replace("T"," ")};
  paint();
  toast("Sealed. Now try editing a criterion — watch what happens.");
}
function undoSeal(){S.sealed=null;paint();toast("Unsealed. In production this would void the challenge and require re-publication.");}
function paintSeal(){
  if(!$("sealBox"))return;
  const live=sha256(payload()),box=$("sealBox");
  $("sealBtn").classList.toggle("hidden",!!S.sealed);
  $("unsealBtn").classList.toggle("hidden",!S.sealed);
  if(!S.sealed){
    box.className="seal live";
    $("sealSt").innerHTML='<span class="tag n">Not sealed yet</span>';
    $("sealHx").textContent=live;
    $("sealNote").innerHTML='This hash updates as you type. Sealing freezes it and publishes it with the challenge notice — <b>before anyone has shown you a solution</b>.';
    return;
  }
  const broken=live!==S.sealed.hash;
  box.className="seal "+(broken?"broken":"ok");
  $("sealSt").innerHTML=broken
    ? '<span class="tag r">⚠ Seal broken — criteria changed after publication</span>'
    : '<span class="tag g">✓ Sealed '+esc(S.sealed.ts)+'</span>';
  $("sealHx").innerHTML=broken
    ? '<span style="color:var(--green-t)">published&nbsp;&nbsp;'+S.sealed.hash+'</span><br><span style="color:var(--red-t)">now&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+live+'</span>'
    : S.sealed.hash;
  $("sealNote").innerHTML=broken
    ? 'Anyone holding the published notice can recompute this and prove the bar moved. The mechanism does not stop an officer editing a field — it makes an <b>undetected</b> edit impossible.'
    : 'Published with the challenge notice. Any later edit shows up here instantly.';
}

/* ===== step 2: risk ===== */
const AX={
 users:["Under 1,000 citizens","1,000 – 10,000","10,000 – 1 lakh","1 – 10 lakh","Over 10 lakh"],
 sys:["Standalone","Reads one system","Reads several systems","Writes to a department system","Writes to the system of record"],
 data:["Synthetic only","Masked / tokenised","De-identified extract","Personal data","Sensitive personal data"],
 rev:["Switch off, nothing changes","Roll back in a day","Roll back in a week","Manual clean-up needed","Effectively irreversible"],
 exit:["No lock-in","Export provided","Export needs vendor help","Proprietary format","Operational dependency"]
};
function score(){return S.risk.users+S.risk.sys+S.risk.data+S.risk.rev+S.risk.exit;}
function relax(){
  const s=score();
  if(s<=5)return{t:"Full",c:"g",short:"full relaxation",
    clause:"No prior-turnover threshold and no prior-experience requirement applies to this challenge.",
    why:"The contract itself caps the damage — small, reversible, no live personal data, no lock-in. Turnover tells you nothing the contract has not already bounded, so it is dropped entirely. The technical bar stays exactly where it is."};
  if(s<=11)return{t:"Partial",c:"a",short:"partial relaxation",
    clause:"Turnover requirement waived. Prior experience relaxed to one comparable deployment of any size, public or private.",
    why:"Real systems are touched and real (masked) data moves. Turnover is still redundant, but some delivery evidence is proportionate — so the relaxation is granted in proportion, and the reason is recorded on the challenge file."};
  return{t:"None",c:"r",short:"no relaxation",
    clause:"Standard eligibility applies. To earn relaxation, reduce the scope of the evidence phase.",
    why:"At this blast radius the contract no longer caps the risk, so the turnover proxy is doing real work and Rule 173(i) cannot be justified on this file. The fix is not to lower the bar — it is to shrink the pilot: fewer users, masked data, read-only, one taluka."};
}
function calc(){
  ["users","sys","data","rev","exit"].forEach(k=>{S.risk[k]=parseInt($("a_"+k).value,10);});
  paint();
}
function paintRisk(){
  if(!$("rScore"))return;
  ["users","sys","data","rev","exit"].forEach(k=>{$("a_"+k).value=S.risk[k];$("l_"+k).textContent=AX[k][S.risk[k]];});
  const s=score(),r=relax();
  $("rScore").innerHTML=s+'<small>/20</small>';
  $("rNeedle").style.left=(s/20*100)+"%";
  const col=r.c==="g"?"var(--green-t)":r.c==="a"?"var(--amber-t)":"var(--red-t)";
  const bg=r.c==="g"?"var(--green-s)":r.c==="a"?"var(--amber-s)":"var(--red-s)";
  $("rVerdict").style.cssText="background:"+bg+";border-color:"+col;
  $("rVerdict").innerHTML=`<b style="color:${col}">Rule 173(i) relaxation: ${r.t}</b>${r.why}
    <p style="margin-top:9px;font-size:12.5px;padding:9px 11px;background:rgba(255,255,255,.6);border-radius:7px"><b>Clause inserted into the notice:</b><br>“${esc(r.clause)}”</p>`;
}

/* ===== step 3: eligibility ===== */
const FIRMS=[
 {n:"QueueSense Systems",loc:"Nagpur",dpiit:1,first:1,risk:4,fit:94,gem:2,
  d:"Token-free OPD flow from anonymous BLE beacons and existing registration timestamps. Read-only.",
  ev:"2 trust hospitals; median wait down 41% over 90 days."},
 {n:"Setu Health Queue",loc:"Pune",dpiit:1,first:1,risk:6,fit:81,gem:0,
  d:"Marathi-first appointment nudges over SMS with slot rebalancing for walk-ins.",
  ev:"12,000 historical visits replayed; no live deployment yet."},
 {n:"MedFlow Analytics",loc:"Mumbai Suburban",dpiit:1,first:0,risk:9,fit:76,gem:1,
  d:"Staffing and triage optimiser. Writes rosters back into the hospital system.",
  ev:"3 private chains; needs write access to the HMIS."},
 {n:"CareBridge Enterprise",loc:"Nagpur",dpiit:0,first:0,risk:5,fit:68,gem:3,
  d:"Established queue-display hardware and software suite for large hospitals.",
  ev:"On the GeM catalogue already; 3 buyer ratings."},
 {n:"ShikshaTrack Labs",loc:"Statewide",dpiit:1,first:1,risk:14,fit:52,gem:0,
  d:"General-purpose citizen-record analytics. Requires live personal data across districts.",
  ev:"Two ZP blocks; escalation would be required."}
];
function eligible(f){
  const cap=score();
  if(f.risk>cap+3)return{ok:false,why:"Its delivery profile sits above the cap you set. Either it is not right for this challenge, or the challenge needs a bigger cap — which would cost you the relaxation."};
  if(!f.dpiit)return{ok:true,std:true,why:"Eligible, but not DPIIT-recognised — so Rule 173(i) does not reach it and standard turnover conditions apply."};
  const r=relax();
  if(r.t==="None")return{ok:true,std:true,why:"DPIIT-recognised, but at this risk cap no relaxation is lawful, so it competes on standard eligibility."};
  return{ok:true,std:false,why:"DPIIT-recognised and within the cap — "+r.short+" applied, EMD waived under Rule 170(i)."};
}
function paintPicks(){
  if(!$("picks"))return;
  $("picks").innerHTML=FIRMS.map((f,i)=>{
    const e=eligible(f),sel=S.pick===i;
    return `<button class="pick ${e.ok?"":"blocked"}" aria-pressed="${sel}" ${e.ok?`onclick="pickFirm(${i})"`:"disabled"}>
      <div class="ph"><span class="pn">${esc(f.n)}</span><span class="cite">${esc(f.loc)}</span></div>
      <p>${esc(f.d)}</p>
      <div class="badges">
        ${f.dpiit?'<span class="tag g">DPIIT recognised</span>':'<span class="tag n">Not DPIIT recognised</span>'}
        ${f.first?'<span class="tag v">First-time govt supplier</span>':""}
        ${f.gem>=3?'<span class="tag g">On GeM catalogue</span>':f.gem?`<span class="tag a">${f.gem}/3 GeM ratings</span>`:""}
        ${sel?'<span class="tag">✓ Selected</span>':""}
      </div>
      <div class="fit"><span class="cite">Fit</span><span class="bar"><i style="width:${f.fit}%"></i></span><span class="scr">${f.fit}%</span></div>
      <div class="why"><b style="color:${e.ok?(e.std?"var(--amber-t)":"var(--green-t)"):"var(--red-t)"}">${e.ok?(e.std?"Eligible — standard conditions":"Eligible — relaxation applied"):"Blocked by your risk cap"}</b><br>${esc(e.why)}
      <br><span class="cite">Evidence: ${esc(f.ev)}</span></div>
    </button>`;}).join("");
}
function pickFirm(i){S.pick=i;paint();toast(FIRMS[i].n+" selected. Their risk profile carries into the pilot design.");}

/* ===== step 4: sandbox + plan ===== */
function paintPilot(){
  if(!$("sbOut"))return;
  $("f_data").value=S.dataClass;$("f_acc").value=S.access;
  const escl=S.dataClass>=3||S.access>=3;
  $("sbOut").innerHTML=`<div style="padding:12px 14px;border-radius:10px;border:1px solid ${escl?"var(--red-t)":"var(--green-t)"};background:${escl?"var(--red-s)":"var(--green-s)"}">
      <b style="color:${escl?"var(--red-t)":"var(--green-t)"};font-size:13.5px">${escl?"Escalation — needs a written justification":"Within the default sandbox policy"}</b>
      <p style="font-size:12.5px;margin-top:5px">${escl
        ?"Live personal data, or write access to a system of record, is never the starting point. It needs a recorded justification from the department, and it pushes the risk cap up — which costs you part of the eligibility relaxation."
        :"The department stays Data Fiduciary; the startup is only a Data Processor, and the department's accountability does not travel with the data."}</p></div>
    <p class="cite" style="margin-top:9px">Applied automatically under DPDP Rule 6: purpose limitation · encryption or masking · access control with logging · breach notice to the department · no sub-processing · deletion or return on exit.</p>`;
  $("feeTag").textContent="₹"+FEE.toFixed(2)+" lakh total";
  $("msPlan").innerHTML=MS.map((m,i)=>`<div class="ms"><span class="dot">${i+1}</span>
    <div><b>${esc(m[0])}</b><span>Closed by: ${esc(m[1])}</span></div><span class="amt">₹${m[2].toFixed(2)} L</span></div>`).join("");
}

/* ===== step 5: run + validate ===== */
function advanceMs(){
  if(S.ms<MS.length){S.ms++;paint();
    toast(S.ms<MS.length?"Evidence accepted. Sanction packet assembled and handed to the treasury route.":"Final milestone closed. Over to the validator.");}
}
function paintRun(){
  if(!$("msRun"))return;
  $("msRun").innerHTML=MS.map((m,i)=>{
    const done=i<S.ms;
    return `<div class="ms ${done?"on":""}"><span class="dot">${done?"✓":i+1}</span>
      <div><b>${esc(m[0])}</b><span>${done?"Evidence accepted · packet sent for sanction":"Awaiting: "+esc(m[1])}</span></div>
      <span class="amt">₹${m[2].toFixed(2)} L</span></div>`;}).join("");
  $("msBtn").classList.toggle("hidden",S.ms>=MS.length);
  const done=S.ms>=MS.length;
  renderEvidencePassport(false);
  if(!done){
    $("valOut").innerHTML=`<p style="font-size:13px;color:var(--muted)">The validator — <b>IIT Bombay CTARA</b>, named back at step 1 — cannot start until the evidence phase closes. Release all four milestones first.</p>
      <p class="cite" style="margin-top:8px">Naming the validator before any results exist is the whole point. A validator chosen afterwards is chosen knowing what the results are.</p>`;
    return;
  }
  const live=sha256(payload()),intact=S.sealed&&live===S.sealed.hash;
  $("valOut").innerHTML=`
    <div style="padding:12px 14px;border-radius:10px;margin-bottom:12px;border:1px solid ${intact?"var(--green-t)":"var(--red-t)"};background:${intact?"var(--green-s)":"var(--red-s)"}">
      <b style="color:${intact?"var(--green-t)":"var(--red-t)"};font-size:13.5px">${intact?"✓ Seal verified — criteria are the ones published":(S.sealed?"⚠ Seal mismatch — the criteria were changed after publication":"⚠ No seal on file — nothing to check the evidence against")}</b>
      <p style="font-size:12.5px;margin-top:5px">${intact?"The validator recomputes the hash before looking at a single number, and only then assesses the evidence against those criteria.":(S.sealed?"The validator stops here and reports the discrepancy. No scale-up decision can be made on criteria that moved.":"Go back to step 1 and seal the challenge.")}</p>
    </div>
    <p style="font-size:13px;margin-bottom:9px"><b>What did the validator find?</b> <span class="cite">(this decides which purchase route is lawful)</span></p>
    <div class="choices">
      <button class="choice" aria-pressed="${S.result==="pass"}" onclick="setResult('pass')">Met the criteria</button>
      <button class="choice" aria-pressed="${S.result==="multi"}" onclick="setResult('multi')">Two startups met them</button>
      <button class="choice" aria-pressed="${S.result==="fail"}" onclick="setResult('fail')">Missed the criteria</button>
    </div>`;
  renderEvidencePassport(intact);
}
function setResult(r){S.result=r;paint();toast(r==="fail"?"Recorded as failed. Watch what step 6 does with that.":"Recorded. Step 6 will pick the lawful route.");}

function renderEvidencePassport(intact){
  if(!$("passportBody"))return;
  const f=FIRMS[S.pick]||FIRMS[0], verified=S.ms>=MS.length&&!!S.result&&!!intact;
  const validation=S.result==="pass"?"Met the criteria":S.result==="multi"?"Two startups met them":S.result==="fail"?"Missed the criteria":"Awaiting validator";
  const payment=S.ms===0?"Not started":S.ms<MS.length
    ?`${S.ms} of ${MS.length} milestones accepted · ₹${MS.slice(0,S.ms).reduce((a,b)=>a+b[2],0).toFixed(2)} L packeted`
    :"Evidence phase complete · ₹"+FEE.toFixed(2)+" L packet assembled";
  const adoption=S.result==="pass"||S.result==="multi"?"Pending deployment and adoption measurement":"Not applicable until validation succeeds";
  $("passportBody").innerHTML=`<div class="grid g2" style="gap:10px">
    <div><span class="cite">Record status</span><b style="display:block;color:${verified?"var(--green-t)":"var(--muted)"}">${verified?"Verified evidence record":"Draft evidence record"}</b></div>
    <div><span class="cite">Challenge</span><b style="display:block">${esc(S.title)}</b></div>
    <div><span class="cite">Baseline → target</span><b style="display:block">${esc(S.kpis[0][1])} → ${esc(S.kpis[0][2])}</b></div>
    <div><span class="cite">Startup / validator</span><b style="display:block">${esc(f.n)} · IIT Bombay CTARA</b></div>
    <div><span class="cite">Validation outcome</span><b style="display:block">${validation}</b></div>
    <div><span class="cite">Payment trace</span><b style="display:block">${payment}</b></div>
    <div><span class="cite">Adoption measurement</span><b style="display:block">${adoption}</b></div>
    <div><span class="cite">Reuse status</span><b style="display:block">${verified?"Ready for procurement and cross-department review":"Locked until seal and validation pass"}</b></div>
  </div>
  <p class="cite" style="margin-top:11px">The passport is the portable evidence layer: another department can review the baseline, controls, milestones and validator outcome without relying on a promise or an informal success story.</p>`;
}

/* ===== step 6: tier routing ===== */
const TIERS=[
 {id:1,n:"Tier 1 — Proprietary Article Certificate",
  s:"One winner, same department.",
  r:"The programme authority deems the validated solution proprietary; the department buys against a PAC.",
  a:"GFR Rule 166(i), reached the way DAP 2020 reaches it for iDEX winners. Needs the state deeming GR."},
 {id:2,n:"Tier 2 — Limited tender to the winners",
  s:"Several winners, same department.",
  r:"Limited tender restricted to the cohort that actually proved the outcome. Competition preserved.",
  a:"Modelled directly on the iDEX multi-winner provision in DAP 2020 Chapter III."},
 {id:3,n:"Tier 3 — GeM catalogue replication",
  s:"Spreading to other departments or districts.",
  r:"The pilot doubles as the GeM Startup Runway trial. At three buyer ratings the product joins the full catalogue — after which any department buys it with no tender at all.",
  a:"GeM Startup Runway listing procedure, with GFR 173(i) and 170(i) supplying the entry waivers."}
];
function pickTier(){
  if(!S.result||S.result==="fail")return 0;
  if(S.scope==="wide")return 3;
  if(S.result==="multi")return 2;
  return S.gr?1:3;
}
function paintTiers(){
  if(!$("tiers"))return;
  $("f_scope").value=S.scope;$("f_gr").value=String(S.gr);
  const t=pickTier(),f=FIRMS[S.pick]||FIRMS[0];
  let box="";
  if(!S.result){
    box=`<div class="outcome" style="border-color:var(--line);background:var(--w)"><b>Nothing to route yet</b><p style="color:var(--muted)">Finish step 5 — release the milestones and record what the validator found.</p></div>`;
  }else if(S.result==="fail"){
    box=`<div class="outcome" style="border-color:var(--red-t);background:var(--red-s)"><b style="color:var(--red-t)">No route — and that is the system working</b>
      <p>Nothing is bought. The department spent ₹${FEE.toFixed(2)} lakh of evidence money to learn that, instead of a deployment budget. That is exactly what the pilot fee is for: it buys the <b>right</b>, not the obligation, to proceed.</p>
      <p style="margin-top:8px">The sealed criteria are what let a department report this honestly instead of quietly declaring success.</p></div>`;
  }else if(t===3&&S.scope==="same"&&!S.gr){
    box=`<div class="outcome" style="border-color:var(--amber-t);background:var(--amber-s)"><b style="color:var(--amber-t)">Tier 1 is what you want — and it isn't available</b>
      <p>One winner in one department is the Tier 1 case. But the deeming GR has not been issued, and "won our challenge" is not a lawful ground under Rule 166. <b>The platform will not invent one.</b> It routes you to Tier 3 instead, which needs no GR at all.</p>
      <p style="margin-top:8px"><b>This is the mechanism's single policy ask:</b> one state Government Resolution, already precedented inside the same government by DAP 2020.</p></div>`;
  }else{
    const extra=t===3
      ? (f.gem>=3?"This product already holds three government buyer ratings, so it moves to the full GeM catalogue — and any department in India can then buy it off-catalogue."
                 :`It holds ${f.gem} of the 3 buyer ratings needed. The platform schedules the remaining ${3-f.gem} pilot${3-f.gem===1?"":"s"} as Startup Runway trials, so the ratings come out of work that was happening anyway.`)
      : t===2?"Competition survives, and it is contested only between firms that have all actually delivered the outcome. No GR needed."
      : "The deeming GR is in force, so Rule 166(i) is reachable with a Proprietary Article Certificate.";
    box=`<div class="outcome" style="border-color:var(--green-t);background:var(--green-s)"><b style="color:var(--green-t)">Routed to Tier ${t}</b><p>${esc(extra)}</p></div>`;
  }
  $("finalOut").innerHTML=box;
  $("tiers").innerHTML=TIERS.map(x=>`<div class="tier ${x.id===t?"on":""}">
    <div class="th"><h4>${esc(x.n)}</h4>${x.id===t?'<span class="tag g">Selected</span>':'<span class="tag n">Not applicable</span>'}</div>
    <p><b>${esc(x.s)}</b> ${esc(x.r)}</p><span class="anc">${esc(x.a)}</span></div>`).join("");
}

/* ===== side rail + navigation ===== */
function paintRail(){
  if(!$("railList"))return;
  const r=relax(),f=FIRMS[S.pick],t=pickTier();
  const rows=[
    ["Challenge",S.title||"—"],
    ["Department",S.dept+" · "+S.dist],
    ["Criteria",S.kpis.filter(k=>k[0]).length+" sealed indicators"],
    ["Risk cap",score()+"/20 — "+r.t.toLowerCase()+" relaxation"],
    ["Startup",f?f.n:null],
    ["Sandbox",["Synthetic","Masked","De-identified","Live personal"][S.dataClass]+" · "+["read-only, taluka","read-only, district","write to staging","write to live"][S.access]],
    ["Milestones",S.ms+" of "+MS.length+" released · ₹"+MS.slice(0,S.ms).reduce((a,b)=>a+b[2],0).toFixed(2)+" L"],
    ["Validator",S.result?({pass:"Met the criteria",multi:"Two startups met them",fail:"Missed the criteria"})[S.result]:null],
    ["Route",S.result?(t?("Tier "+t):"No purchase"):null]
  ];
  $("railList").innerHTML=rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd class="${v?"":"dim"}">${esc(v||"not set yet")}</dd>`).join("");
  const live=sha256(payload());
  $("railSeal").innerHTML=!S.sealed
    ? '<span class="tag n">Not sealed</span>'
    : (live===S.sealed.hash
        ? '<span class="tag g">✓ Seal intact</span><div class="cite" style="margin-top:6px;word-break:break-all">'+S.sealed.hash.slice(0,24)+'…</div>'
        : '<span class="tag r">⚠ Seal broken</span><div class="cite" style="margin-top:6px">criteria changed after publication</div>');
}
function go(n){
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

function done(i){
  return [!!S.sealed, score()>0||true, S.pick!==null, true, S.ms>=MS.length&&!!S.result, !!S.result][i];
}
function startFlow(){location.href=STEP_PAGES[0];}
function resetFlow(){S=JSON.parse(JSON.stringify(DEF));try{localStorage.removeItem("gsb.v2");}catch(e){}
  if(PAGE_STEP!==0){location.href=STEP_PAGES[0];return;}
  if($("f_title")){$("f_title").value=S.title;$("f_out").value=S.out;$("f_dept").value=S.dept;$("f_dist").value=S.dist;}
  renderKpis();go(0);toast("Reset to the starting example.");}
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){closeModal();if($("aiP").classList.contains("open"))toggleAI();}
  const tag=(e.target.tagName||"").toLowerCase();
  if(tag==="input"||tag==="textarea"||tag==="select")return;
  if(PAGE_STEP>=0){
    if(e.key==="ArrowRight"&&PAGE_STEP<5)go(PAGE_STEP+1);
    if(e.key==="ArrowLeft"&&PAGE_STEP>0)go(PAGE_STEP-1);
  }
});

/* master repaint */
function paint(){
  paintSeal();paintRisk();paintPicks();paintPilot();paintRun();paintTiers();paintRail();
  document.querySelectorAll("#steps button").forEach((b,i)=>b.classList.toggle("done",done(i)));
  save();
}

/* ============================================================
   RULE BOOK + JUDGE'S QUESTIONS (accordions)
   ============================================================ */
const RULES=[
 ["GFR Rule 173(i)","Startups' turnover and experience may be relaxed — if the document says so",
  "“The condition of prior turnover and prior experience may be relaxed for Startups (as defined by Department for Promotion of Industry and Internal Trade) subject to meeting of quality &amp; technical specifications and making suitable provisions in the bidding document.”",
  "Used at <b>step 2 and step 3</b>. The relaxation is not automatic — it exists only if the challenge document provides for it, and the technical bar cannot be lowered with it. So the platform writes the clause in for you, at the level your risk cap justifies."],
 ["GFR Rule 170(i)","No bid security from startups or small enterprises",
  "Bid security is obtained from bidders “except Micro and Small Enterprises … or Startups as recognized by Department for Promotion of Industry and Internal Trade”.",
  "Used at <b>step 3</b>. A second, separate relaxation that is easy to miss — EMD is waived at entry, which removes a real cash barrier for a first-time supplier."],
 ["GFR Rule 166","Single-source buying is allowed on three grounds, and winning is not one",
  "Permitted only where the firm is the sole manufacturer, an emergency requires a named source, or standardisation with existing equipment demands it — supported by a Proprietary Article Certificate.",
  "This is why <b>step 6</b> exists at all. A direct award to your pilot winner is not lawful, so the mechanism provides three routes and picks between them instead of assuming one."],
 ["GFR Rule 157","No slicing a big purchase into small ones",
  "“A demand for goods should not be divided into small quantities to make piecemeal purchases to avoid the necessity of [tendering].”",
  "The independent reason the Evidence Contract at <b>step 4</b> and any Deployment Contract at <b>step 6</b> must buy genuinely different objects — evidence, then a specified product."],
 ["GFR Rules 154 &amp; 155","A department can only spend so much on its own say-so",
  "Purchase without quotation up to ₹25,000; purchase on a local purchase committee's recommendation up to ₹2,50,000.",
  "Why <b>MSInS signs the Evidence Contract</b>, not the department. Departmental discretion stops an order of magnitude below pilot scale. Maharashtra Startup Week already works this way; we productise it rather than invent something."],
 ["DAP 2020, Chapter III","Defence already solved this, without changing the GFR",
  "Products developed under iDEX are “treated at par with Proprietary sources”; where more than one innovator succeeds, procurement is by limited tender restricted to the successful innovators.",
  "The template for <b>Tiers 1 and 2</b>. It proves the deeming approach works inside Indian rules — and it is the precedent that makes our single GR ask a narrow one."],
 ["GeM Startup Runway","A no-tender purchase rail that already exists",
  "DPIIT-recognised startups list innovative products with turnover, experience and EMD waived; a buyer trial plus ratings from three government buyers moves the product to the full catalogue.",
  "<b>Tier 3</b>. The catalogue is already a no-tender rail; the only barrier is a trial and three ratings, which a structured pilot programme produces as a by-product."],
 ["DPDP Rules 2025, Rule 6","The department stays responsible for the data",
  "Reasonable security safeguards, and the terms a Data Fiduciary must impose on a Data Processor.",
  "The sandbox at <b>step 4</b>. The department is Fiduciary, the startup is Processor, and the Fiduciary's accountability does not transfer with the data — so synthetic or masked is the default and live data is an escalation."]
];
const QA=[
 ["Isn't this just a direct award with extra steps?",
  "No — and that is the difference that matters. The challenge notice publishes the <b>whole pathway up front</b>: the evidence phase, the validation gate, the progression criteria and the indicative deployment scale. Progression then exercises a term every bidder saw and could compete for. Competition happens on the problem and the required outcome, where specification is actually possible, never on the solution.<br><br>It is the SBIR Phase III pattern — reproduced contractually, because India has no statutory equivalent."],
 ["What stops a department declaring its own pet pilot a success?",
  "Two things, both structural rather than procedural.<br><br>The success criteria are hashed and published <b>before any solution has been seen</b>, so they cannot drift to fit a disappointing result. And the validator is appointed at challenge time, not at result time — a validator chosen after the numbers are in is chosen knowing what the numbers are.<br><br>Try it on step 1: seal the challenge, then edit a target and watch the seal break."],
 ["Doesn't relaxing eligibility just mean buying from weaker suppliers?",
  "Turnover and prior experience are proxies for <b>delivery risk</b>, not for capability. Where the contract already caps the risk — small, staged, reversible, read-only, no live personal data, no lock-in — the proxy has nothing left to do, and Rule 173(i) expressly permits dropping it.<br><br>The technical and quality floor is never relaxed. Push the sliders at step 2 to the far right and the platform refuses the relaxation outright."],
 ["Does the platform move money?",
  "No, and it never claims to. It assembles the complete sanction packet — milestone definition, evidence, sign-off, contract reference — and hands it to the existing treasury or PFMS route.<br><br>The delay we attack is the assembly of that packet, not the bank transfer. <b>Our first draft promised “smart contracts with automatic payment triggers”. That was an overclaim and we removed it.</b>"],
 ["What does the mechanism need from government that it doesn't already have?",
  "Exactly one thing: a Maharashtra Government Resolution that deems a validated challenge winner proprietary for Rule 166(i) purposes, the way DAP 2020 does for iDEX winners.<br><br>Nothing else needs changing — no GFR amendment, no new statute. And Tiers 2 and 3 work without the GR, so the mechanism is useful from day one; the GR only unlocks Tier 1."],
 ["What did you get wrong in your first draft?",
  "Two things, and we would rather say so than be caught by them.<br><br><b>One:</b> we claimed pilots “stay inside existing discretionary-procurement limits”. Rules 154 and 155 cap those at ₹2.5 lakh — nowhere near pilot scale. The claim was false. It is replaced by the risk ladder plus MSInS as the contracting vehicle.<br><br><b>Two:</b> the smart-contract payment claim above. It is now a sanction packet handed to the treasury route.<br><br>We also could not trace the originating circular number for the iDEX proprietary-parity language, so we cite the text and not a number."],
 ["Who owns what the startup builds?",
  "The startup keeps its background IP — whatever it walked in with. The government takes a defined licence to foreground IP created during the pilot, enough to keep running it and to replicate it under the scale-up routes.<br><br>That follows from what is actually being bought: evidence about a solution, not title to an invention. A mechanism that took ownership would repel exactly the startups it is trying to attract."],
 ["How is this different from Maharashtra Startup Week?",
  "MSW is the closest working precedent and we borrow its contracting structure deliberately. But it is an <b>annual cohort competition</b> — supply-led, so a department with a problem in month two waits, and there is no standing mechanism for what happens after a pilot succeeds.<br><br>GovStart Bridge is demand-led and year-round: a department posts a problem when it has one, and every validated pilot leaves along a named route."]
];
function acc(el,items){
  el.innerHTML=items.map((x,i)=>`<div class="acc">
    <button aria-expanded="false" onclick="toggleAcc(this)"><span>${x[0]}${x[1]?'<br><span style="font-weight:400;font-size:12.5px;color:var(--muted)">'+x[1]+'</span>':""}</span><span class="chev">▶</span></button>
    <div class="panel"><div class="panel-in">${x[2]?'<p class="quote">'+x[2]+'</p>':""}<p>${x[3]||x[2]}</p></div></div>
  </div>`).join("");
}
function toggleAcc(b){
  const o=b.getAttribute("aria-expanded")==="true",p=b.nextElementSibling;
  b.setAttribute("aria-expanded",String(!o));
  p.style.maxHeight=o?"0":p.scrollHeight+40+"px";
}

/* ============================================================
   ASSISTANT
   ============================================================ */
const KB=[
 {k:["direct award","pilot winner","sole source","single source","166","just award","why not"],
  a:"Because Rule 166 allows single-source buying on exactly three grounds — sole manufacturer, emergency, standardisation — and \"won our challenge\" is not one of them.\n\nThat constraint shaped the whole design. Instead of assuming the winner gets the contract, step 6 picks between three lawful routes using facts the platform already holds.",r:"GFR Rule 166"},
 {k:["seal","hash","kpi","escrow","move the bar","tamper","criteria"],
  a:"The success criteria are hashed with SHA-256 and published with the challenge, before anyone has shown you a solution.\n\nIt does not stop an officer editing a field — it makes an undetected edit impossible. Anyone holding the notice can recompute the hash and prove the bar moved.\n\nGo to step 1, press Seal, then change a target. The box turns red instantly and shows you both hashes.",r:"Mechanism M6"},
 {k:["risk","cap","turnover","eligib","173","relax","blast"],
  a:"Turnover requirements are a proxy for delivery risk. Cap the risk in the contract — small, reversible, read-only, masked data, no lock-in — and the proxy has nothing left to do. That is precisely when Rule 173(i) lets you drop it.\n\nFive sliders at step 2 set the cap: citizens affected, systems touched, data used, reversibility, exit cost. Relaxation is granted in proportion, and the technical floor never moves.",r:"GFR 173(i) · Mechanism M4"},
 {k:["tier 3","gem","catalogue","runway","replicat","other departments","scale across","spread"],
  a:"Tier 3 is the honest answer to \"scale across departments\".\n\nA direct award cannot do it — every new department would need its own justification. But GeM's catalogue is already a no-tender purchase rail, and the only thing between a startup and that rail is a trial with ratings from three government buyers.\n\nA structured pilot programme produces those ratings as a by-product. We are not building a parallel procurement system; we are building the on-ramp to the one that exists.",r:"GeM Startup Runway"},
 {k:["tier 1","proprietary","pac","idex","deem"],
  a:"Tier 1 is for one winner in one department: the programme authority deems the solution proprietary and the department buys against a Proprietary Article Certificate under Rule 166(i).\n\nThat is not invented — DAP 2020 reaches Rule 166 the same way for iDEX winners. It does need a Maharashtra GR to perform the deeming, which is the mechanism's only policy ask.",r:"GFR 166(i) · DAP 2020"},
 {k:["tier 2","limited tender","multiple","two startup","cohort"],
  a:"Tier 2 handles several winners in the same department: a limited tender restricted to the cohort that proved the outcome.\n\nCompetition survives, and it is contested only between firms that actually delivered. No GR and no deeming needed — it is modelled straight on the iDEX multi-winner provision.",r:"DAP 2020 Ch. III"},
 {k:["data","dpdp","privacy","personal","sandbox","fiduciary","processor"],
  a:"The department is Data Fiduciary and the startup is only a Data Processor — and the department's accountability does not travel with the data.\n\nSo the sandbox defaults to synthetic or masked data. Live personal data is an escalation with a recorded justification, and it pushes the risk cap up, which costs part of the eligibility relaxation. Rule 6 processor terms are applied automatically.",r:"DPDP Rules 2025, Rule 6"},
 {k:["ip","intellectual","own","patent","background","foreground"],
  a:"The startup keeps its background IP. The government takes a defined licence to foreground IP created during the pilot — enough to keep operating it and to replicate it under the scale-up routes.\n\nThat follows from what is being bought: evidence about a solution, not title to an invention.",r:"Mechanism M9"},
 {k:["policy ask","gr","government resolution","need from government","legislation","amend","law change"],
  a:"One Government Resolution: deeming a validated challenge winner proprietary for Rule 166(i) purposes, exactly as DAP 2020 does for iDEX winners.\n\nNothing else changes — no GFR amendment, no new statute. Tiers 2 and 3 run without it, so the mechanism works from day one and the GR only unlocks Tier 1.\n\nA mechanism that needs no legislation is one a state can adopt next quarter.",r:"design note §7"},
 {k:["pay","payment","money","milestone","treasury","pfms","sanction","who pays"],
  a:"MSInS contracts and pays the evidence phase — departmental discretion stops at ₹2.5 lakh under Rules 154 and 155, far below pilot scale. That is how Maharashtra Startup Week already works.\n\nPayment stages against milestones because a milestone is the price of one increment of certainty. And the platform does not move money: it assembles the sanction packet and hands it to the existing treasury route. The delay we attack is the paperwork, not the transfer.",r:"GFR 154, 155 · Mechanism M10"},
 {k:["two contract","evidence contract","deployment","157","split","piecemeal"],
  a:"Two instruments, never one. The Evidence Contract buys R&D and evidence — a question, a test, a report. The Deployment Contract buys a now-specified product.\n\nTwo separate reasons force this: you cannot buy an innovation, only the reduction of uncertainty about it; and Rule 157 forbids slicing one demand into piecemeal purchases. The EU's pre-commercial procurement regime requires the same separation.",r:"GFR 157 · Mechanism M1"},
 {k:["validator","validation","independent","who checks","pre-regist"],
  a:"The validator is appointed at challenge time and the analysis plan registered then — the discipline clinical trials use.\n\nThe reason is blunt: a validator chosen after the results are in is chosen with knowledge of what the results are. At the gate they recompute the seal first, then assess the evidence against those criteria and nothing else.",r:"Mechanism M7"},
 {k:["fail","failed","doesn't work","no winner","what if"],
  a:"Then nothing is bought, and that is the system working rather than failing.\n\nThe department spent evidence money to find out, instead of a deployment budget. That is what the pilot fee buys: the right, not the obligation, to proceed.\n\nSet step 5 to \"Missed the criteria\" and step 6 will tell you exactly that.",r:"Mechanism M11"},
 {k:["startup week","msw","different from","competitor","existing"],
  a:"Maharashtra Startup Week is the closest working precedent, and we borrow its contracting structure on purpose.\n\nBut it is an annual cohort competition — supply-led, so a department with a problem in month two waits, and nothing standing handles what happens after a pilot succeeds. GovStart Bridge is demand-led and year-round, and every validated pilot leaves along a named route.",r:"MSInS · proposal §2.2"},
 {k:["what is this","overview","how does it work","explain","summary"],
  a:"GovStart Bridge takes a department from \"we have a problem\" to \"we have a validated solution running at scale\", using only instruments that already exist.\n\nSix steps: define the problem and seal the criteria → cap the risk → see who's eligible → design the pilot → run and validate → buy it lawfully.\n\nThe walkthrough on this page is the real thing — every choice you make changes what comes next.",r:"proposal §3"},
 {k:["marketplace","buy","listing","product","service","catalogue","category","seller"],
  a:"The marketplace is what the mechanism produces. Everything listed has either come through the six-step flow or through the GeM Startup Runway route it feeds.\n\nThree kinds of listing: products, services, and skill purchases — trainers, assessors, courseware and enumerator pools, bookable 24×7. Each carries its seller's licence record and the route that put it there.\n\nSkill purchases are empanelled through a lighter route, because that object of purchase is specifiable up front and ordinary procurement already works for it.",r:"Marketplace section"},
 {k:["licen","dpiit recognition","udyam","gst","registration","certif"],
  a:"Three registrations do real work here. DPIIT recognition unlocks the turnover and experience relaxation under Rule 173(i) and the EMD waiver under 170(i). Udyam gets a Micro or Small Enterprise the same EMD waiver. GSTIN and PAN are what let an invoice be raised against a milestone.\n\nISO, BIS and NSDC certificates are quality signals. They can raise a fit score — they cannot be turned into an eligibility bar, because that would quietly undo Rule 173(i).",r:"Licence & registration"},
 {k:["grievance","complaint","ticket","sla","escalat","not paid"],
  a:"The grievance desk is open 24×7 and takes everything: a startup not paid on time, an excluded bidder that thinks a relaxation was wrongly granted, a department that cannot get a validator assigned.\n\nAcknowledgement within 24 hours, first substantive response in 3 working days. Payment grievances carry a 7-day resolution clock — a startup waiting on ₹4.5 lakh does not have a quarter to spare. Escalation runs grievance officer → CEO MSInS → Principal Secretary.",r:"Grievance 24×7"},
 {k:["scheme","subsidy","eligib for scheme","yojana","abhiyan","grant"],
  a:"The schemes section has a small eligibility checker — pick who you are, your age, district and education, and the list narrows.\n\nIf nothing matches, that is a real answer rather than an error. A district where a whole cohort matches no scheme is a gap in scheme design, and the skill gap report is where it should surface.",r:"Skill development schemes"},
 {k:["skill gap","demand","supply","shortage","trades","workforce"],
  a:"The skill gap report shows annual demand against certified supply for six trades, by district. It is what tells a department which problems are worth a challenge, and tells a training provider what to teach.\n\nTwo honest caveats: certified output is not available output — people migrate, and the figure does not net that out — and private-sector demand is excluded entirely, so the real gap is wider than shown. All figures on this prototype are simulated.",r:"Skill gap report"},
 {k:["training","learn","course","video","how do i learn","workshop"],
  a:"Nobody is expected to arrive knowing procurement law. There are six training tracks — officers, sellers, evaluators, validators, finance staff, and train-the-trainer — plus short films tied to individual steps, in Marathi and English.\n\nThe films are deliberately one-step-each, so an officer who is stuck at step 4 can open the step-4 film from inside step 4 rather than hunting for it afterwards.",r:"Training"},
 {k:["app","mobile","offline","field","android"],
  a:"Four apps, and the interesting part is not the interface. Every one of them writes evidence offline first and hashes it with its timestamp before it can reach a network.\n\nThat is what makes field evidence hard to improve later — the same principle as the KPI seal, applied to a photograph of an installed sensor instead of to a target.",r:"Apps"},
 {k:["law","act","rule book","statut","legisl","legal basis"],
  a:"Everything is assembled from instruments that already exist: GFR 2017 (Rules 154, 155, 157, 166, 170, 173), the DPDP Rules 2025, DAP 2020 Chapter III, the GeM Startup Runway procedure, and the Maharashtra Startup Policy 2025.\n\nThe rule book section quotes each provision and says what it does at which step. Nothing here asks for a change in the law.",r:"Rule book"},
 {k:["about","who are you","who runs","msins","contact","reach","helpline","office"],
  a:"GovStart Bridge is proposed for the Maharashtra State Innovation Society, under the Department of Skills, Employment, Entrepreneurship & Innovation, in answer to Smart India Hackathon problem statement SIH26136.\n\nMSInS already runs Maharashtra Startup Week and it works — but it is annual, supply-led and stops at the pilot. This makes it standing, demand-led and year-round, with a lawful route to an actual purchase order at the end.\n\nContact details and the escalation ladder are in the Contacts section. They are illustrative in this prototype.",r:"About us"},
 {k:["document","upload","photo","camera","voice","speak","read out","multimodal"],
  a:"Four tools sit under the message box. Document reads a .txt, .csv, .md or .json file in your browser and checks it against the challenge-notice checklist — nothing is uploaded. Live photo opens the camera and captures a frame. Voice dictates a question. Read out speaks my answers back.\n\nTwo honest limits: this page ships no vision model, so I will not pretend to recognise what is in a photo; and speech recognition needs a network in most browsers even though everything else here works offline.",r:"assistant tools"},
 {k:["ai","real","model","api","llm","chatbot"],
  a:"I am a small offline knowledge base built from the SIH26136 design note — not a live model. No key sits in this page and no request leaves your browser.\n\nIn production this panel would call an approved model through a secure backend, with the rule book and the challenge record as retrieval context.",r:"prototype note"}
];
function reply(q){
  const s=q.toLowerCase();let best=null,sc=0;
  KB.forEach(e=>{let n=0;e.k.forEach(k=>{if(s.includes(k))n+=k.length>6?3:2;});if(n>sc){sc=n;best=e;}});
  return best||{a:"I can answer on:\n• why a direct award is unlawful\n• the KPI seal\n• the risk cap and eligibility\n• the three purchase routes\n• data protection and IP\n• who pays, and when\n• the single policy ask\n\nOr just work through the six steps — they answer most of it.",r:"index"};
}
function saveThread(){
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
  const d=document.createElement("div");d.className="msg "+c;d.textContent=t;
  if(ref){const s=document.createElement("span");s.className="ref";s.textContent="Source: "+ref;d.appendChild(s);}
  $("aiM").appendChild(d);$("aiM").scrollTop=$("aiM").scrollHeight;
  if(!quiet)saveThread();
}
function askAI(t){if(!$("aiP").classList.contains("open"))toggleAI();addMsg(t,"user");setTimeout(()=>{const r=reply(t);addMsg(r.a,"bot",r.r);say(r.a);},240);}
function sendAI(){const i=$("aiIn"),t=i.value.trim();if(!t)return;i.value="";askAI(t);}
function toggleAI(){const o=$("aiP").classList.toggle("open");$("aiL").setAttribute("aria-expanded",String(o));if(o)$("aiIn").focus();}

function openRefs(){openModal("References",`<ol style="font-size:13px;padding-left:20px;line-height:1.8">
 <li>General Financial Rules 2017 (amended to 31 January 2023) — Rules 154, 155, 157, 166, 170, 173.</li>
 <li>Startup India, <i>Procurement by Government</i> — public procurement relaxations for DPIIT-recognised startups.</li>
 <li>Ministry of Defence, Defence Acquisition Procedure 2020, Chapter III — 'Make' and 'Innovation' categories; treatment of iDEX products.</li>
 <li>Government e-Marketplace, Startup Runway — listing route, buyer trial and catalogue procedure.</li>
 <li>Maharashtra State Innovation Society — Maharashtra Startup Week; Maharashtra Startup Policy 2025.</li>
 <li>Digital Personal Data Protection Rules 2025, Rule 6.</li>
 <li>15 U.S.C. §638(r)(4) — SBIR Phase III competition provision.</li>
 <li>UK Small Business Research Initiative; European Commission, Pre-Commercial Procurement.</li></ol>`);}
function openOpen(){openModal("What we haven't closed",`<p style="font-size:13.5px">We would rather list these than have them found.</p>
 <ul style="font-size:13px;padding-left:20px;line-height:1.75;margin-top:12px">
 <li>The originating MoD/DDP circular number for the iDEX proprietary-parity language was not traceable in public sources. We cite the text, not a number.</li>
 <li>The full Maharashtra Stores Purchase Rules threshold schedule (GR SPO-2014/Pra.Kra.82/Part-III/Industry-4, 01.12.2016) is only partially confirmed.</li>
 <li>Whether Maharashtra Startup Week work orders are issued as procurement or grant-in-aid is reported, not confirmed with MSInS.</li>
 <li>GeM Startup Runway trial and rating thresholds are consistent across secondary sources, but the GeM portal does not publish the procedure itself.</li></ul>`);}


/* ============================================================
   PORTAL — menus, language, shared bits
   ============================================================ */
let openMenu=null;
function mm(k){
  const p=$("mm-"+k),b=$("mmb-"+k),was=p.classList.contains("open");
  document.querySelectorAll(".mm").forEach(x=>x.classList.remove("open"));
  document.querySelectorAll(".mmbtn").forEach(x=>x.setAttribute("aria-expanded","false"));
  if(!was){p.classList.add("open");b.setAttribute("aria-expanded","true");openMenu=k;}else openMenu=null;
}
document.addEventListener("click",e=>{
  if(openMenu&&!e.target.closest(".mm-wrap")){
    document.querySelectorAll(".mm").forEach(x=>x.classList.remove("open"));
    document.querySelectorAll(".mmbtn").forEach(x=>x.setAttribute("aria-expanded","false"));
    openMenu=null;
  }
});
function closeMenus(){document.querySelectorAll(".mm").forEach(x=>x.classList.remove("open"));document.querySelectorAll(".mmbtn").forEach(x=>x.setAttribute("aria-expanded","false"));openMenu=null;$("navlinks").classList.remove("open");}
function mmGo(sec,type){
  closeMenus();
  if(!$("mtype")){location.href="marketplace.html"+(type&&type!=="all"?"#"+type:"");return;}
  $("mtype").value=(type&&type!=="all")?type:"";renderMarket();
}
function mmGoSkill(t){
  closeMenus();
  if(!$("skillPane")){location.href="skills.html#"+t;return;}
  skillTab(t);
}
let mr=false;
function toggleLang(){
  mr=!mr;$("langBtn").textContent=mr?"English":"मराठी";
  toast(mr?"मराठी आवृत्ती या नमुन्यात अद्याप लिहिलेली नाही — फक्त हा संदेश अनुवादित आहे."
          :"Switched back to English. Marathi strings are not authored in this prototype.");
}

/* ============================================================
   MARKETPLACE
   ============================================================ */
const CATS=["All categories","Health","Water & sanitation","Education","Agriculture","Transport","Urban services","Welfare delivery","Skilling"];
let cat=0;
const LISTINGS=[
 {n:"QueueSense OPD Flow",sel:"QueueSense Systems",cat:"Health",type:"service",price:"₹2.4 L / hospital / yr",adopt:9,new:3,
  d:"Token-free outpatient flow using anonymous beacons and existing registration timestamps. Read-only against the HMIS.",
  route:"Tier 3 · on GeM catalogue",lic:["DPIIT","Udyam","ISO 27001"]},
 {n:"HydroSense Leak Array",sel:"HydroSense Networks",cat:"Water & sanitation",type:"product",price:"₹8.9 L / 50 km",adopt:7,new:6,
  d:"Acoustic and pressure-transient sensors for leak localisation on distribution mains, with an NRW dashboard.",
  route:"Tier 3 · on GeM catalogue",lic:["DPIIT","Udyam","BIS"]},
 {n:"Setu Grievance Triage",sel:"Setu Systems",cat:"Welfare delivery",type:"service",price:"₹1.6 L / division / yr",adopt:4,new:1,
  d:"Marathi-first grievance classification and routing with an SLA-breach early-warning queue.",
  route:"Tier 2 · limited tender cohort",lic:["DPIIT","Udyam"]},
 {n:"AgriPulse Advisory",sel:"AgriPulse Analytics",cat:"Agriculture",type:"service",price:"₹42 / acre / season",adopt:5,new:4,
  d:"Satellite and soil-probe fusion producing irrigation advisories at gat-number level.",
  route:"Evidence phase · Nashik",lic:["DPIIT","Udyam"]},
 {n:"TransitGrid Headway",sel:"TransitGrid Labs",cat:"Transport",type:"service",price:"₹6.2 L / depot / yr",adopt:6,new:5,
  d:"Demand forecasting and headway optimisation for state bus undertakings, from AVLS and ticketing feeds.",
  route:"Tier 1 · PAC pending GR",lic:["DPIIT","Udyam","ISO 9001"]},
 {n:"RoadVision Defect Index",sel:"RoadVision AI",cat:"Urban services",type:"product",price:"₹3.1 L / 100 km",adopt:5,new:7,
  d:"Dashcam computer vision producing an IRC-aligned pothole and surface-defect index ranked by maintenance priority.",
  route:"Evaluation stage",lic:["Udyam","ISO 9001"]},
 {n:"ShikshaTrack Remedial",sel:"ShikshaTrack Labs",cat:"Education",type:"service",price:"₹18 / student / yr",adopt:3,new:2,
  d:"Attendance and learning-outcome analytics with automatic remedial grouping for ZP schools.",
  route:"Screening — risk cap exceeded",lic:["DPIIT"]},
 {n:"ColdChain Sentinel",sel:"VaccineCold Chain Co.",cat:"Health",type:"product",price:"₹11,400 / point",adopt:8,new:8,
  d:"IoT temperature-excursion alerting across cold-chain points with tamper-evident logging.",
  route:"Tier 3 · on GeM catalogue",lic:["Udyam","BIS","ISO 13485"]},
 {n:"Assessor pool — electrical trades",sel:"Vidarbha Skills Council",cat:"Skilling",type:"skill",price:"₹850 / assessment",adopt:6,new:9,
  d:"NSQF-aligned third-party assessors for electrical and solar trades, bookable by the day across 11 districts.",
  route:"Empanelled · skill purchase",lic:["NSDC","Udyam"]},
 {n:"Marathi courseware — data entry & MIS",sel:"Pune Digital Literacy Trust",cat:"Skilling",type:"skill",price:"₹1.2 L / batch of 30",adopt:7,new:10,
  d:"NSQF Level 3 courseware and trainer supply for departmental MIS operators, delivered on site.",
  route:"Empanelled · skill purchase",lic:["NSDC"]},
 {n:"Sandbox data-masking toolkit",sel:"Nagpur Data Labs",cat:"Welfare delivery",type:"product",price:"₹95,000 one-time",adopt:4,new:11,
  d:"Tokenisation and k-anonymisation toolkit for provisioning DPDP-compliant pilot sandboxes.",
  route:"Tier 2 · limited tender cohort",lic:["DPIIT","Udyam","ISO 27001"]},
 {n:"Field survey enumerator pool",sel:"Gadchiroli Livelihood Federation",cat:"Skilling",type:"skill",price:"₹1,150 / enumerator-day",adopt:5,new:12,
  d:"Trained local enumerators for independent baseline measurement, including tribal-belt language coverage.",
  route:"Empanelled · skill purchase",lic:["Udyam"]}
];
function renderCats(){
  if(!$("catChips"))return;
  $("catChips").innerHTML=CATS.map((c,i)=>`<button class="chip" aria-pressed="${i===cat}" onclick="setCat(${i})">${esc(c)}</button>`).join("");
}
function setCat(i){cat=i;renderCats();renderMarket();}
function renderMarket(){
  if(!$("mktGrid"))return;
  const q=($("mq").value||"").toLowerCase(),ty=$("mtype").value,so=$("msort").value;
  let list=LISTINGS.filter(x=>{
    if(cat>0&&x.cat!==CATS[cat])return false;
    if(ty&&x.type!==ty)return false;
    if(q&&!((x.n+" "+x.d+" "+x.sel+" "+x.cat).toLowerCase().includes(q)))return false;
    return true;
  });
  list.sort((a,b)=>so==="new"?b.new-a.new:so==="price"?a.price.length-b.price.length:b.adopt-a.adopt);
  $("mktCount").textContent=list.length+" of "+LISTINGS.length+" listings shown"+(cat>0?" · "+CATS[cat]:"")+" · simulated demonstration data";
  if(!list.length){$("mktGrid").innerHTML='<div class="card" style="grid-column:1/-1;text-align:center;color:var(--muted)">Nothing matches those filters yet.</div>';return;}
  $("mktGrid").innerHTML=list.map(x=>{
    const si=LISTINGS.indexOf(x);
    return `<article class="lcard">
      <div class="lh"><h4>${esc(x.n)}</h4><span class="tag ${x.type==="product"?"":x.type==="skill"?"v":"g"}">${x.type==="skill"?"Skill":x.type==="product"?"Product":"Service"}</span></div>
      <p>${esc(x.d)}</p>
      <div class="badges">${x.lic.map(l=>`<span class="tag n">${esc(l)}</span>`).join("")}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <span class="price">${esc(x.price)}</span>
        ${x.type==="skill"?'<span class="always">Bookable 24×7</span>':""}
      </div>
      <div class="meta"><span>${esc(x.cat)}</span><span>${esc(x.route)}</span></div>
      <div style="display:flex;gap:7px">
        <button class="btn btn-o btn-sm" onclick="openSeller(${si})">About the seller</button>
        <button class="btn btn-p btn-sm" onclick="addToRequest(${si})">Add to request</button>
      </div>
    </article>`;}).join("");
}
let REQ=[];
function addToRequest(i){
  const x=LISTINGS[i];
  if(REQ.includes(i)){toast(x.n+" is already on your request list.");return;}
  REQ.push(i);
  toast(x.n+" added. "+REQ.length+" item"+(REQ.length>1?"s":"")+" on your request list — a real deployment would turn this into a demand note for your finance wing.");
}
const SELLERS={
 "QueueSense Systems":{inc:"2023",loc:"Nagpur",emp:"14",dpiit:"DIPP·MH·2024·61180",gst:"27AAxxxxxx1Z5",udyam:"UDYAM-MH-20-0xxxxxx",
  first:true,pilots:3,rating:"4.6",about:"Founded by two hospital-systems engineers after a year of time-and-motion work in district OPDs. First government supplier — no prior public-sector turnover, admitted under the GFR 173(i) relaxation."},
 "HydroSense Networks":{inc:"2019",loc:"Pune",emp:"46",dpiit:"DIPP·MH·2021·33902",gst:"27AAxxxxxx7Z2",udyam:"UDYAM-MH-26-0xxxxxx",
  first:false,pilots:6,rating:"4.4",about:"Water-utility instrumentation firm with three ULB deployments and 4,200 km of main surveyed. Holds three GeM buyer ratings, so its products sit on the full catalogue."}
};
function openSeller(i){
  const x=LISTINGS[i],s=SELLERS[x.sel]||{inc:"—",loc:"Maharashtra",emp:"—",dpiit:"—",gst:"—",udyam:"—",first:false,pilots:1,rating:"—",
    about:"Seller profile is illustrative in this prototype. In a live deployment this is populated from the Startup India Hub and MSInS registries, with licence status verified against the issuing authority."};
  closeMenus();
  openModal("About the seller — "+x.sel,`
    <div class="kv" style="margin-bottom:14px">
      <dt>Incorporated</dt><dd>${esc(s.inc)}</dd>
      <dt>Based in</dt><dd>${esc(s.loc)}</dd>
      <dt>Team size</dt><dd>${esc(s.emp)}</dd>
      <dt>Pilots completed</dt><dd>${s.pilots}</dd>
      <dt>Buyer rating</dt><dd>${esc(s.rating)} / 5</dd>
      <dt>Listing</dt><dd>${esc(x.n)}</dd>
    </div>
    <p style="font-size:13.5px;margin-bottom:14px">${esc(s.about)}</p>
    ${s.first?'<div class="note-b" style="margin-bottom:14px"><b>First-time government supplier.</b> Admitted without prior public-sector turnover or experience, under GFR Rule 173(i), with the technical floor applied in full and EMD waived under Rule 170(i).</div>':""}
    <h5 style="font:800 10.5px/1 var(--sans);letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:9px">Licences &amp; registrations on file</h5>
    <div class="kv">
      <dt>DPIIT recognition</dt><dd>${esc(s.dpiit)}</dd>
      <dt>Udyam</dt><dd>${esc(s.udyam)}</dd>
      <dt>GSTIN</dt><dd>${esc(s.gst)}</dd>
      <dt>Certifications</dt><dd>${x.lic.map(esc).join(" · ")}</dd>
    </div>
    <p class="formnote">Identifiers are masked demonstration values. A live deployment verifies each against the issuing authority's API and shows the verification timestamp.</p>`);
}
function openLicence(){
  closeMenus();
  openModal("Licence &amp; registration status",`
    <p style="font-size:13.5px;margin-bottom:14px">Every seller on the marketplace carries a licence record. Three of these are what unlock the procurement relaxations — the rest are quality signals a department may weigh, but cannot use to exclude a startup.</p>
    <div class="tbl-wrap" style="border:1px solid var(--line);border-radius:12px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="text-align:left;padding:11px 13px;background:rgba(255,255,255,.10);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-t)">Registration</th><th style="text-align:left;padding:11px 13px;background:rgba(255,255,255,.10);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--navy-t)">What it unlocks here</th></tr></thead>
      <tbody style="font-size:12.5px">
        <tr><td style="padding:11px 13px;border-top:1px solid var(--line-2)"><b>DPIIT recognition</b></td><td style="padding:11px 13px;border-top:1px solid var(--line-2)">The turnover and prior-experience relaxation under GFR Rule 173(i), and the EMD waiver under Rule 170(i). Without it, neither is available.</td></tr>
        <tr><td style="padding:11px 13px;border-top:1px solid var(--line-2)"><b>Udyam (MSME)</b></td><td style="padding:11px 13px;border-top:1px solid var(--line-2)">The EMD waiver under Rule 170(i) for Micro and Small Enterprises, and state tender-fee exemptions.</td></tr>
        <tr><td style="padding:11px 13px;border-top:1px solid var(--line-2)"><b>GSTIN &amp; PAN</b></td><td style="padding:11px 13px;border-top:1px solid var(--line-2)">Required to raise an invoice against a milestone and to be paid through the treasury route.</td></tr>
        <tr><td style="padding:11px 13px;border-top:1px solid var(--line-2)"><b>ISO 27001 / BIS / NSDC</b></td><td style="padding:11px 13px;border-top:1px solid var(--line-2)">Quality and security signals. They can raise a fit score — they cannot be turned into an eligibility bar that excludes a startup, which would defeat Rule 173(i).</td></tr>
      </tbody>
    </table></div>
    <p class="formnote">A licence is checked at listing and re-checked at contract award. Lapsed DPIIT recognition suspends the relaxation but does not cancel a contract already signed.</p>`);
}
const SELLER_HTML=`
  <p style="font-size:13.5px;margin-bottom:14px">Sellers do not apply to the marketplace directly. You get listed by answering a challenge and clearing the validation gate — which is what makes a listing here mean something.</p>
  <ol class="steps-mini">
    <li><b>Get DPIIT recognition.</b> Without it the eligibility relaxation under Rule 173(i) does not reach you, and you compete on standard turnover conditions.</li>
    <li><b>Answer an open challenge.</b> Competition is on the outcome, never on a pre-specified solution.</li>
    <li><b>Clear screening and the expert panel.</b> The rubric and its weights were published before you applied.</li>
    <li><b>Run the Evidence Contract.</b> Milestone-paid, sandboxed, with your background IP retained.</li>
    <li><b>Pass independent validation</b> against criteria sealed before anyone saw your solution.</li>
    <li><b>Get routed and listed.</b> Tier 1, 2 or 3 — and on the GeM catalogue once three government buyers have rated you.</li>
  </ol>
  <div class="note-b" style="margin-top:14px">Skill sellers — trainers, assessors, courseware and enumerator pools — are empanelled through a lighter route, because the object of purchase is specifiable up front and ordinary procurement already works for it.</div>`;

/* ============================================================
   BUYER LOGIN / REGISTRATION / BACKGROUND  (prototype, no credentials)
   ============================================================ */
function openLogin(which){
  closeMenus();
  const tabs=`<div class="tabsm" role="tablist">
    <button role="tab" aria-selected="${which==="login"}" onclick="openLogin('login')">Sign in</button>
    <button role="tab" aria-selected="${which==="register"}" onclick="openLogin('register')">Register a department</button>
    <button role="tab" aria-selected="${which==="profile"}" onclick="openLogin('profile')">Buyer background</button>
  </div>`;
  let body="";
  if(which==="login"){
    body=`<p style="font-size:13.5px;margin-bottom:14px">Departmental officers sign in with their official email and a one-time password. <b>There is no password on this platform</b> — an OTP against a verified official address is both safer and closer to how state portals actually work.</p>
      <div class="field"><label for="lg_mail">Official email address</label><input id="lg_mail" type="email" placeholder="name.designation@maharashtra.gov.in" autocomplete="off"></div>
      <div class="field"><label>One-time password <span class="h">— six digits, valid 10 minutes</span></label>
        <div class="otpwrap">${[0,1,2,3,4,5].map(i=>`<input maxlength="1" inputmode="numeric" aria-label="OTP digit ${i+1}" id="otp${i}" oninput="otpNext(${i})">`).join("")}</div></div>
      <button class="btn btn-p" onclick="demoSignIn()">Sign in</button>
      <button class="btn btn-o" onclick="fillOtp()">Fill demo OTP</button>
      <p class="formnote"><b>Prototype only.</b> No account exists, no credential is checked, transmitted or stored, and any six digits will "work". Do not enter a real password anywhere on this page — you will never be asked for one.</p>`;
  } else if(which==="register"){
    body=`<p style="font-size:13.5px;margin-bottom:14px">A department, ULB, ZP or state corporation registers once. MSInS verifies it against the government directory before any challenge can be published.</p>
      <div class="row2">
        <div class="field"><label for="rg_org">Department / body</label><input id="rg_org" placeholder="Department of Public Health"></div>
        <div class="field"><label for="rg_lvl">Level</label><select id="rg_lvl"><option>State department</option><option>Divisional office</option><option>District (ZP / Collectorate)</option><option>Municipal corporation</option><option>State corporation</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label for="rg_off">Nodal officer designation</label><input id="rg_off" placeholder="Deputy Secretary (Innovation)"></div>
        <div class="field"><label for="rg_mail">Official email</label><input id="rg_mail" type="email" placeholder="name@maharashtra.gov.in"></div>
      </div>
      <div class="field"><label for="rg_head">Budget head available for evidence contracts</label><input id="rg_head" placeholder="2210-06-101-... (demonstration)"></div>
      <button class="btn btn-p" onclick="demoRegister()">Submit for verification</button>
      <p class="formnote"><b>Prototype only.</b> Nothing is submitted or stored anywhere. Do not enter real official identifiers.</p>`;
  } else {
    body=`<p style="font-size:13.5px;margin-bottom:14px">What a seller can see about the department buying from them — and what MSInS checks before a challenge goes live. Transparency runs in both directions.</p>
      <div class="kv" style="margin-bottom:16px">
        <dt>Body</dt><dd>Department of Public Health, Nagpur Division</dd>
        <dt>Registered</dt><dd>Verified against the government directory</dd>
        <dt>Nodal officer</dt><dd>Deputy Director (Health Services)</dd>
        <dt>Challenges published</dt><dd>4 · 2 in evidence phase</dd>
        <dt>Payment record</dt><dd>9 of 9 milestones sanctioned within SLA</dd>
        <dt>Median packet → sanction</dt><dd>11 days</dd>
        <dt>Open grievances</dt><dd>0</dd>
      </div>
      <h5 style="font:800 10.5px/1 var(--sans);letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:9px">Authority limits on file</h5>
      <div class="tick">Purchase without quotation — up to ₹25,000 <span class="cite">(GFR 154)</span></div>
      <div class="tick">Local purchase committee — up to ₹2,50,000 <span class="cite">(GFR 155)</span></div>
      <div class="tick no">Evidence contracts at pilot scale — <b>contracted by MSInS, not the department</b> <span class="cite">(M12)</span></div>
      <div class="note-a" style="margin-top:14px"><b>Why a seller should care.</b> A startup deciding whether to spend three months of engineering on a government pilot is really asking one question: will these people pay me. This panel is the answer, in public.</div>`;
  }
  openModal("Buyer access",tabs+body);
}
function otpNext(i){const el=$("otp"+i);if(el.value&&i<5)$("otp"+(i+1)).focus();}
function fillOtp(){[0,1,2,3,4,5].forEach((i)=>{$("otp"+i).value=String((i*2+4)%10);});toast("Demo OTP filled. No real code was generated or sent.");}
function demoSignIn(){closeModal();toast("Signed in as a demonstration department officer. No account exists and nothing was transmitted.");}
function demoRegister(){closeModal();toast("Prototype: registration form captured nothing and submitted nowhere. A live deployment would route this to MSInS for directory verification.");}

/* ============================================================
   SKILL / EMPLOYMENT / ENTREPRENEURSHIP
   ============================================================ */
const PILLARS={
 skill:{h:"Skill",p:"A validated solution is useless if nobody in the district can run it. So every Evidence Contract names the people who will operate the thing after the startup goes home — and the platform buys their training in the same breath.",
  cards:[["Operator training bundled into the pilot","Every Evidence Contract carries an annexure naming who will run the solution at handover, and funds their certification. A pilot that cannot be operated after month six is not evidence of anything."],
         ["NSQF-aligned certification","Assessors are bought off the marketplace under the skill purchase route. Third-party assessment, so the trainer is not marking their own homework — the same principle as independent validation."],
         ["Courseware follows the deployment","When a solution routes to Tier 3 and spreads to other districts, its training package travels with it as part of the adoption kit."]],
  stats:[["24×7","Skill purchases bookable"],["11","Districts with assessor coverage"],["3","NSQF levels supported"]]},
 employment:{h:"Employment",p:"Every pilot that scales is a small employment event — field staff, operators, data entry, maintenance. The mechanism makes that visible instead of incidental, and points it at the people already on the district's rolls.",
  cards:[["Jobs counted, not assumed","Deployment contracts record posts created and posts required to operate. It becomes a reportable number rather than a line in a press note."],
         ["Local hiring preference at deployment","Where a solution scales into a district, operator roles are advertised through the district employment exchange first. Not a mandate — a default that has to be argued out of."],
         ["Enumerators as a purchasable pool","Independent baseline measurement needs trained local people. Buying that as a skill listing creates steady district-level work and keeps validation honest."]],
  stats:[["68%","Pilots awarded to first-time suppliers"],["4","Districts with enumerator pools"],["₹1,150","Per enumerator-day, listed"]]},
 entre:{h:"Entrepreneurship",p:"The hardest thing about selling to government is not the technology. It is surviving the sales cycle. Milestone payments, a published pathway and a named route to a purchase order are the three things that make a government engagement financeable.",
  cards:[["Milestone payments make it financeable","A startup can show a lender a signed contract with dated tranches. That is worth more than a letter of intent for a tender that may never be issued."],
         ["The pathway is published up front","Founders can see the whole route — evidence phase, validation gate, progression criteria, indicative deployment scale — before spending a rupee on a bid."],
         ["Failure is survivable","A pilot that misses its sealed criteria still paid four milestones and produced an independent report. That is a very different outcome from a tender lost in round one."]],
  stats:[["₹15–25 L","Evidence contract range"],["4","Milestone tranches"],["3","Routes from pilot to purchase order"]]}
};
function skillTab(k){
  if(!$("skillPane"))return;
  ["skill","employment","entre"].forEach(x=>{const b=$("st-"+x);if(b)b.setAttribute("aria-selected",String(x===k));});
  const p=PILLARS[k];
  $("skillPane").innerHTML=`
    <p style="font-size:15.5px;color:var(--ink);max-width:760px;margin-bottom:20px">${esc(p.p)}</p>
    <div class="grid g3" style="margin-bottom:18px">${p.cards.map(c=>`<div class="card"><h4>${esc(c[0])}</h4><p style="font-size:13px;color:var(--muted);margin-top:6px">${esc(c[1])}</p></div>`).join("")}</div>
    <div class="grid g3">${p.stats.map(s=>`<div class="kcard" style="background:var(--page);border:1px solid var(--line);border-radius:12px;padding:15px"><div style="font:600 24px var(--serif);color:var(--navy-t)">${esc(s[0])}</div><div style="font-size:12px;color:var(--muted)">${esc(s[1])}</div></div>`).join("")}</div>`;
}

/* ============================================================
   SCHEMES + ELIGIBILITY
   ============================================================ */
const SCHEMES=[
 {n:"Pramod Mahajan Kaushalya Vikas Abhiyan",who:"youth",age:[15,45],edu:1,d:"Short-term skilling with NSQF certification and post-training placement support, delivered through empanelled providers.",tag:"State"},
 {n:"Deen Dayal Upadhyaya Grameen Kaushalya Yojana",who:"youth",age:[15,35],edu:1,d:"Rural youth placement-linked skilling with mandatory post-placement support for a defined period.",tag:"Centre"},
 {n:"Maharashtra Apprenticeship Promotion Scheme",who:"youth",age:[18,35],edu:3,d:"Stipend reimbursement for establishments engaging apprentices, including in government-adjacent deployments.",tag:"State"},
 {n:"Annasaheb Patil Arthik Magas Vikas Mahamandal — interest subsidy",who:"firm",age:[18,60],edu:1,d:"Interest subvention on term loans for first-generation entrepreneurs, useful for working capital during a pilot.",tag:"State"},
 {n:"Maharashtra Startup Week",who:"firm",age:[18,99],edu:1,d:"Annual cohort competition; work orders up to ₹15 lakh (₹25 lakh under the 2025 policy) for departmental pilots.",tag:"MSInS"},
 {n:"Startup India Seed Fund Scheme",who:"firm",age:[18,99],edu:1,d:"Proof-of-concept, prototype and market-entry funding for DPIIT-recognised startups through empanelled incubators.",tag:"Centre"},
 {n:"Innovation Challenge Sponsorship (proposed)",who:"dept",age:[0,99],edu:1,d:"Departmental co-funding for the evidence phase of a GovStart Bridge challenge, contracted through MSInS.",tag:"Proposed"},
 {n:"District Skill Development Plan grant",who:"dept",age:[0,99],edu:1,d:"District-level funds for closing gaps identified in the skill gap report, including operator training at deployment.",tag:"State"}
];
function renderSchemes(){
  if(!$("schemeList"))return;
  const who=$("sc_who").value,age=parseInt($("sc_age").value,10),edu=parseInt($("sc_edu").value,10),dist=$("sc_dist").value;
  const ok=SCHEMES.filter(s=>s.who===who&&age>=s.age[0]&&age<=s.age[1]&&edu>=s.edu);
  const no=SCHEMES.filter(s=>!ok.includes(s));
  $("schemeList").innerHTML=
    (ok.length?ok.map(s=>`<div class="lcard"><div class="lh"><h4>${esc(s.n)}</h4><span class="tag g">Eligible</span></div>
      <p>${esc(s.d)}</p><div class="meta"><span>${esc(s.tag)}</span><span>${esc(dist)}</span></div></div>`).join("")
     :'<div class="card" style="grid-column:1/-1"><b>Nothing matches on those four answers.</b><p style="font-size:13px;color:var(--muted);margin-top:6px">That is a real answer, not an error — and it is worth reporting. A district where a whole cohort matches nothing is a gap in scheme design, and the skill gap report below is where it should surface.</p></div>')
    +no.slice(0,3).map(s=>`<div class="lcard" style="opacity:.5"><div class="lh"><h4>${esc(s.n)}</h4><span class="tag n">Not eligible</span></div>
      <p>${esc(s.d)}</p><div class="meta"><span>${esc(s.tag)}</span><span>${s.who!==who?"different applicant type":age<s.age[0]||age>s.age[1]?"age band "+s.age[0]+"–"+s.age[1]:"needs higher qualification"}</span></div></div>`).join("");
}

/* ============================================================
   SKILL GAP REPORT
   ============================================================ */
const GAP={
 "Nagpur":[["Health data operators",4200,1650],["Water utility technicians",2800,900],["Solar & electrical trades",5100,3400],["Field enumerators",1900,700],["MIS & data entry",6300,5200],["IoT field maintenance",1500,320]],
 "Pune":[["Health data operators",5600,4100],["Water utility technicians",3300,2100],["Solar & electrical trades",7200,6400],["Field enumerators",2100,1500],["MIS & data entry",9100,8700],["IoT field maintenance",2600,1100]],
 "Nashik":[["Health data operators",3100,1400],["Water utility technicians",2400,1100],["Solar & electrical trades",4800,2900],["Field enumerators",1700,600],["MIS & data entry",4900,3800],["IoT field maintenance",1200,260]],
 "Mumbai Suburban":[["Health data operators",7400,6900],["Water utility technicians",4100,3600],["Solar & electrical trades",6300,5900],["Field enumerators",1400,1200],["MIS & data entry",12800,12100],["IoT field maintenance",3100,1800]],
 "Gadchiroli":[["Health data operators",1100,180],["Water utility technicians",800,140],["Solar & electrical trades",1300,400],["Field enumerators",1600,240],["MIS & data entry",1500,520],["IoT field maintenance",400,40]]
};
function renderGap(){
  if(!$("gapBars"))return;
  const d=$("gapDist").value,rows=GAP[d],max=Math.max(...rows.map(r=>Math.max(r[1],r[2])));
  $("gapBars").innerHTML=rows.map(r=>{
    const gap=r[1]-r[2],pct=Math.round(gap/r[1]*100);
    return `<div class="brow">
      <div class="bl"><b>${esc(r[0])}</b><span class="cite" style="color:${pct>60?"var(--red-t)":pct>30?"var(--amber-t)":"var(--green-t)"}">${pct}% unmet · ${gap.toLocaleString("en-IN")} posts</span></div>
      <div class="btrack"><i class="dem" style="width:${r[1]/max*100}%"></i><i class="sup" style="width:${r[2]/max*100}%"></i></div>
    </div>`;}).join("");
  const worst=rows.slice().sort((a,b)=>(b[1]-b[2])/b[1]-(a[1]-a[2])/a[1])[0];
  const tot=rows.reduce((a,b)=>a+b[1]-b[2],0);
  $("gapCards").innerHTML=`
    <div class="card"><div style="font:600 26px var(--serif);color:var(--navy-t)">${tot.toLocaleString("en-IN")}</div><div style="font-size:12px;color:var(--muted)">Unmet posts across the six trades, ${esc(d)}</div></div>
    <div class="card"><div style="font:600 18px var(--serif);color:var(--red-t)">${esc(worst[0])}</div><div style="font-size:12px;color:var(--muted)">Widest gap — ${Math.round((worst[1]-worst[2])/worst[1]*100)}% of demand unmet</div></div>
    <div class="card"><div style="font:600 15px var(--serif);color:var(--ink);margin-bottom:6px">What a department does with this</div><p style="font-size:12.5px;color:var(--muted)">A trade with a wide gap and a live challenge is where operator training gets written into the Evidence Contract — so the solution is still running at month twelve.</p></div>`;
}
const GAP_METHOD=`<p style="font-size:13.5px">Demand is estimated from sanctioned posts, vacancy notifications and the operator requirements declared in live Evidence Contracts. Supply is annual certified output from NSQF-aligned providers in the district, counted at assessment rather than at enrolment — because enrolment numbers flatter everyone.</p>
<p style="font-size:13.5px;margin-top:11px">Two honest caveats. Certified output is not the same as available output: people migrate, and the figure does not net that out. And demand from private employers is excluded entirely, so the true gap in a district like Pune is wider than shown.</p>
<div class="note-a" style="margin-top:12px">All figures on this page are <b>simulated demonstration data</b> for the prototype. A live deployment would draw from the District Skill Development Plan and the state's assessment records.</div>`;
function downloadGap(){
  const d=$("gapDist").value;
  const csv="District,Trade,Annual demand (posts),Annual certified supply,Unmet posts,Unmet %\n"+
    GAP[d].map(r=>[d,r[0],r[1],r[2],r[1]-r[2],Math.round((r[1]-r[2])/r[1]*100)+"%"].join(",")).join("\n")+
    "\n\nSimulated demonstration data — GovStart Bridge prototype (SIH26136). Not official statistics.";
  try{
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="skill-gap-"+d.toLowerCase().replace(/\s+/g,"-")+".csv";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast("CSV downloaded — simulated data, clearly labelled inside the file.");
  }catch(e){toast("Download is not available in this browser context.");}
}

/* ============================================================
   TRAINING + VIDEOS
   ============================================================ */
const TRAIN=[
 ["For department officers","Two days","Writing an outcome statement that does not secretly name a solution; setting a risk cap you can defend; reading a validation report without wishful thinking.","Officer"],
 ["For startups & sellers","Half day","What DPIIT recognition actually gets you, how milestone evidence is judged, and what happens to your IP. Run monthly, online, in Marathi and English.","Seller"],
 ["For expert evaluators","One day","Scoring against a published rubric, declaring conflicts, and why your score has your name on it.","Evaluator"],
 ["For independent validators","One day","Pre-registering an analysis plan, verifying a KPI seal, and writing a report that says a pilot failed when it did.","Validator"],
 ["For finance & sanction staff","Half day","What a complete sanction packet contains, and why the platform hands you paperwork rather than moving money.","Finance"],
 ["Train the trainer","Three days","For district resource persons who will run all of the above locally, without MSInS in the room.","Trainer"]
];
const VIDEOS=[
 ["Writing an outcome, not a wish list","4:12","Step 1 · मराठी + English"],
 ["Sealing your KPIs, and why it matters","3:38","Step 1 · English"],
 ["Setting a risk cap you can defend","6:05","Step 2 · मराठी"],
 ["Reading a screening result","5:20","Step 3 · English"],
 ["Provisioning a DPDP-safe sandbox","7:44","Step 4 · English"],
 ["What a sanction packet must contain","5:01","Step 4 · मराठी"],
 ["Verifying a seal before you validate","4:35","Step 5 · English"],
 ["Choosing between Tier 1, 2 and 3","8:19","Step 6 · मराठी + English"],
 ["When a pilot fails: writing it up honestly","6:52","Step 5 · English"]
];
function renderTraining(){
  if($("trainGrid"))$("trainGrid").innerHTML=TRAIN.map(t=>`<div class="lcard">
    <div class="lh"><h4>${esc(t[0])}</h4><span class="tag n">${esc(t[3])}</span></div>
    <p>${esc(t[2])}</p><div class="meta"><span>${esc(t[1])}</span><span>Certificate on completion</span></div></div>`).join("");
  if($("vidGrid"))$("vidGrid").innerHTML=VIDEOS.map((v,i)=>`<button class="vid soon" onclick="playVideo(${i})">
    <div class="vthumb"><span class="pl" aria-hidden="true">Script ready</span><span class="dur">${esc(v[1])}</span></div>
    <div class="vb"><h4>${esc(v[0])}</h4><p>${esc(v[2])}</p></div></button>`).join("");
}
function playVideo(i){
  const v=VIDEOS[i];
  openModal(v[0],`<div class="vthumb" style="border-radius:12px;margin-bottom:14px"><span class="pl" aria-hidden="true">Script ready</span><span class="dur">${esc(v[1])}</span></div>
    <p style="font-size:13.5px"><b>${esc(v[2])}</b></p>
    <p style="font-size:13px;color:var(--muted);margin-top:8px">Video playback is a placeholder in this prototype — the page loads no external media, so it works with no network at all. A live deployment would stream from the state's own media service with captions in Marathi, Hindi and English, and a downloadable transcript.</p>
    <div class="note-b" style="margin-top:12px">Each film is tied to exactly one step of the mechanism, so it can be opened from inside that step when an officer is stuck rather than hunted for afterwards.</div>`);
}

/* ============================================================
   RESOURCES · LAWS · REPORTS · APPS
   ============================================================ */
const TPLS=[
 ["Outcome-based problem statement","v3.1","Rejects a statement that names a technology instead of a result."],
 ["Evaluation rubric","v2.0","Weights published before applications open; scores attributable to a named panellist."],
 ["Evidence Contract","v2.4","Buys R&D and evidence. Carries Annexures A–G including the anti-splitting record."],
 ["Rule 173(i) clause set","v1.6","Three variants — full, partial, none — selected by your risk cap."],
 ["Risk-cap worksheet","v1.3","Five axes, recorded as the stated basis for the relaxation granted."],
 ["DPDP data-processor annex","v2.2","Rule 6 safeguards, breach notification, deletion certificate."],
 ["Background / foreground IP annex","v1.4","Seller keeps background; State licences foreground."],
 ["Milestone & evidence schedule","v2.1","Each milestone names the evidence that closes it, written before work starts."],
 ["Sanction packet cover","v1.7","What the treasury route needs, in the order it expects it."],
 ["Pre-registered analysis plan","v1.2","Validator, method and stopping rules registered at challenge time."],
 ["Scale-up routing memo","v1.5","Records which tier was selected and on what facts."],
 ["Operator training annexure","v1.1","Names who runs the solution at handover, and funds their certification."]
];
const LAWS=[
 ["General Financial Rules 2017","Rules 154, 155, 157, 166, 170, 173 — the spine of everything here. Amended to 31 January 2023.","Ministry of Finance"],
 ["Digital Personal Data Protection Rules 2025","Rule 6 — reasonable security safeguards and the terms a Data Fiduciary must impose on a Processor.","MeitY"],
 ["Defence Acquisition Procedure 2020, Chapter III","iDEX products treated at par with proprietary sources; limited tender where several innovators succeed.","Ministry of Defence"],
 ["GeM Startup Runway","Listing route for DPIIT-recognised startups; buyer trial and catalogue procedure.","Government e-Marketplace"],
 ["Maharashtra Startup Policy 2025","Raises the Startup Week work-order ceiling to ₹25 lakh; state innovation commitments.","DSEEI / MSInS"],
 ["Maharashtra Stores Purchase Rules","State thresholds and MSME tender-fee and EMD exemptions. GR SPO-2014/Pra.Kra.82/Part-III/Industry-4.","Industries Department"],
 ["State Emblem of India (Prohibition of Improper Use) Act, 2005","Governs use of the national emblem — which is why this prototype carries the notice it does.","Government of India"],
 ["Right to Information Act, 2005","Every sealed KPI, rubric weight and validation report on this platform is designed to survive an RTI request.","Government of India"]
];
const REPORTS=[
 ["Quarterly programme report — Q4 FY26","MSInS","Challenges posted, pilots running, median posting-to-pilot days, payment SLA compliance across 11 departments."],
 ["Validation summary — Health cluster","IIT Bombay CTARA","Four pilots assessed against sealed criteria. One met them, one partially, two did not — and says so."],
 ["Payment timeliness report","Finance wing","Median evidence-to-sanction 11 days against a 15-day standard. Two packets returned incomplete, both corrected within 48 hours."],
 ["Scale-up routing log","MSInS","Every validated pilot and the tier it was routed to, with the facts that selected it."],
 ["Skill gap annual review","DSEEI","District-level demand and certified supply across six trades, feeding the District Skill Development Plans."],
 ["Grievance disposal report","Grievance officer","Tickets received, acknowledged within 24 hours, and closed within the service standard."]
];
const APPS=[
 ["GovStart Field","▣","Android","For enumerators and operators: offline milestone evidence capture, timestamped and hash-signed before it ever reaches a network."],
 ["GovStart Officer","▤","Android · iOS","For department officers: challenge status, packets awaiting acceptance, and validator reports, readable on a phone."],
 ["Seller Companion","◈","Android","For startups: milestone deadlines, payment status, and the exact evidence each tranche needs."],
 ["Grievance 24×7","◎","Android · Web","Raise and track a ticket, with the SLA clock visible to both sides."]
];
function resTab(k){
  if(!$("resPane"))return;
  ["tpl","laws","reports","apps"].forEach(x=>{const b=$("rt-"+x);if(b)b.setAttribute("aria-selected",String(x===k));});
  const el=$("resPane");
  if(k==="tpl"){
    el.innerHTML=`<p style="color:var(--muted);margin-bottom:16px;max-width:700px">Every artefact the mechanism depends on is a versioned template, not a one-off file — which is why the five-hundredth challenge is as rigorous as the first. Officers assemble; they do not draft.</p>
      <div class="grid g3">${TPLS.map(t=>`<div class="lcard"><div class="lh"><h4>${esc(t[0])}</h4><span class="tag n mono">${esc(t[1])}</span></div><p>${esc(t[2])}</p>
        <div class="meta"><button class="btn btn-o btn-sm" onclick="toast('Template preview is not bundled in this prototype — the clause text it contains is shown live inside step 1 and step 4 of the walkthrough.')">Preview</button></div></div>`).join("")}</div>`;
  } else if(k==="laws"){
    el.innerHTML=`<p style="color:var(--muted);margin-bottom:16px;max-width:700px">Nothing here asks for a change in the law. These are the instruments the mechanism is assembled from.</p>
      <div class="grid g2">${LAWS.map(l=>`<div class="lcard"><div class="lh"><h4>${esc(l[0])}</h4></div><p>${esc(l[1])}</p><div class="meta"><span>${esc(l[2])}</span></div></div>`).join("")}</div>
      <div class="note-b" style="margin-top:16px">Open <a href="#rules">the rule book</a> for the quoted text of each GFR provision and what it does at each step.</div>`;
  } else if(k==="reports"){
    el.innerHTML=`<p style="color:var(--muted);margin-bottom:16px;max-width:700px">Programme reporting is generated from the challenge records themselves, so the numbers cannot drift from what actually happened.</p>
      <div class="grid g2">${REPORTS.map((r,i)=>`<div class="lcard"><div class="lh"><h4>${esc(r[0])}</h4><span class="tag n">${esc(r[1])}</span></div><p>${esc(r[2])}</p>
        <div class="meta"><button class="btn btn-o btn-sm" onclick="openReport(${i})">Open summary</button></div></div>`).join("")}</div>`;
  } else {
    el.innerHTML=`<p style="color:var(--muted);margin-bottom:16px;max-width:700px">Field work happens where the network does not. Every app writes evidence offline first and hashes it before sync, so a timestamp cannot be quietly improved later.</p>
      <div class="grid g2">${APPS.map(a=>`<div class="appcard">
        <span class="appicon" style="background:var(--blue-s);color:var(--blue-t)" aria-hidden="true">${a[1]}</span>
        <div style="flex:1"><h4 style="font-size:15px">${esc(a[0])}</h4><p style="font-size:12.5px;color:var(--muted);margin-top:3px">${esc(a[3])}</p>
        <span class="tag n" style="margin-top:7px;display:inline-block">${esc(a[2])}</span></div>
        <span class="qr" role="img" aria-label="Placeholder QR code"></span></div>`).join("")}</div>
      <p class="cite" style="margin-top:12px">QR codes are placeholders. No app is published — these describe the field tooling a live deployment would need.</p>`;
  }
}
function openReport(i){
  const r=REPORTS[i];
  openModal(r[0],`<p class="cite" style="margin-bottom:12px">${esc(r[1])} · simulated demonstration data</p>
    <p style="font-size:13.5px">${esc(r[2])}</p>
    <div class="note-a" style="margin-top:14px"><b>Why these are public by default.</b> A programme that only publishes its successes teaches nobody anything, and an auditor will find the rest anyway. The validation summary above says two pilots out of four did not work — that number being non-zero is the evidence that the seal is doing its job.</div>`);
}

/* ============================================================
   HELP
   ============================================================ */
const HELP=[
 ["How do I turn a problem into a challenge?","Start at step 1 of the walkthrough. Write what result you need — the median wait falls below 60 minutes — and resist naming a technology. If your outcome statement contains the word 'app' or 'dashboard', you have specified a solution and quietly excluded a better one. The studio then attaches the legal envelope for you."],
 ["What if I set the risk cap wrong?","You can change it any time before publication, and the eligibility clause rewrites itself. After publication it is fixed, because it is the stated basis on which the relaxation was granted — moving it later is exactly the kind of thing an excluded bidder would challenge."],
 ["A startup I want is not DPIIT-recognised. Can I still use them?","Yes — they compete on standard eligibility. What you cannot do is apply the Rule 173(i) relaxation to them, because the rule reaches DPIIT-recognised startups only. Recognition is free and takes days, so the usual answer is to ask them to get it."],
 ["The startup wants live personal data. What do I do?","Treat it as an escalation, not a request. Record the justification, raise the risk cap — and accept that doing so reduces the relaxation you can lawfully grant. Most pilots that ask for live data do not actually need it; masked data with real structure answers the same question."],
 ["Payment is stuck. Where do I look?","Almost always at packet completeness rather than at the treasury. Open the milestone and check every line of the sanction packet is present. If it is complete and still stuck past the service standard, raise it under Grievance 24×7 — payment grievances carry a 7-day clock."],
 ["The pilot failed. What now?","Report it as failed. Nothing is procured, the department spent evidence money rather than a deployment budget, and the sealed criteria are what let you write that up honestly. Step 6 will tell you there is no route, which is the correct answer."],
 ["Two startups both succeeded. Who wins?","Neither, yet. That is the Tier 2 case: a limited tender restricted to the cohort that proved the outcome. Competition is preserved and contested only between firms that actually delivered."],
 ["Can another district just copy our deployment?","Not by direct award — each department would need its own justification. Route it through Tier 3 instead: the pilot doubles as the GeM Startup Runway trial, and once three government buyers have rated the product it joins the full catalogue, after which any department buys it with no tender at all."]
];

/* ============================================================
   GRIEVANCE 24x7
   ============================================================ */
let TICKETS=[];
function loadTickets(){try{TICKETS=JSON.parse(localStorage.getItem("gsb.tickets")||"[]");}catch(e){TICKETS=[];}}
function saveTickets(){try{localStorage.setItem("gsb.tickets",JSON.stringify(TICKETS));}catch(e){}}
function fileGrievance(){
  const txt=$("gv_txt").value.trim();
  if(txt.length<10){toast("Please describe the issue in a little more detail before submitting.");$("gv_txt").focus();return;}
  const type=$("gv_type").value;
  const pay=type.indexOf("Payment")===0;
  TICKETS.unshift({
    id:"GRV/2026/"+String(4100+TICKETS.length+Math.floor(Math.random()*40)),
    type,who:$("gv_who").value,ref:$("gv_ref").value.trim(),txt,
    at:new Date().toISOString().slice(0,16).replace("T"," "),
    sla:pay?7:15,status:"Acknowledged"
  });
  saveTickets();renderTickets();
  $("gv_txt").value="";$("gv_ref").value="";
  toast("Ticket raised and acknowledged. Stored in your browser only — nothing was transmitted.");
}
function renderTickets(){
  if(!$("grvList"))return;
  if(!TICKETS.length){
    $("grvList").innerHTML='<div class="card" style="text-align:center;color:var(--muted);font-size:13px">No tickets yet. Raise one on the left and it will appear here with its clock running.</div>';
    return;
  }
  $("grvList").innerHTML=TICKETS.map((t,i)=>`<div class="ticket">
    <div style="flex:1;min-width:200px">
      <span class="tid">${esc(t.id)}</span>
      <b>${esc(t.type)}</b>
      <span style="font-size:12px;color:var(--muted)">${esc(t.who)} · raised ${esc(t.at)}${t.ref?" · "+esc(t.ref):""}</span>
    </div>
    <div style="text-align:right">
      <span class="tag ${t.status==="Closed"?"g":"a"}">${esc(t.status)}</span>
      <div class="cite" style="margin-top:4px">${t.sla}-day standard</div>
    </div>
    <div style="display:flex;gap:6px">
      ${t.status==="Closed"?"":`<button class="btn btn-o btn-sm" onclick="closeTicket(${i})">Mark resolved</button>`}
      <button class="btn btn-o btn-sm" onclick="dropTicket(${i})" aria-label="Delete ticket">Delete</button>
    </div>
  </div>`).join("");
}
function closeTicket(i){TICKETS[i].status="Closed";saveTickets();renderTickets();toast("Ticket "+TICKETS[i].id+" marked resolved.");}
function dropTicket(i){const id=TICKETS[i].id;TICKETS.splice(i,1);saveTickets();renderTickets();toast("Ticket "+id+" deleted from your browser.");}

/* ============================================================
   ASSISTANT — documents, live photo, voice
   Everything runs locally. No upload, no key, no network call.
   ============================================================ */
let camStream=null, recog=null, speakOn=false, docText="";
function aiStage(html){const s=$("aiStage");if(!html){s.hidden=true;s.innerHTML="";return;}s.hidden=false;s.innerHTML=html;}
function toolPressed(k,v){const b=$("tl-"+k);if(b)b.setAttribute("aria-pressed",String(v));}
function clearTools(except){["doc","pic","voice"].forEach(k=>{if(k!==except)toolPressed(k,false);});}

function aiTool(k){
  if(!$("aiP").classList.contains("open"))toggleAI();
  if(k==="doc"){stopCam();clearTools("doc");toolPressed("doc",true);
    aiStage(`<div class="filedrop" onclick="document.getElementById('aiFile').click()">
      <b>Choose a document or image</b><br>.txt · .csv · .json · .md · .pdf · photo<br>
      <span style="font-size:11px">Read in your browser. Nothing is uploaded.</span></div>
      <div class="srow"><button onclick="aiStage('');clearTools()">Close</button></div>`);
    return;}
  if(k==="pic"){clearTools("pic");toolPressed("pic",true);startCam();return;}
  if(k==="voice"){clearTools("voice");startVoice();return;}
  if(k==="speak"){speakOn=!speakOn;toolPressed("speak",speakOn);
    if(!speakOn&&window.speechSynthesis)window.speechSynthesis.cancel();
    toast(speakOn?"Answers will now be read aloud.":"Read-aloud turned off.");return;}
}

/* ---- documents ---- */
function handleFile(input){
  const f=input.files&&input.files[0];if(!f)return;
  const kb=(f.size/1024).toFixed(1);
  if(/^image\//.test(f.type)){
    const r=new FileReader();
    r.onload=e=>{aiStage(`<img src="${e.target.result}" alt="Image you selected">
      <div class="srow"><button class="pri" onclick="analysePic('file')">Analyse this image</button><button onclick="aiStage('');clearTools()">Close</button></div>`);};
    r.readAsDataURL(f);input.value="";return;
  }
  if(/\.pdf$/i.test(f.name)){
    docText="";
    addMsg("Document attached: "+f.name+" ("+kb+" KB).","user");
    setTimeout(()=>addMsg("I can see the file and its size, but this prototype does not bundle a PDF text extractor — that would mean shipping a parser library, and this page deliberately loads nothing external.\n\nIn a live deployment the PDF would be parsed server-side and its text used as retrieval context, so I could answer questions like \"does this draft challenge notice contain the Rule 173(i) clause?\"\n\nA .txt, .csv, .md or .json file works fully right now.","bot","prototype limit"),260);
    input.value="";aiStage("");clearTools();return;
  }
  const r=new FileReader();
  r.onload=e=>{
    docText=String(e.target.result||"").slice(0,20000);
    addMsg("Document attached: "+f.name+" ("+kb+" KB).","user");
    setTimeout(()=>{const a=readDoc(f.name,docText);addMsg(a.a,"bot",a.r);say(a.a);},280);
  };
  r.readAsText(f);input.value="";aiStage("");clearTools();
}
function readDoc(name,t){
  const low=t.toLowerCase(),words=t.trim().split(/\s+/).filter(Boolean).length;
  const checks=[
    ["Rule 173(i) relaxation clause",/173\s*\(?i\)?|prior turnover|prior experience/.test(low)],
    ["Technical floor kept non-relaxable",/technical (floor|specification)|quality & technical|quality and technical/.test(low)],
    ["Bid security / EMD waiver (Rule 170(i))",/170\s*\(?i\)?|bid security|emd|earnest money/.test(low)],
    ["Measurable success criteria with a baseline",/baseline|median|kpi|target/.test(low)],
    ["Declared progression pathway",/progress|deployment contract|scale[- ]up|tier/.test(low)],
    ["Named independent validator",/validator|validation/.test(low)],
    ["Anti-splitting record (Rule 157)",/157|piecemeal|separate object/.test(low)],
    ["Data protection terms (DPDP Rule 6)",/dpdp|data protection|processor|masked|synthetic/.test(low)],
    ["IP position stated",/intellectual property|background ip|foreground/.test(low)]
  ];
  const hit=checks.filter(c=>c[1]).length;
  return {a:"I read "+name+" locally — "+words.toLocaleString("en-IN")+" words, never uploaded.\n\nChecking it against the challenge-notice checklist:\n\n"
    +checks.map(c=>(c[1]?"✓ ":"✗ ")+c[0]).join("\n")
    +"\n\n"+hit+" of 9 present. "+(hit>=7?"That is close to publishable — fix the gaps above and Challenge Studio will inject the standard wording for each."
      :hit>=4?"Roughly half the legal envelope is missing. Paste your outcome into step 1 and let the studio attach the rest rather than drafting it by hand."
      :"This does not look like a challenge notice yet. If it is a problem description, that is exactly what step 1 is for.")
    ,r:"local text scan · no upload"};
}

/* ---- live photo ---- */
function startCam(){
  aiStage(`<div style="padding:14px;text-align:center;color:var(--muted);font-size:12px">Requesting camera…</div>`);
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){camFallback("This browser exposes no camera API.");return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(st=>{
    camStream=st;
    aiStage(`<video id="aiVid" autoplay playsinline muted></video>
      <div class="srow"><button class="pri" onclick="snap()">Capture</button><button onclick="stopCam();aiStage('');clearTools()">Close</button></div>`);
    const v=$("aiVid");if(v){v.srcObject=st;}
  }).catch(err=>camFallback(err&&err.name==="NotAllowedError"?"Camera permission was declined.":"The camera could not be opened here — browsers block it on local files opened directly from disk."));
}
function camFallback(why){
  stopCam();
  aiStage(`<div class="filedrop" onclick="document.getElementById('aiFile').click()">
    <b>Camera unavailable</b><br><span style="font-size:11px">${esc(why)}</span><br>
    <span style="font-size:11px">Tap to pick a photo instead — your phone will offer its camera.</span></div>
    <div class="srow"><button onclick="aiStage('');clearTools()">Close</button></div>`);
}
function stopCam(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}}
function snap(){
  const v=$("aiVid");if(!v)return;
  const c=document.createElement("canvas");
  c.width=v.videoWidth||640;c.height=v.videoHeight||480;
  c.getContext("2d").drawImage(v,0,0,c.width,c.height);
  const url=c.toDataURL("image/jpeg",0.8);
  stopCam();
  aiStage(`<img src="${url}" alt="Captured frame">
    <div class="srow"><button class="pri" onclick="analysePic('camera')">Analyse this photo</button><button onclick="aiStage('');clearTools()">Close</button></div>`);
}
function analysePic(src){
  aiStage("");clearTools();
  addMsg(src==="camera"?"[Photo captured from camera]":"[Image attached]","user");
  setTimeout(()=>{
    const a="I have the image in the page — it was never uploaded, and this prototype ships no vision model, so I will not pretend to have recognised what is in it.\n\nWhat this is for in a live deployment: a field officer photographs milestone evidence — an installed sensor, a queue display, a signed muster — and the app hashes the frame with its timestamp and location before it can reach a network. That is what makes the evidence hard to improve later.\n\nThe hash is the honest part. The recognition is a convenience.";
    addMsg(a,"bot","prototype limit · M10 evidence capture");say(a);
  },300);
}

/* ---- voice in / out ---- */
function startVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toolPressed("voice",false);
    toast("This browser has no speech recognition. Chrome on desktop or Android supports it; it also needs a network connection.");return;}
  if(recog){try{recog.stop();}catch(e){}recog=null;toolPressed("voice",false);aiStage("");return;}
  try{
    recog=new SR();recog.lang="en-IN";recog.interimResults=true;recog.continuous=false;
    toolPressed("voice",true);
    aiStage(`<div style="padding:12px;background:var(--w);border:1px solid var(--line);border-radius:10px">
      <span class="rec">Listening…</span><div id="vTxt" style="font-size:13px;margin-top:7px;color:var(--muted)">Say something like “why can’t we award it to the winner?”</div></div>
      <div class="srow"><button onclick="stopVoice()">Stop</button></div>`);
    recog.onresult=e=>{
      let t="";for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;
      const el=$("vTxt");if(el){el.textContent=t;el.style.color="var(--ink)";}
      if(e.results[e.results.length-1].isFinal){stopVoice();if(t.trim())askAI(t.trim());}
    };
    recog.onerror=ev=>{stopVoice();
      toast(ev&&ev.error==="not-allowed"?"Microphone permission was declined."
        :ev&&ev.error==="network"?"Speech recognition needs a network connection — it is not an on-device feature in this browser."
        :"Speech recognition could not start here.");};
    recog.onend=()=>{toolPressed("voice",false);};
    recog.start();
  }catch(e){toolPressed("voice",false);toast("Speech recognition could not start in this context.");}
}
function stopVoice(){if(recog){try{recog.stop();}catch(e){}recog=null;}toolPressed("voice",false);aiStage("");}
function say(text){
  if(!speakOn||!window.speechSynthesis)return;
  try{
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(String(text).replace(/[•✓✗◆]/g,"").slice(0,700));
    u.lang="en-IN";u.rate=1.02;window.speechSynthesis.speak(u);
  }catch(e){}
}

/* ============================================================
   PORTAL INIT
   ============================================================ */
function initPortal(){
  renderDivisions();
  renderCats();renderMarket();
  skillTab("skill");
  renderSchemes();
  renderGap();
  renderTraining();
  resTab("tpl");
  if($("helpAcc"))acc($("helpAcc"),HELP.map(h=>[h[0],"",null,h[1]]));
  loadTickets();renderTickets();
}


/* ============================================================
   GIGW CHROME — language, high contrast, policies, counter
   ============================================================ */
const I18N={
 gov:["Government of Maharashtra","महाराष्ट्र शासन"],
 skip:["Skip to main content","मुख्य मजकुरावर जा"],
 sr:["Screen reader access","स्क्रीन रीडर प्रवेश"],
 hc:["High contrast","उच्च विरोधाभास"],
 dept:["Department of Skills, Employment, Entrepreneurship & Innovation · Maharashtra State Innovation Society",
       "कौशल्य, रोजगार, उद्योजकता व नावीन्यता विभाग · महाराष्ट्र राज्य नावीन्यता सोसायटी"],
 tagline:["Innovation procurement · SIH26136","नावीन्यता खरेदी प्रक्रिया · SIH26136"],
 nav_run:["Run a challenge","आव्हान चालवा"],
 nav_mech:["The mechanism","यंत्रणा"],
 nav_ev:["Evidence &amp; rules","पुरावे व नियम"],
 nav_dept:["Department services","विभागीय सेवा"],
 nav_market:["Marketplace","बाजारपेठ"],
 nav_skill:["Skills &amp; Livelihood","कौशल्य व उपजीविका"],
 nav_rules:["Rule book","नियमपुस्तिका"],
 nav_about:["About us","आमच्याविषयी"],
 nav_griev:["Grievance","तक्रार निवारण"],
 login:["Buyer login","खरेदीदार लॉगिन"],
 home:["Home","मुख्यपृष्ठ"],
 crumb:["Innovation Procurement Mechanism","नावीन्यता खरेदी यंत्रणा"],
 updated:["Last updated","शेवटचे अद्यतन"],
 visitors:["Visitors","अभ्यागत"],
 owned:["Content owned and maintained by","आशय मालकी व देखभाल"],
 devby:["Designed and developed as a hackathon prototype","हॅकेथॉन नमुना म्हणून तयार केलेले"],
 p_web:["Website Policies","संकेतस्थळ धोरणे"],
 p_terms:["Terms &amp; Conditions","अटी व शर्ती"],
 p_copy:["Copyright Policy","कॉपीराइट धोरण"],
 p_hyper:["Hyperlinking Policy","हायपरलिंक धोरण"],
 p_priv:["Privacy Policy","गोपनीयता धोरण"],
 p_disc:["Disclaimer","अस्वीकरण"],
 p_acc:["Accessibility Statement","सुलभता विधान"],
 p_sr:["Screen Reader Access","स्क्रीन रीडर प्रवेश"],
 p_help:["Help","मदत"],
 p_fb:["Feedback","अभिप्राय"],
 p_site:["Sitemap","साइटमॅप"],
 p_wim:["Web Information Manager","वेब माहिती व्यवस्थापक"]
};
let LANG=0; // 0 = English, 1 = Marathi
function applyLang(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k=el.dataset.i18n, v=I18N[k];
    if(k==="crumb"){                       // per-page label, with optional Marathi
      const mr=el.dataset.mr;
      if(LANG===1&&mr) el.innerHTML=mr;
      else if(LANG===0&&el.dataset.en) el.innerHTML=el.dataset.en;
      return;
    }
    if(v) el.innerHTML=v[LANG];
  });
  document.documentElement.lang = LANG? "mr":"en";
  document.body.classList.toggle("lang-mr", LANG===1);
  const b=$("langBtn");
  if(b) b.innerHTML = LANG? '<span class="on">English</span>' : '<span lang="mr" class="on">मराठी</span>';
}
function toggleLang(){
  LANG=LANG?0:1; applyLang();
  try{localStorage.setItem("gsb.lang",LANG);}catch(e){}
  toast(LANG
    ? "मराठी आवृत्ती: या नमुन्यात फक्त शीर्षलेख, मेनू व तळटीप अनुवादित आहेत. मुख्य आशय अद्याप इंग्रजीत आहे."
    : "Switched to English. In this prototype only the government chrome, menus and footer are translated — the body content is still English only.");
}
function toggleHC(){
  const on=document.body.classList.toggle("hc");
  $("hcBtn").setAttribute("aria-pressed",String(on));
  try{localStorage.setItem("gsb.hc",on?"1":"0");}catch(e){}
  toast(on?"High contrast mode on — yellow on black, as GIGW requires for low-vision users."
          :"High contrast mode off.");
}
function visitorCount(){
  let n=0;
  try{
    n=parseInt(localStorage.getItem("gsb.visits")||"0",10);
    if(!sessionStorage.getItem("gsb.counted")){n+=1;localStorage.setItem("gsb.visits",n);sessionStorage.setItem("gsb.counted","1");}
  }catch(e){n=1;}
  const base=48213+n;
  ["visCount","visCount2"].forEach(id=>{const el=$(id);if(el)el.textContent=base.toLocaleString("en-IN");});
}
const POLICIES={
 website:["Website Policies","<p>This prototype follows the patterns set out in the <b>Guidelines for Indian Government Websites and Apps (GIGW 3.0)</b>, issued by the National Informatics Centre under MeitY: a standard government masthead with the State Emblem, an accessibility toolbar, bilingual chrome, breadcrumbs, a last-updated stamp, and this statutory policy block.</p><p>GIGW compliance in a real deployment is verified by an <b>STQC audit</b>. This page has not been audited and does not claim certification.</p>"],
 terms:["Terms &amp; Conditions","<p>This page is an academic prototype prepared for Smart India Hackathon 2026 (problem statement SIH26136). It offers <b>no government service</b>, creates no legal relationship, and forms no part of any procurement process.</p><p>Nothing displayed here — challenges, sellers, listings, schemes, reports, contact details or figures — is real. No transaction can be performed and no application can be submitted.</p>"],
 copyright:["Copyright Policy","<p>The material in this prototype is the work of the SIH26136 team, except for the State Emblem of India and the seal of the Government of Maharashtra, which remain the property of the respective governments and appear here only to illustrate how an official deployment would be branded.</p><p>Use of the State Emblem is governed by the <b>State Emblem of India (Prohibition of Improper Use) Act, 2005</b>. Statutory text quoted from the General Financial Rules 2017, DPDP Rules 2025 and DAP 2020 is Government of India material reproduced for study.</p>"],
 hyper:["Hyperlinking Policy","<p>This prototype links to no external site and loads no external resource — no fonts, no scripts, no analytics, no images from any other host. Every asset is embedded in the single HTML file, which is why it works with no network connection at all.</p><p>A live deployment linking out to other government portals would not imply endorsement of their content.</p>"],
 privacy:["Privacy Policy","<p><b>This page collects nothing.</b> There is no server, no account, no analytics and no cookie. Nothing you type — a challenge draft, a grievance, a login form — is transmitted anywhere.</p><p>Some state is kept in your own browser's <code>localStorage</code> so a demo survives a page reload: your challenge draft, your grievance tickets, your language and contrast choice. Clearing your browser data removes all of it. It never leaves your device.</p><p>A live deployment would sit under the <b>Digital Personal Data Protection Act 2023</b> and the DPDP Rules 2025, with the department as Data Fiduciary — the same allocation the sandbox design in step 4 is built around.</p>"],
 disclaimer:["Disclaimer","<p>This is <b>not an official portal</b> of the Government of Maharashtra, the Maharashtra State Innovation Society, or any government department, and it is not endorsed, hosted or certified by them.</p><p>Government names and emblems appear for proposal context only. All data is simulated. Statutory provisions are quoted in good faith from published sources, but the reading of them offered here is the team's own argument, not legal advice or a government position.</p>"],
 accessibility:["Accessibility Statement","<p>This prototype targets <b>WCAG 2.1 Level AA</b>, the baseline GIGW 3.0 adopts. Implemented here:</p><ul style='padding-left:20px;line-height:1.9'><li>Skip-to-main-content link as the first focusable element</li><li>Text resize to 120% and 140% without loss of content</li><li>High contrast mode (yellow on black)</li><li>Every form control has a label or an accessible name</li><li>Semantic landmarks, ARIA on tabs, menus and dialogs</li><li>Visible keyboard focus, Escape closes dialogs, arrow keys move through the walkthrough</li><li>Respects <code>prefers-reduced-motion</code></li><li>Unicode Marathi in the government chrome</li></ul><p style='margin-top:10px'><b>Not yet done:</b> a full screen-reader pass with NVDA and JAWS, and an independent audit. Both would be required before any real deployment.</p>"],
 screen:["Screen Reader Access","<p>This prototype is built with semantic HTML and ARIA so it can be read by assistive technology. It has been structured for, but <b>not yet formally tested with</b>, the screen readers commonly listed by Indian government portals:</p><ul style='padding-left:20px;line-height:1.9'><li>NVDA — free, nvaccess.org</li><li>JAWS — commercial, freedomscientific.com</li><li>Orca — free, bundled with GNOME</li><li>ChromeVox — free Chrome extension</li><li>Narrator — bundled with Windows</li><li>VoiceOver — bundled with macOS and iOS</li></ul><p style='margin-top:10px'>The assistant panel also has a <b>Read out</b> tool that speaks answers aloud using the browser's own speech synthesis.</p>"],
 feedback:["Feedback","<p>In a live deployment this opens a feedback form routed to the Web Information Manager, with an acknowledgement within 24 hours.</p><p>For this prototype, feedback belongs with the SIH26136 team. If something on this page is wrong — a misread rule, a bad Marathi string, a broken control — that is exactly the kind of thing worth reporting before the submission goes in.</p>"],
 sitemap:["Sitemap","<p>Every section of this single-page prototype:</p><div style='columns:2;font-size:13px;line-height:1.95'><a href='#why' onclick='closeModal()'>Why it's hard</a><br><a href='#flow' onclick='closeModal()'>Run a challenge (6 steps)</a><br><a href='#market' onclick='closeModal()'>Marketplace</a><br><a href='#skills' onclick='closeModal()'>Skills &amp; Livelihood</a><br><a href='#schemes' onclick='closeModal()'>Skill development schemes</a><br><a href='#gap' onclick='closeModal()'>Skill gap report</a><br><a href='#training' onclick='closeModal()'>Training</a><br><a href='#videos' onclick='closeModal()'>Training videos</a><br><a href='#resources' onclick='closeModal()'>Resources &amp; templates</a><br><a href='#laws' onclick='closeModal()'>Government laws</a><br><a href='#reports' onclick='closeModal()'>Working reports</a><br><a href='#apps' onclick='closeModal()'>Apps</a><br><a href='#rules' onclick='closeModal()'>Rule book</a><br><a href='#qa' onclick='closeModal()'>Judge's questions</a><br><a href='#help' onclick='closeModal()'>Help centre</a><br><a href='#about' onclick='closeModal()'>About us</a><br><a href='#grievance' onclick='closeModal()'>Grievance 24×7</a><br><a href='#contact' onclick='closeModal()'>Contacts</a></div>"],
 wim:["Web Information Manager","<p>GIGW requires every government site to name a responsible officer with contact details, so a citizen always has a named human to reach.</p><div class='kv' style='margin-top:12px'><dt>Designation</dt><dd>Web Information Manager, MSInS</dd><dt>Office</dt><dd>Maharashtra State Innovation Society, Bandra East, Mumbai 400051</dd><dt>Responsibility</dt><dd>Content accuracy, accessibility compliance, grievance escalation</dd></div><p class='formnote'>Illustrative for the prototype — no such officer has been designated for this page, because it is not a government service.</p>"]
};
function openPolicy(k){
  const p=POLICIES[k]; if(!p) return;
  closeMenus();
  openModal(p[0],p[1]+"<p class='formnote' style='margin-top:14px'><b>Prototype notice.</b> These policy pages mirror what GIGW requires of a real government site. They describe this prototype honestly — they are not the policies of any government body.</p>");
}


/* ===== Maharashtra revenue divisions (real administrative structure; figures simulated) ===== */
const DIVISIONS=[
 ["Konkan","कोकण","Mumbai City, Mumbai Suburban, Thane, Palghar, Raigad, Ratnagiri, Sindhudurg",7,4,"Dense urban service delivery — hospital queues, transport, municipal grievance load."],
 ["Pune","पुणे","Pune, Satara, Sangli, Solapur, Kolhapur",5,3,"The state's deepest startup bench. Most first-time government suppliers are registered here."],
 ["Nashik","नाशिक","Nashik, Dhule, Jalgaon, Ahilyanagar, Nandurbar",5,2,"Agriculture and irrigation. Nandurbar adds a tribal-belt access problem worth designing for."],
 ["Chh. Sambhajinagar","छत्रपती संभाजीनगर","Chh. Sambhajinagar, Jalna, Parbhani, Hingoli, Beed, Nanded, Latur, Dharashiv",8,2,"Marathwada — water scarcity and drought response dominate the problem set."],
 ["Amravati","अमरावती","Amravati, Akola, Washim, Buldhana, Yavatmal",5,1,"Cotton belt. Farmer distress makes subsidy-leakage and grievance problems urgent."],
 ["Nagpur","नागपूर","Nagpur, Wardha, Bhandara, Gondia, Chandrapur, Gadchiroli",6,3,"Vidarbha. Gadchiroli is the hardest last-mile case in the state, and the best test of the mechanism."]
];
function renderDivisions(){
  const el=$("divGrid"); if(!el) return;
  el.innerHTML=DIVISIONS.map(d=>`<article class="divcard">
    <h4>${esc(d[0])}</h4><span class="mr" lang="mr">${esc(d[1])}</span>
    <div class="nums">
      <span><b>${d[3]}</b><span>Districts</span></span>
      <span><b>${d[4]}</b><span>Live pilots</span></span>
    </div>
    <p>${esc(d[5])}</p>
  </article>`).join("");
}

/* ===== landing page: three live proof teasers =====
   These reuse sha256(), relax() and the tier logic rather than duplicating them. */
function proofSeal(){
  const el=$("pf_kpi"); if(!el) return;
  const SEALED="≤ 60 min";
  const live=sha256(JSON.stringify({target:el.value}));
  const ref =sha256(JSON.stringify({target:SEALED}));
  $("pf_hash").textContent=live;
  const ok=live===ref, st=$("pf_state");
  st.className="ministate "+(ok?"ok":"bad");
  st.textContent=ok?"✓ Matches the published seal":"⚠ Seal broken — the bar moved, and anyone can prove it";
}
function proofRisk(){
  const el=$("pf_risk"); if(!el) return;
  const v=parseInt(el.value,10);
  const r=v<=5?["Full relaxation lawful","ok"]
        :v<=11?["Partial relaxation","warn"]
              :["No relaxation — shrink the pilot instead","bad"];
  const st=$("pf_relax");
  st.className="ministate "+r[1];
  st.textContent=v+"/20 · "+r[0];
}
function proofTier(){
  const el=$("pf_case"); if(!el) return;
  const m={gr:["Tier 1 — Proprietary Article Certificate","ok"],
           nogr:["Tier 3 — Tier 1 needs a state GR, so it falls back","warn"],
           multi:["Tier 2 — limited tender to the winners","ok"],
           wide:["Tier 3 — GeM catalogue replication","ok"],
           fail:["No route — and that is the system working","bad"]}[el.value];
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

/* ===== deep links: page.html#tab arrives with that tab open ===== */
function applyHash(){
  const h=(location.hash||"").replace(/^#\/?/,"");
  if(!h)return;
  if($("mtype")&&["product","service","skill"].includes(h)){$("mtype").value=h;renderMarket();}
  if($("skillPane")&&["skill","employment","entre"].includes(h))skillTab(h);
  if($("resPane")&&["tpl","laws","reports","apps"].includes(h))resTab(h);
  const el=document.getElementById(h);
  if(el&&!["mtype","skillPane","resPane"].includes(h))scrollTo_(el);
}
addEventListener("hashchange",applyHash);


/* ============================================================
   SITE SEARCH - offline, over a prebuilt index. No server.
   ============================================================ */
const SEARCH_INDEX=[{"u":"about.html","t":"About us","c":"About us","a":"","d":"Who runs this, and why","k":"about us who runs why govstart bridge mechanism proposed maharashtra state innovation society under department skills employment entrepreneurship amp answer smart india hackathon problem statement sih26136 msins already startup week annual cohort competition issues work orders up 15 lakh 25 2025 policy) 24 startups year departmental pilots works also supply led stops pilot our proposal make standing demand round give every validated lawful route actual purchase order using only instruments exist general financial rules one design rule claim could survive procurement officer reading book does go we deleted two claims own first draft basis they listed judge questions serves departments post problems host buy outcomes dpiit recognised incl time suppliers contracting party programme manager evaluators panel scoring against published rubric validators independent appointed before results citi"},{"u":"apps.html","t":"Apps","c":"Resources › Apps","a":"","d":"Apps","k":"apps resources field tooling"},{"u":"become-a-seller.html","t":"Become a seller","c":"Marketplace › Become a seller","a":"","d":"Onboarding","k":"become seller marketplace onboarding"},{"u":"buyer-background.html","t":"Buyer background","c":"Buyers › Background","a":"","d":"Verification &amp; authority limits","k":"buyer background buyers verification amp authority limits"},{"u":"buyer-login.html","t":"Buyer login","c":"Buyers › Sign in","a":"sign in otp officer account access password","d":"Departmental officers","k":"buyer login buyers sign departmental officers"},{"u":"buyer-registration.html","t":"Buyer registration","c":"Buyers › Register","a":"","d":"New department, ULB or ZP","k":"buyer registration buyers register new department ulb zp"},{"u":"categories.html","t":"Categories","c":"Marketplace › Categories","a":"","d":"Browse by category","k":"categories marketplace open 24 all demand browse category everything listed here has come through six step mechanism above gem startup runway route feeds filter what kind thing you need products amp services only skill purchases most adopted newest lowest price"},{"u":"contact.html","t":"Contacts","c":"Contacts","a":"","d":"Where to reach a human","k":"contacts where reach human illustrative contact details prototype live channels maharashtra state innovation society programme office contracting party every evidence contract address msins skills amp entrepreneurship bhavan bandra east mumbai 400051 desk mon fri 10 00 17 45 helpline sellers departments citizens toll free 1800 xxx xxxx 24 grievances 18 everything else languages english escalation sla missed grievance officer working days chief executive principal secretary dseei 15"},{"u":"department-services.html","t":"Department services","c":"Department services","a":"","d":"Department services","k":"department services skills employment entrepreneurship amp innovation govstart bridge sits inside working these surround mdash they part procurement mechanism what plugs into livelihood rsquo three mandates schemes behind them skill courses assessment certification open rarr vacancies melas placement incubation credit mentoring development check you eligible evidence reporting tells where act gap report demand against certified supply district reports quarterly programme field apps offline first capture learn get help officers sellers evaluators citizens training six tracks one per role videos short films step grievance 24 times raise ticket clock"},{"u":"employment.html","t":"Employment","c":"Skills › Employment","a":"","d":"Employment","k":"employment skills mandate two three every pilot scales small event mechanism makes visible instead incidental"},{"u":"entrepreneurship.html","t":"Entrepreneurship","c":"Skills › Entrepreneurship","a":"","d":"Entrepreneurship","k":"entrepreneurship skills mandate three hardest part selling government surviving sales cycle milestone payments what make financeable"},{"u":"government-laws.html","t":"Government laws","c":"Resources › Government laws","a":"gfr dpdp dap gem act rules statute law","d":"Government laws","k":"government laws resources reference"},{"u":"grievance.html","t":"Grievance 24×7","c":"Grievance redressal","a":"complaint ticket sla payment delay escalation redressal 24x7","d":"Grievance redressal","k":"grievance 24 redressal open startup paid time excluded bidder thinks relaxation wrongly granted department cannot get validator assigned all lands here clock raise category payment delayed beyond milestone sla eligibility screening decision evaluation panel conduct data protection sandbox concern marketplace listing seller other challenge contract reference optional you officer citizen evaluator what happened submit prototype only ticket stored your own browser sent nowhere real deployment route departmental mirror state portal tickets service standard acknowledgement within hours first substantive response working days grievances carry day resolution because waiting lakh does have quarter spare seven sahyadri range raigad district"},{"u":"help.html","t":"Help","c":"Help centre","a":"","d":"How do I…?","k":"help centre how do eight things people actually get stuck"},{"u":"index.html","t":"Home","c":"Welcome","a":"","d":"What do you want to do?","k":"home welcome department cannot buy innovation evidence product indian procurement law has instrument buying govstart bridge mechanism works anyway without changing single rule see how try pratapgad fort satara district 9660 start here why rsquo hard gap exists close overview all six steps glance middot define problem write outcome seal criteria cap risk five axes decide relaxation who eligible screened turnover run design pilot sandbox milestones amp validate independent check against lawfully tier mdash route where runs revenue divisions every choice carries forward your answers stay browser marketplace browse categories eight demand products deployable goods devices services managed skill purchase 24 times trainers assessors courseware sellers about seller profile licences track record licence registration what each unlocks become listing earned buyer access login departmental officers"},{"u":"judges-questions.html","t":"Judge's questions","c":"Judge's questions","a":"","d":"The questions a procurement-side judge will ask","k":"judge questions straight answers procurement side ask including two claims we had delete our own first draft once checked them"},{"u":"licence.html","t":"Licence &amp; registration","c":"Marketplace › Licence","a":"dpiit udyam gst msme registration certificate iso","d":"What each registration unlocks","k":"licence amp registration marketplace what each unlocks"},{"u":"marketplace.html","t":"Marketplace","c":"Marketplace","a":"buy product service listing seller catalogue vendor","d":"The marketplace departments buy from","k":"marketplace open 24 products services skills departments buy everything listed here has come through six step mechanism above gem startup runway route feeds filter category what kind thing you need amp only skill purchases most adopted newest lowest price cleared validation gate listing reaches promise each one carries evidence independent validator checked against criteria sealed before anyone saw solution vineyards near nashik"},{"u":"products.html","t":"Products","c":"Marketplace › Products","a":"","d":"Products departments buy","k":"products marketplace deployable goods amp devices departments buy everything listed here has come through six step mechanism above gem startup runway route feeds filter category what kind thing you need services only skill purchases most adopted newest lowest price"},{"u":"resources.html","t":"Resources","c":"Resources","a":"","d":"Everything you may need to take away","k":"resources everything you need take away templates government laws working reports apps"},{"u":"rule-book.html","t":"Rule book","c":"Rule book","a":"173 170 166 157 154 155 gfr statute law legal provision quoted","d":"The rule book behind each step","k":"rule book everything traced something already exists behind each step open any row provision what does here quoted paraphrased"},{"u":"run-a-challenge.html","t":"Run a challenge","c":"Run a challenge","a":"","d":"Run a real challenge, start to finish","k":"run challenge whole mechanism six steps real start finish every choice you make carries forward risk set decides who eligible what pilot proves which purchase route lawful use keys move between step define problem cap see design validate buy lawfully pages your answers kept browser write outcome need freeze success criteria hash before anyone shows solution five sliders blast radius how much rule 173(i) eligibility decided just turnover pick goes into evidence contract data startup gets each milestone must produce release milestones let validator recompute seal mark paper platform picks tier facts already holds tells there begin narrows next follows prove kaas plateau satara"},{"u":"schemes.html","t":"Skill development schemes","c":"Skill development schemes","a":"scheme yojana subsidy eligibility grant abhiyan","d":"Find what you are actually eligible for","k":"skill development schemes find what you actually eligible answer three things list narrows nothing submitted runs your browser details candidate looking training startup msme government department age 15 17 18 29 30 45 over district nagpur pune nashik mumbai suburban gadchiroli education below class 10 12 iti diploma graduate above"},{"u":"sellers.html","t":"About a seller","c":"Marketplace › About a seller","a":"","d":"Seller profile","k":"about seller marketplace profile"},{"u":"services.html","t":"Services","c":"Marketplace › Services","a":"","d":"Services departments buy","k":"services marketplace managed outcome departments buy everything listed here has come through six step mechanism above gem startup runway route feeds filter category what kind thing you need products amp only skill purchases most adopted newest lowest price"},{"u":"skill-gap.html","t":"Skill gap report","c":"Skill gap report","a":"demand supply trades district shortage workforce vacancy","d":"Where demand outruns supply","k":"skill gap report simulated demonstration data where demand outruns supply what tells department which problems worth challenge training provider teach pick district nagpur pune nashik mumbai suburban gadchiroli how calculated download csv annual (posts) certified"},{"u":"skill-purchase.html","t":"Skill purchase 24×7","c":"Marketplace › Skill purchase","a":"","d":"Skill purchase, open 24×7","k":"skill purchase 24 marketplace trainers assessors courseware enumerators open everything listed here has come through six step mechanism above gem startup runway route feeds filter category what kind thing you need products amp services only purchases most adopted newest lowest price"},{"u":"skill.html","t":"Skill","c":"Skills › Skill","a":"","d":"Skill","k":"skill skills mandate one three validated solution useless nobody district run mechanism buys training same breath"},{"u":"skills.html","t":"Skills & Livelihood","c":"Skills & Livelihood","a":"","d":"Skill, Employment, Entrepreneurship","k":"skills livelihood department three mandates skill employment entrepreneurship same mechanism serves all validated pilot creates jobs needs trained people run usually built young firm help growing kaas plateau satara"},{"u":"step-1-define-the-problem.html","t":"Step 1 — Define the problem","c":"Run a challenge › Step 1","a":"seal sha256 hash kpi criteria escrow tamper outcome baseline","d":"Run a real challenge, start to finish","k":"step define problem run challenge whole mechanism six steps real start finish every choice you make carries forward risk set decides who eligible what pilot proves which purchase route lawful use keys move between cap see design validate buy lawfully seal bar write outcome need technology imagine freeze success criteria hash before anyone has shown solution title department public health school education water supply rural development transport agriculture district nagpur pune nashik mumbai suburban statewide required result tool cut median wait registration first clinician contact extra sanctioned staff change existing hmis edit freely until indicator baseline today target add criterion amp publish unseal (start over) your far back reset next"},{"u":"step-2-cap-the-risk.html","t":"Step 2 — Cap the risk","c":"Run a challenge › Step 2","a":"risk ladder turnover relaxation 173 eligibility blast radius sliders","d":"Run a real challenge, start to finish","k":"step cap risk run challenge whole mechanism six steps real start finish every choice you make carries forward set decides who eligible what pilot proves which purchase route lawful use keys move between define problem see design validate buy lawfully relaxation follows turnover requirements proxy delivery contract redundant exactly when rule 173(i) lets drop drag sliders citizens affected systems touched data used reversibility exit cost capped moderate unbounded try pushing slider right platform refuses grant tells shrink instead your far back reset next"},{"u":"step-3-see-whos-eligible.html","t":"Step 3 — See who's eligible","c":"Run a challenge › Step 3","a":"startup discovery screening dpiit shortlist eligible","d":"Run a real challenge, start to finish","k":"step see who eligible run challenge whole mechanism six steps real start finish every choice you make carries forward risk set decides what pilot proves which purchase route lawful use keys move between define problem cap design validate buy lawfully why matched against startup india hub msins registries eligibility decided just turnover pick one take into your far back reset next"},{"u":"step-4-design-the-pilot.html","t":"Step 4 — Design the pilot","c":"Run a challenge › Step 4","a":"sandbox dpdp milestone evidence contract data masked ip annexure","d":"Run a real challenge, start to finish","k":"step design pilot run challenge whole mechanism six steps real start finish every choice you make carries forward risk set decides who eligible what proves which purchase route lawful use keys move between define problem cap see validate buy lawfully evidence contract buys product msins signs department hosts payment stages against uncertainty falling sandbox data startup gets synthetic only masked tokenised de identified extract live personal access scope read one taluka district write staging replica system milestone schedule price increment certainty admin convenience your far back reset next"},{"u":"step-5-run-and-validate.html","t":"Step 5 — Run & validate","c":"Run a challenge › Step 5","a":"milestone payment sanction packet validator treasury pfms","d":"Run a real challenge, start to finish","k":"step run validate challenge whole mechanism six steps real start finish every choice you make carries forward risk set decides who eligible what pilot proves which purchase route lawful use keys move between define problem cap see design buy lawfully let someone else mark paper release each milestone evidence lands validator named back before any results existed recomputes seal checks against milestones submit next independent validation your far reset"},{"u":"step-6-buy-it-lawfully.html","t":"Step 6 — Buy it lawfully","c":"Run a challenge › Step 6","a":"tier tier1 tier2 tier3 \"tier 1\" \"tier 2\" \"tier 3\" proprietary pac limited tender gem runway scale up route purchase order","d":"Run a real challenge, start to finish","k":"step buy lawfully run challenge whole mechanism six steps real start finish every choice you make carries forward risk set decides who eligible what pilot proves which purchase route lawful use keys move between define problem cap see design validate platform picks facts already holds manufacture does exist two more how far do want spread just department other departments districts maharashtra deeming gr force yet issued yes your back reset where runs"},{"u":"templates.html","t":"Templates","c":"Resources › Templates","a":"template annexure contract clause rubric worksheet","d":"Templates","k":"templates resources"},{"u":"training-videos.html","t":"Training videos","c":"Training › Videos","a":"","d":"Training videos","k":"training videos short films marathi english each tied one step mechanism scripts written yet produced"},{"u":"training.html","t":"Training","c":"Training & videos","a":"","d":"Nobody is expected to know procurement law","k":"training videos nobody expected know procurement law mechanism only works officer running startup answering both what they doing get trained templates carry rest short films marathi english each tied one step"},{"u":"where-it-runs.html","t":"Where it runs","c":"Where it runs","a":"division konkan pune nashik sambhajinagar amravati nagpur district map gateway india mumbai shaniwar wada ajanta ellora raigad fort chikhaldara sahyadri vineyard photograph landmark","d":"Maharashtra, by revenue division","k":"where runs maharashtra revenue division state administers through six divisions mechanism only works mumbai same challenge pipeline templates validation gate run all gateway india konkan shaniwar wada pune vineyards nashik ajanta caves chh sambhajinagar raigad fort chikhaldara amravati photographs wikimedia commons reused under their creative licences apar singh bataan (cc sa 0) gaur himanshu wikieditor11221 marcin bia ek rishil vittal warli painting omrmankar sahyadri range sagargadkari1611 middot manishjghurde unaltered except cropping compression why matters pitch gadchiroli nandurbar eligibility relaxation actually earns keep startup has never held government contract cannot clear turnover filter read pilot masked data one taluka precisely case rule 173(i) lets you drop entirely figures page simulated demonstration capital most lands holds largest concentration departments post probl"},{"u":"why-its-hard.html","t":"Why it's hard","c":"Why it's hard today","a":"gap problem rule 166 157 173 constraint barrier","d":"Indian procurement law has no innovation-procurement instrument at all","k":"why hard today changes gfr required lawful routes pilot purchase order day target challenge posted started policy ask single state gr finding shaped everything indian procurement law has innovation instrument all sbir phase iii eu style pre commercial carve out ground anywhere general financial rules lets department buy firm because won prior competition click each card rule text closes obvious route 166 blocks direct award you cannot hand winner contract source buying allowed three grounds only our one them permitted where sole manufacturer emergency requires named standardisation existing equipment demands proprietary article certificate any design quietly assumes gets unimplementable we built instead show quiet rollout 157 small big trick little followed same requirement piecemeal unless two genuinely different things demand goods divided into quantities make purchases avoid necessity"},{"u":"working-reports.html","t":"Working reports","c":"Resources › Working reports","a":"","d":"Working reports","k":"working reports resources programme reporting"}];
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
  const terms=q.split(/\s+/).filter(Boolean);
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
      +'Try a rule number, a district, or a task \u2014 <b>173</b>, <b>Nashik</b>, <b>payment</b>.</p>';
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

/* ===== init ===== */
function init(){
  initPortal();
  visitorCount();
  try{ if(localStorage.getItem("gsb.hc")==="1"){document.body.classList.add("hc");if($("hcBtn"))$("hcBtn").setAttribute("aria-pressed","true");}
       LANG=parseInt(localStorage.getItem("gsb.lang")||"0",10)||0; }catch(e){}
  applyLang();
  const restored=load();
  if($("f_title")){$("f_title").value=S.title;$("f_out").value=S.out;$("f_dept").value=S.dept;$("f_dist").value=S.dist;}
  renderKpis();
  if($("ruleAcc"))acc($("ruleAcc"),RULES);
  if($("qaAcc"))acc($("qaAcc"),QA.map(q=>[q[0],"",null,q[1]]));
  if($("dText")){setDeriv(0,false);dTimer=setInterval(()=>setDeriv(dIdx+1,false),5200);}
  if($("aiM")&&!restoreThread())addMsg("Ask me anything about the mechanism — or work through the six steps, which answer most of it.\n\nThe one-line version: Indian procurement law has no innovation-procurement instrument, so this proposes no change to the rules and works entirely inside what already exists.","bot");
  if("IntersectionObserver" in window){
    const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){countUp();io.disconnect();}});},{threshold:.4});
    const strip=document.querySelector(".strip"); if(strip)io.observe(strip); else countUp();
  } else countUp();
  initSubPage();
  initSearch();
  initProof();
  applyHash();
  paintStepPage();
  if(restored)toast("Picked up where you left off. Press Reset to start the example again.");
}
init();
/* ---- the photograph behind the page -------------------------------
   Only the layer that is showing carries an image to begin with; the
   rest are given theirs once the page is quiet, so opening a page still
   costs one photograph rather than five.  Advancing is a timer, and it
   stops while the tab is hidden. */
(function(){
  var show=document.querySelector(".bgshow");
  if(!show) return;
  var L=[].slice.call(show.querySelectorAll("i"));
  if(L.length<2) return;
  var start=L.findIndex(function(e){ return e.hasAttribute("data-on"); });
  var i=start<0?0:start;
  var still=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HOLD=11000, timer=0, armed=false;

  function paint(e){
    if(e.style.backgroundImage) return;
    e.style.backgroundImage="url("+e.getAttribute("data-src")+")";
  }
  function arm(){
    if(armed) return; armed=true;
    L.forEach(paint);
  }
  function mark(n){
    i=n;
    L.forEach(function(e,k){
      if(k===i) e.setAttribute("data-on","1"); else e.removeAttribute("data-on"); });
    var cap=document.querySelector(".hnote"), c=L[i].getAttribute("data-cap");
    if(cap && c) cap.textContent=c;      /* the caption names what is showing */
  }
  function step(){
    mark((i+1)%L.length);
    paint(L[i]);
    timer=setTimeout(step,HOLD);
  }
  paint(L[i]);
  if(still) return;                       /* one photograph, no movement */
  setTimeout(function(){ arm(); timer=setTimeout(step,HOLD); }, 2500);
  document.addEventListener("visibilitychange",function(){
    if(document.hidden){ clearTimeout(timer); timer=0; }
    else if(armed && !timer) timer=setTimeout(step,HOLD);
  });
})();

/* ---- Mumbai playback ------------------------------------------------
   Guarded like every other renderer: absent root, nothing runs.
   Advancing is a timer and the progress bar is a CSS transition, so the
   playback does not depend on requestAnimationFrame being driven - which
   it is not under a headless virtual clock, and is throttled in a
   background tab. */
(function(){
  var root=document.getElementById("mumbaiPlay");
  if(!root) return;
  var CR=[{c:"Gateway of India",w:"SriSriChinmaya",l:"CC BY-SA 4.0"},{c:"Chhatrapati Shivaji Maharaj Terminus",w:"Archies2804",l:"CC BY-SA 4.0"},{c:"Bombay High Court",w:"Pinakpani",l:"CC BY-SA 4.0"},{c:"Rajabai Clock Tower, University of Mumbai",w:"Pinakpani",l:"CC BY-SA 4.0"},{c:"Bandra&ndash;Worli Sea Link",w:"Vworlikar",l:"CC BY-SA 4.0"},{c:"Nariman Point, from Cuffe Parade",w:"Udaykumar PR",l:"CC BY 3.0"}];
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
    i=(n+frames.length)%frames.length;
    frames.forEach(function(f,k){
      if(k===i) f.setAttribute("data-on","1"); else f.removeAttribute("data-on"); });
    dots.forEach(function(d,k){ d.setAttribute("aria-current", k===i?"true":"false"); });
    var c=CR[i];
    credit.textContent="Photograph: "+c.c+" — "+c.w+" ("+c.l+"), Wikimedia Commons";
  }
  function bar(on){
    prog.style.transition="none";
    prog.style.width="0";
    void prog.offsetWidth;                       // commit the reset
    if(on){ prog.style.transition="width "+HOLD+"ms linear"; prog.style.width="100%"; }
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
    if(ico) ico.innerHTML=on?"▐▌":"▶";
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
