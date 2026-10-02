"""Verification 2: every internal link must resolve to a real file and a real anchor."""
import os, re, glob, sys
ROOT="/home/lenin/Apps Developed/SIH 26136/docs"
pages={os.path.basename(p) for p in glob.glob(os.path.join(ROOT,"*.html"))}
ids={}
for p in pages:
    src=open(os.path.join(ROOT,p),encoding="utf-8").read()
    ids[p]=set(re.findall(r'\bid="([^"]+)"',src))
bad=[]; checked=0
for p in sorted(pages):
    src=open(os.path.join(ROOT,p),encoding="utf-8").read()
    for href in re.findall(r'href="([^"]+)"',src):
        if href.startswith(("http://","https://","mailto:","data:")): continue
        if href.startswith("assets/"): continue      # checked separately below
        if href=="#": continue                       # JS-driven control
        checked+=1
        target,_,frag=href.partition("#")
        tgt = target or p
        if target and tgt not in pages:
            bad.append((p,href,"no such page")); continue
        # hashes handled by applyHash() in app.js, not by an element id
        VIRTUAL={"marketplace.html":{"product","service","skill"},
                 "skills.html":{"skill","employment","entre"},
                 "resources.html":{"tpl","laws","reports","apps"}}
        if frag and frag in VIRTUAL.get(tgt,set()): continue
        if frag and frag not in ids.get(tgt,set()):
            bad.append((p,href,f"no #{frag} on {tgt}"))
    # assets referenced
    for a in re.findall(r'(?:src|href)="(assets/[^"]+)"',src):
        checked+=1
        if not os.path.exists(os.path.join(ROOT,a)): bad.append((p,a,"missing asset"))
print(f"checked {checked} links across {len(pages)} pages")
if bad:
    print(f"\n{len(bad)} BROKEN:")
    for p,h,why in bad[:40]: print(f"   {p:<32} {h:<34} {why}")
    sys.exit(1)
print("all links resolve")
