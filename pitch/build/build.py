#!/usr/bin/env python3
"""One-shot migration: single-page govstart-bridge.html -> multi-page site.

Runs the four stages in order. extract.py rewrites assets/app.js from the
original source, so guard.py and nav.py MUST follow it every time."""
import subprocess, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
STAGES = [("extract.py", "extract CSS / JS / images into assets/"),
          ("guard.py",   "make app.js safe on a partial DOM"),
          ("nav.py",     "rewrite navigation for multiple pages"),
          ("flatten.py", "flatten gradients to solid colour"),
          ("pages.py",   "stamp out the pages"),
          ("mono.py",    "monochrome the interface"),
          ("onphoto.py", "put the page on the photograph"),
          ("mumbai.py",  "Mumbai, as a playback"),
          ("landing.py", "the landing page's main screen"),
          ("chrome.py",  "strip the top chrome to the two emblems"),
          ("search.py",  "build the offline search index")]
for script, what in STAGES:
    print(f"\n\033[1m== {script} — {what}\033[0m")
    r = subprocess.run([sys.executable, os.path.join(HERE, script)])
    if r.returncode: sys.exit(f"FAILED at {script}")
# drop the build intermediate so it never ships
tmp = os.path.join(HERE, "_body.html")
if os.path.exists(tmp): os.remove(tmp)
print("\nbuild complete")
