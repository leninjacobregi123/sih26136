"""Step 4: stamp out the 21 pages from one shared chrome template."""
import re, os
ROOT = "/home/lenin/Apps Developed/SIH 26136/docs"
body = open("/home/lenin/Apps Developed/SIH 26136/build/_body.html", encoding="utf-8").read()

# ---------------------------------------------------------------- chrome
top    = body[body.index('<a class="skip"') : body.index('<main>')]

# ===================================================================
#  NAVIGATION — five groups, each a coherent destination
# ===================================================================
def mm_col(title, items):
    links = "".join('<a href="%s">%s<span class="n">%s</span></a>' % (h, l, n) for h, l, n in items)
    return '<div><h5>%s</h5>%s</div>' % (title, links)

def mega(mid, cols, foot=""):
    return ('<div class="mm" id="mm-%s">%s%s</div>'
            % (mid, "".join(mm_col(t, i) for t, i in cols),
               '<div class="mm-foot">%s</div>' % foot if foot else ""))

NAV_HTML = (
 '<div class="mm-wrap"><button class="mmbtn" id="mmb-mech" aria-expanded="false" '
   'aria-controls="mm-mech" onclick="mm(\'mech\')"><span data-i18n="nav_mech">The mechanism</span> <span class="cv">&#9660;</span></button>'
 + mega("mech", [
    ("Start here", [
      ("why-its-hard.html","Why it&rsquo;s hard","The gap this exists to close"),
      ("run-a-challenge.html","Overview","All six steps at a glance"),
      ("step-1-define-the-problem.html","1 &middot; Define the problem","Write the outcome, seal the criteria"),
      ("step-2-cap-the-risk.html","2 &middot; Cap the risk","Five axes decide the relaxation"),
      ("step-3-see-whos-eligible.html","3 &middot; See who&rsquo;s eligible","Screened on risk, not turnover")]),
    ("Run and close it", [
      ("step-4-design-the-pilot.html","4 &middot; Design the pilot","Sandbox and milestones"),
      ("step-5-run-and-validate.html","5 &middot; Run &amp; validate","Independent check against the seal"),
      ("step-6-buy-it-lawfully.html","6 &middot; Buy it lawfully","Tier 1, 2 or 3 &mdash; or no route"),
      ("where-it-runs.html","Where it runs","All six revenue divisions")]),
   ], "Every choice carries forward. Your answers stay in this browser.")
 + '</div>'
 + '<div class="mm-wrap"><button class="mmbtn" id="mmb-market" aria-expanded="false" '
   'aria-controls="mm-market" onclick="mm(\'market\')"><span data-i18n="nav_market">Marketplace</span> <span class="cv">&#9660;</span></button>'
 + mega("market", [
    ("Browse", [
      ("categories.html","Categories","All eight demand categories"),
      ("products.html","Products","Deployable goods &amp; devices"),
      ("services.html","Services","Managed and outcome services"),
      ("skill-purchase.html","Skill purchase 24&times;7","Trainers, assessors, courseware")]),
    ("Sellers", [
      ("sellers.html","About a seller","Profile, licences, track record"),
      ("licence.html","Licence &amp; registration","What each registration unlocks"),
      ("become-a-seller.html","Become a seller","How a listing is earned")]),
    ("Buyer access", [
      ("buyer-login.html","Buyer login","Departmental officers"),
      ("buyer-registration.html","Buyer registration","New department or ULB"),
      ("buyer-background.html","Buyer background","Verification &amp; authority limits")]),
   ], '<span class="always">Open 24&times;7</span> &middot; Prototype data only.')
 + '</div>'
 + '<div class="mm-wrap"><button class="mmbtn" id="mmb-ev" aria-expanded="false" '
   'aria-controls="mm-ev" onclick="mm(\'ev\')"><span data-i18n="nav_ev">Evidence &amp; rules</span> <span class="cv">&#9660;</span></button>'
 + mega("ev", [
    ("The legal basis", [
      ("rule-book.html","Rule book","Each provision, quoted"),
      ("government-laws.html","Government laws","GFR, DPDP, DAP, GeM"),
      ("judges-questions.html","Judge&rsquo;s questions","Straight answers")]),
    ("Artefacts", [
      ("templates.html","Templates","Versioned, not one-off files"),
      ("working-reports.html","Working reports","Quarterly programme reporting"),
      ("resources.html","All resources","Everything in one place")]),
   ])
 + '</div>'
 + '<a href="department-services.html" data-i18n="nav_dept">Department services</a>'
 + '<a href="about.html" data-i18n="nav_about">About</a>'
)

def rebuild_nav(html):
    """Replace the whole <nav class="navlinks"> block with the five-group version."""
    i = html.index('<nav class="navlinks"')
    j = html.index('</nav>', i) + len('</nav>')
    head = html[i:html.index('>', i) + 1]
    return html[:i] + head + NAV_HTML + '</nav>' + html[j:]

top = rebuild_nav(top)

# DMV puts search in the header on every page; we had none across 41 pages
HDR_SEARCH = ('<div class="hdrsearch">'
 '<label class="visually-hidden" for="hdrSearch">Search this site</label>'
 '<input id="hdrSearch" type="search" placeholder="Search\u2026" autocomplete="off">'
 '<div class="sr-box" id="hdrResults" hidden role="listbox" aria-label="Search results"></div>'
 '</div>')
top = top.replace('<div class="nav-right">', '<div class="nav-right">' + HDR_SEARCH, 1)

# A public URL shows government branding before the footer is ever reached,
# so the prototype notice goes above the fold.
PROTO_BAR = ('<div class="protobar"><div class="wrap">'
  '<span class="tagp">Prototype</span>'
  '<span>Student project for Smart India Hackathon 2026 (SIH26136). '
  '<b>Not an official portal of the Government of Maharashtra or MSInS, and not endorsed by them.</b> '
  'All data shown is simulated.</span>'
  '</div></div>')
top = top.replace('<div class="utility">', PROTO_BAR + '<div class="utility">', 1)
bottom = body[body.index('</main>') + len('</main>') : body.index('</body>')]
# the inline <script> is now assets/app.js - drop it from the shared chrome
bottom = re.sub(r'<script>.*?</script>', '', bottom, flags=re.S)
hero   = body[body.index('<div class="hero">') : body.index('<div class="strip">')]
strip  = body[body.index('<div class="strip">') : body.index('<section id="why">')]

def section(sid):
    m = re.search(r'(<section id="' + sid + r'".*?</section>)', body, re.S)
    if not m: raise SystemExit("missing section: " + sid)
    return m.group(1)

flow = section("flow")
def extract_div(html, start_idx):
    """Return the full <div ...>...</div> beginning at start_idx, matching nesting."""
    i = start_idx; depth = 0
    tag = re.compile(r"</?div\b", re.I)
    while True:
        m = tag.search(html, i)
        if not m: raise SystemExit("unbalanced div from %d" % start_idx)
        depth += 1 if m.group(0).lower() == "<div" else -1
        i = m.end()
        if depth == 0:
            return html[start_idx: html.index(">", i) + 1]

panes = []
for n in range(6):
    m = re.search(r'<div class="pane[^"]*" id="pane%d">' % n, flow)
    if not m: raise SystemExit("pane%d not found" % n)
    panes.append(extract_div(flow, m.start()))

rail = re.search(r'(<aside class="rail".*?</aside>)', flow, re.S).group(1)
_m = re.search(r'<div class="s-head">', flow)
flow_head = extract_div(flow, _m.start())

# ------------------------------------------------------- link rewriting
LINKS = [  # longest / most specific first
    ("#videos",    "training.html#videos"),
    ("#reports",   "resources.html#reports"),
    ("#laws",      "resources.html#laws"),
    ("#apps",      "resources.html#apps"),
    ("#statewide", "where-it-runs.html"),
    ("#resources", "resources.html"),
    ("#grievance", "grievance.html"),
    ("#marketplace","marketplace.html"),
    ("#schemes",   "schemes.html"),
    ("#training",  "training.html"),
    ("#contact",   "contact.html"),
    ("#market",    "marketplace.html"),
    ("#skills",    "skills.html"),
    ("#rules",     "rule-book.html"),
    ("#about",     "about.html"),
    ("#help",      "help.html"),
    ("#flow",      "run-a-challenge.html"),
    ("#gap",       "skill-gap.html"),
    ("#qa",        "judges-questions.html"),
    ("#why",       "why-its-hard.html"),
]
# menu entries now point at the dedicated page for each feature
SUBLINKS = [
 ('href="marketplace.html#product"', 'href="products.html"'),
 ('href="marketplace.html#service"', 'href="services.html"'),
 ('href="marketplace.html#skill"',   'href="skill-purchase.html"'),
 ('href="skills.html#skill"',        'href="skill.html"'),
 ('href="skills.html#employment"',   'href="employment.html"'),
 ('href="skills.html#entre"',        'href="entrepreneurship.html"'),
 ('href="resources.html#tpl"',       'href="templates.html"'),
 ('href="resources.html#laws"',      'href="government-laws.html"'),
 ('href="resources.html#reports"',   'href="working-reports.html"'),
 ('href="resources.html#apps"',      'href="apps.html"'),
 ('href="training.html#videos"',     'href="training-videos.html"'),
 # dialogs become pages
 ('href="#market" onclick="openSeller(0)"',                           'href="sellers.html"'),
 ('href="#" onclick="openSeller(0)"',                                'href="sellers.html"'),
 ('href="#" onclick="openLicence();return false"',                   'href="licence.html"'),
 ('href="#" onclick="openModal(\'Become a seller\', SELLER_HTML);return false"', 'href="become-a-seller.html"'),
 ('href="#" onclick="openLogin(\'login\');return false"',            'href="buyer-login.html"'),
 ('href="#" onclick="openLogin(\'register\');return false"',         'href="buyer-registration.html"'),
 ('href="#" onclick="openLogin(\'profile\');return false"',          'href="buyer-background.html"'),
 ('onclick="openLogin(\'login\')"',                                  'onclick="location.href=\'buyer-login.html\'"'),
]

def relink(html):
    for frm, to in SUBLINKS:
        html = html.replace(frm, to)
    # the "Categories" menu item is the marketplace hub itself
    html = html.replace('<a href="marketplace.html">Categories', '<a href="categories.html">Categories')
    for frm, to in LINKS:
        html = html.replace('href="%s"' % frm, 'href="%s"' % to)
    # mega-menu filter items become real links so middle-click works
    html = re.sub(r'<a href="marketplace\.html" onclick="mmGo\(\'market\',\'(\w+)\'\)">',
                  lambda m: '<a href="marketplace.html%s">' % ('' if m.group(1)=='all' else '#'+m.group(1)), html)
    html = re.sub(r'<a href="skills\.html" onclick="mmGoSkill\(\'(\w+)\'\)">',
                  lambda m: '<a href="skills.html#%s">' % m.group(1), html)
    html = re.sub(r'<a href="(resources|training|skills|marketplace)\.html(#\w+)?" onclick="(resTab|skillTab|mmGo|mmGoSkill)\([^)]*\)">',
                  lambda m: '<a href="%s.html%s">' % (m.group(1), m.group(2) or ''), html)
    # placeholder anchor: the onclick opens the policy dialog, the href pointed nowhere
    html = html.replace('href="#accessibility"', 'href="#"')
    html = html.replace('onclick="scrollTo_(document.getElementById(\'why\'))"',
                        'onclick="location.href=\'index.html#why\'"')
    html = html.replace('onclick="scrollTo_(document.body);return false"', 'onclick="return true"')
    html = html.replace('<a href="#" onclick="return true" data-i18n="home">', '<a href="index.html" data-i18n="home">')
    return html

top, bottom, hero, strip = map(relink, (top, bottom, hero, strip))



# Full-bleed photographic dividers - placed between sections, never behind body text.
DIVIDERS = {
 "index.html": ("pb-kokan","Built for all six divisions",
   "From the Konkan coast to Vidarbha, the same mechanism runs \u2014 with the same templates, the same sealed criteria and the same validation gate.",
   "Sahyadri range, Raigad district"),
 "why-its-hard.html": ("pb-ellora","Rules written for a different kind of purchase",
   "The General Financial Rules assume you can describe what you are buying before you buy it. An innovation is the one thing you cannot.",
   "Kailasa Temple, Ellora"),
 "where-it-runs.html": ("pb-deeksha","36 districts, one mechanism",
   "A mechanism that only works in Mumbai is not a state mechanism.",
   "Deekshabhoomi, Nagpur"),
 "marketplace.html": ("pb-sula","Everything here cleared a validation gate",
   "No listing reaches this marketplace on a promise. Each one carries evidence an independent validator checked against criteria sealed before anyone saw a solution.",
   "Vineyards near Nashik"),
 "run-a-challenge.html": ("pb-kaas","Six steps, start to finish",
   "Each choice narrows the next. Set the risk, and the eligibility follows; prove the outcome, and the purchase route follows.",
   "Kaas Plateau, Satara"),
 "skills.html": ("pb-kaas","Skill, employment, entrepreneurship",
   "A validated pilot creates jobs, needs trained people to run it, and is usually built by a young firm that needs help growing.",
   "Kaas Plateau, Satara"),
 "about.html": ("pb-deeksha","A mechanism a state can adopt next quarter",
   "No amendment to the General Financial Rules. One state Government Resolution, and Tiers 2 and 3 work without even that.",
   "Deekshabhoomi, Nagpur"),
 "grievance.html": ("pb-kokan","Open 24\u00d77, with a clock on it",
   "A startup waiting on \u20b94.5 lakh does not have a quarter to spare. Payment grievances carry a seven-day resolution clock.",
   "Sahyadri range, Raigad district"),
}
def divider_html(fname):
    d = DIVIDERS.get(fname)
    if not d: return ""
    cls, head, body, cap = d
    return ('<div class="bandrule %s"><div class="bandrule-in">'
            '<h2>%s</h2><p>%s</p><span class="cap">%s</span>'
            '</div></div>') % (cls, head, body, cap)


# ===================================================================
#  DEPARTMENT SERVICES HUB — the nine pages outside SIH26136's scope,
#  kept working but no longer competing with the mechanism.
# ===================================================================
DEPT_GROUPS = [
 ("Skills &amp; livelihood", "The department&rsquo;s three mandates, and the schemes behind them.", [
   ("skill.html","Skill","Courses, assessment, certification"),
   ("employment.html","Employment","Vacancies, melas, placement"),
   ("entrepreneurship.html","Entrepreneurship","Incubation, credit, mentoring"),
   ("schemes.html","Skill development schemes","Check what you are eligible for")]),
 ("Evidence &amp; reporting", "What tells a department where to act.", [
   ("skill-gap.html","Skill gap report","Demand against certified supply, by district"),
   ("working-reports.html","Working reports","Quarterly programme reporting"),
   ("apps.html","Field apps","Offline-first evidence capture")]),
 ("Learn &amp; get help", "For officers, sellers, evaluators and citizens.", [
   ("training.html","Training","Six tracks, one per role"),
   ("training-videos.html","Training videos","Short films, one per step"),
   ("grievance.html","Grievance 24&times;7","Raise a ticket, with a clock on it")]),
]
DEPT_HUB = ('<section id="deptsvc"><div class="wrap">'
 '<div class="s-head"><p class="eyebrow">Department of Skills, Employment, Entrepreneurship &amp; Innovation</p>'
 '<h2>Department services</h2>'
 '<p>GovStart Bridge sits inside a working department. These are the services that surround it &mdash; '
 'they are not part of the procurement mechanism, but they are what the mechanism plugs into.</p></div>'
 + "".join(
   '<div class="deptgroup"><h3>%s</h3><p class="deptlede">%s</p><div class="grid g3">%s</div></div>'
   % (title, lede, "".join(
       '<a class="card hover deptcard" href="%s"><h3>%s</h3><p>%s</p>'
       '<span class="deptgo">Open &rarr;</span></a>' % (h, l, n) for h, l, n in items))
   for title, lede, items in DEPT_GROUPS)
 + '</div></section>')

# --------------------------------------------------------------- template
def page(fname, title, crumb, nav_key, content, page_step=None, feature=None):
    t = top
    if nav_key:
        t = t.replace('href="%s"' % nav_key, 'href="%s" aria-current="page"' % nav_key, 1)
    t = re.sub(r'<span data-i18n="crumb">[^<]*</span>',
               '<span data-i18n="crumb" data-en="%s">%s</span>' % (crumb, crumb), t)
    step_js = ('\n<script>window.PAGE_STEP=%d;</script>' % page_step) if page_step is not None else ''
    if feature:
        import json as _j
        step_js += '\n<script>window.PAGE_FEATURE=%s;</script>' % _j.dumps(feature)
    content = content + divider_html(fname)
    if fname in DIVIDERS:                        # CC BY-SA requires attribution
        bottom_local = bottom.replace('<div class="disc">',
            '<p style="font-size:11px;line-height:1.8;color:#c2917a;margin-bottom:14px">'
            'Background photographs from Wikimedia Commons, reused under their Creative Commons licences: '
            "<a href=\"https://commons.wikimedia.org/wiki/File%3AView_from_Kokan_Diva_Fort%2C_Raigad_District%2C_Maharashra.jpg\" target=\"_blank\" rel=\"noopener\">View from Kokan Diva Fort, Raigad District, Maharashra</a> — SWAPNIL ROTHE (CC BY-SA 4.0) · <a href=\"https://commons.wikimedia.org/wiki/File%3AEllora_Cave_16_Kailasa_Temple.jpg\" target=\"_blank\" rel=\"noopener\">Ellora Cave 16 Kailasa Temple</a> — Shishirdasika (CC BY-SA 4.0) · <a href=\"https://commons.wikimedia.org/wiki/File%3AKaas_Plateau.jpg\" target=\"_blank\" rel=\"noopener\">Kaas Plateau</a> — Dinkarpatil2610 (CC BY-SA 4.0) · <a href=\"https://commons.wikimedia.org/wiki/File%3ADeekshabhoomi_Nagpur.jpg\" target=\"_blank\" rel=\"noopener\">Deekshabhoomi Nagpur</a> — Kawade Sahil (CC BY-SA 4.0) · <a href=\"https://commons.wikimedia.org/wiki/File%3ASula_Vineyards_Updated_View.jpg\" target=\"_blank\" rel=\"noopener\">Sula Vineyards Updated View</a> — Puneets26 (CC BY-SA 4.0)" '. Cropped and compressed; otherwise unaltered.</p><div class="disc">', 1)
    else:
        bottom_local = bottom
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="GovStart Bridge — {crumb}. SIH26136 prototype for the Maharashtra State Innovation Society.">
<title>{title} | GovStart Bridge</title>
<link rel="stylesheet" href="assets/style.css">
<!-- the site carries no mark of its own, and a missing icon is a 404 in
     every console, so the request is answered with nothing on purpose -->
<link rel="icon" href="data:,">
</head>
<body>
{t}<main id="main">
{content}
</main>{bottom_local}{step_js}
<script src="assets/app.js"></script>
</body>
</html>
"""
    open(os.path.join(ROOT, fname), "w", encoding="utf-8").write(relink(html))
    return len(html)

# ---------------------------------------------------- walkthrough pages
STEPS = [("step-1-define-the-problem.html","Define the problem"),
         ("step-2-cap-the-risk.html","Cap the risk"),
         ("step-3-see-whos-eligible.html","See who's eligible"),
         ("step-4-design-the-pilot.html","Design the pilot"),
         ("step-5-run-and-validate.html","Run & validate"),
         ("step-6-buy-it-lawfully.html","Buy it lawfully")]

def stepper(cur):
    li = []
    for i,(f,label) in enumerate(STEPS):
        cu = ' aria-current="page"' if i==cur else ' aria-current="false"'
        li.append(f'<li><a href="{f}"{cu}><span class="sn">STEP {i+1}</span>{label}</a></li>')
    return '<ol class="steps" id="steps">' + "".join(li) + '</ol>'

def step_nav(cur):
    prev = f'<a class="btn btn-o btn-sm" href="{STEPS[cur-1][0]}">← Back</a>' if cur>0 else '<span class="btn btn-o btn-sm" aria-disabled="true" style="opacity:.4">← Back</span>'
    nxt  = f'<a class="btn btn-d btn-sm" href="{STEPS[cur+1][0]}">Next →</a>' if cur<5 else '<a class="btn btn-d btn-sm" href="where-it-runs.html">Where it runs →</a>'
    return (f'<div class="flow-nav">{prev}<span class="prog" id="prog">Step {cur+1} of 6</span>'
            f'<div style="display:flex;gap:8px"><button class="btn btn-o btn-sm" onclick="resetFlow()">Reset</button>{nxt}</div></div>')

sizes = {}
for i,(fname,label) in enumerate(STEPS):
    pane = panes[i].replace(' hidden"', '"').replace('class="pane hidden"','class="pane"')
    content = (f'<section id="flow" class="flow"><div class="wrap">{flow_head}'
               + stepper(i)
               + f'<div class="stage"><div class="step-body"><div>{pane}</div>{rail}</div>'
               + step_nav(i) + '</div></div></section>')
    sizes[fname] = page(fname, f"Step {i+1} — {label}", f"Run a challenge › Step {i+1}",
                        "run-a-challenge.html", content, page_step=i)



ROLE_CARDS_INNER = """
    <div class="doorgrid">
      <a class="door" href="buyer-login.html">
        <span class="door-ico" aria-hidden="true">\u25a4</span>
        <b>I am a department officer</b>
        <span>Sign in to post a problem, run a pilot, or approve a milestone.</span>
        <span class="door-go">Buyer login \u2192</span>
      </a>
      <a class="door" href="marketplace.html">
        <span class="door-ico" aria-hidden="true">\u25c8</span>
        <b>I am a startup or seller</b>
        <span>See what departments are buying, and what your licences unlock.</span>
        <span class="door-go">Open the marketplace \u2192</span>
      </a>
      <a class="door" href="grievance.html">
        <span class="door-ico" aria-hidden="true">\u25ce</span>
        <b>I am a citizen</b>
        <span>Raise a grievance, or read how public money is being spent here.</span>
        <span class="door-go">Grievance desk, open 24\u00d77 \u2192</span>
      </a>
    </div>
"""
ROLE_CARDS = '<section class="doors"><div class="wrap">' + ROLE_CARDS_INNER + '</div></section>'

# ===================================================================
#  LANDING PAGE - written for a first-time visitor, not a logged-in user.
#  Seven bands, each doing exactly one job.
# ===================================================================
hero = re.sub(r'<span class="pill">.*?</span>', '', hero, count=1, flags=re.S)
hero = re.sub(r'<h1>.*?</h1>',
 '<h1>A department cannot buy an innovation.<br>It can buy <em>evidence</em> — then buy the product.</h1>',
 hero, count=1, flags=re.S)
hero = re.sub(r'<p>Maharashtra.*?</p>',
 '<p>Indian procurement law has no instrument for buying innovation. '
 'GovStart Bridge is the mechanism that works anyway — without changing a single rule.</p>',
 hero, count=1, flags=re.S)
hero = re.sub(r'<div class="hero-cta">.*?</div>',
 '<div class="hero-cta">'
 '<a class="btn btn-p" href="#how">See how it works</a>'
 '<a class="btn btn-o" href="run-a-challenge.html">Try the mechanism</a>'
 '</div>', hero, count=1, flags=re.S)
hero = re.sub(r'<p class="hnote">.*?</p>',
 '<p class="hnote">Sahyadri range, Raigad district</p>', hero, count=1, flags=re.S)

TASKROW = ('<section id="dothis" class="tasks"><div class="wrap">'
 '<h2 class="tasks-h">What do you want to do?</h2>'
 '<div class="bigsearch">'
 '<label class="visually-hidden" for="bigSearch">Search the site</label>'
 '<input id="bigSearch" type="search" autocomplete="off" '
 'placeholder="Search a rule, a district, a service \u2014 try 173, Nashik, or payment">'
 '<div class="sr-box sr-big" id="bigResults" hidden role="listbox" aria-label="Search results"></div>'
 '</div>'
 '<div class="taskgrid">'
 '<a class="taskchip" href="step-1-define-the-problem.html">'
 '<span class="tk-i" aria-hidden="true">\u270e</span><b>Post a problem</b>'
 '<span>Write the outcome and seal the criteria</span></a>'
 '<a class="taskchip" href="marketplace.html">'
 '<span class="tk-i" aria-hidden="true">\u25c8</span><b>Find a solution</b>'
 '<span>Products, services and skills departments buy</span></a>'
 '<a class="taskchip" href="rule-book.html">'
 '<span class="tk-i" aria-hidden="true">\u00a7</span><b>Check a rule</b>'
 '<span>Every provision, quoted, with what it does</span></a>'
 '<a class="taskchip" href="grievance.html">'
 '<span class="tk-i" aria-hidden="true">\u25ce</span><b>Raise a grievance</b>'
 '<span>Open 24\u00d77, with a clock on it</span></a>'
 '</div></div></section>')

BAND_GAP = ('<section id="gap"><div class="wrap">'
 '<div class="s-head center" style="text-align:center;margin-left:auto;margin-right:auto">'
 '<p class="eyebrow">The gap</p><h2 style="display:inline-block;text-align:left">Three rules close every obvious route</h2></div>'
 '<div class="grid g3">'
 '<div class="card"><span class="tag r">Rule 166</span><h3>No direct award</h3>'
 '<p>Allowed on three grounds. &ldquo;Won our challenge&rdquo; is not one of them.</p></div>'
 '<div class="card"><span class="tag r">Rule 157</span><h3>No quiet rollout</h3>'
 '<p>A small pilot then a big rollout of the same demand is piecemeal purchase.</p></div>'
 '<div class="card"><span class="tag g">Rule 173(i)</span><h3>A conditional gift</h3>'
 '<p>Turnover may be relaxed for startups — but only if the bidding document says so.</p></div>'
 '</div>'
 '<p style="text-align:center;margin-top:20px"><a href="why-its-hard.html" style="font-weight:600">'
 'Read the full argument &rarr;</a></p>'
 '</div></section>')

BAND_IDEA = ('<section id="idea"><div class="wrap">'
 '<div class="s-head center" style="text-align:center;margin-left:auto;margin-right:auto">'
 '<p class="eyebrow">The idea</p><h2 style="display:inline-block;text-align:left">Two purchases, not one</h2>'
 '<p>You cannot specify an innovation in advance — so you buy the evidence first, '
 'and the product once that evidence exists.</p></div>'
 '<div class="contracts">'
 '<div class="contract evi"><h4>Evidence Contract</h4><p class="who">MSInS contracts &middot; the department hosts</p>'
 '<ul><li>Buys a defined question, a defined test, a report</li>'
 '<li>Competition on the <b>outcome</b>, never the solution</li>'
 '<li>Eligibility relaxed in proportion to a measured risk cap</li>'
 '</ul></div>'
 '<div class="gate"><span>Validation gate</span></div>'
 '<div class="contract dep"><h4>Deployment Contract</h4><p class="who">the department buys</p>'
 '<ul><li>Buys a now-specified product</li>'
 '<li>Entered only after independent validation</li>'
 '<li>Routed to Tier 1, 2 or 3 on facts already held</li>'
 '</ul></div>'
 '</div></div></section>')

STEP_ICONS = ["◴","◔","◍","▦","◷","✓"]
BAND_HOW = ('<section id="how"><div class="wrap">'
 '<div class="s-head center" style="text-align:center;margin-left:auto;margin-right:auto">'
 '<p class="eyebrow">How it works</p><h2 style="display:inline-block;text-align:left">Six steps, and each one narrows the next</h2></div>'
 '<div class="stepstrip">'
 + "".join('<a class="stepchip" href="%s"><span class="sc-n">%d</span>'
           '<span class="sc-i" aria-hidden="true">%s</span><b>%s</b><span class="sc-d">%s</span></a>'
           % (f, i + 1, STEP_ICONS[i], l, d) for i, (f, l, d) in enumerate([
   (STEPS[0][0], "Define the problem", "Seal the criteria first"),
   (STEPS[1][0], "Cap the risk", "Five axes set the relaxation"),
   (STEPS[2][0], "See who&rsquo;s eligible", "Screened on risk, not turnover"),
   (STEPS[3][0], "Design the pilot", "Sandbox and milestones"),
   (STEPS[4][0], "Run &amp; validate", "An independent check"),
   (STEPS[5][0], "Buy it lawfully", "Tier 1, 2 or 3 — or no route at all")]))
 + '</div></div></section>')

BAND_PROOF = ('<section id="proof"><div class="wrap">'
 '<div class="s-head center" style="text-align:center;margin-left:auto;margin-right:auto">'
 '<p class="eyebrow">Proof</p><h2 style="display:inline-block;text-align:left">Three things that actually work</h2>'
 '<p>Not mock-ups. Try them here, or in full inside the walkthrough.</p></div>'
 '<div class="grid g3">'
 '<div class="card proofcard"><span class="tag">Mechanism M6</span><h3>The criteria cannot move</h3>'
 '<p>Success criteria are hashed with SHA-256 and published before any solution is seen. '
 'Edit one and the seal breaks in front of you.</p>'
 '<div class="minidemo"><label for="pf_kpi">Target</label>'
 '<input id="pf_kpi" value="&le; 60 min" oninput="proofSeal()">'
 '<div class="minihash" id="pf_hash"></div>'
 '<div class="ministate" id="pf_state"></div></div>'
 '<a href="step-1-define-the-problem.html">Open step 1 &rarr;</a></div>'
 '<div class="card proofcard"><span class="tag">Mechanism M4</span><h3>Risk decides eligibility</h3>'
 '<p>Turnover is a proxy for delivery risk. Cap the risk in the contract and the proxy is redundant — '
 'which is exactly when the rule lets you drop it.</p>'
 '<div class="minidemo"><label for="pf_risk">Blast radius</label>'
 '<input type="range" id="pf_risk" min="0" max="20" value="4" oninput="proofRisk()">'
 '<div class="ministate" id="pf_relax"></div></div>'
 '<a href="step-2-cap-the-risk.html">Open step 2 &rarr;</a></div>'
 '<div class="card proofcard"><span class="tag">Mechanism M5</span><h3>Three lawful routes</h3>'
 '<p>No single route exists from a validated pilot to a purchase order, so the platform holds three '
 'and picks on facts it already has.</p>'
 '<div class="minidemo"><label for="pf_case">If the pilot succeeds…</label>'
 '<select id="pf_case" onchange="proofTier()">'
 '<option value="gr">one winner, GR in force</option>'
 '<option value="nogr" selected>one winner, no GR</option>'
 '<option value="multi">several winners</option>'
 '<option value="wide">other departments</option>'
 '<option value="fail">nobody met the criteria</option></select>'
 '<div class="ministate" id="pf_tier"></div></div>'
 '<a href="step-6-buy-it-lawfully.html">Open step 6 &rarr;</a></div>'
 '</div></div></section>')

BAND_ENTER = ('<section id="enter"><div class="wrap">'
 '<p class="doors-lead">Or go straight in</p>' + ROLE_CARDS_INNER + '</div></section>')

# ===================================================================
#  Landing page: legacy block (role cards reused in band 6)
# ===================================================================
# ---------------------------------------------------------- other pages
overview = ('<section class="flow"><div class="wrap">' + flow_head + stepper(-1) +
 '<div class="stage"><h3>Six steps, six pages</h3><p class="sub">Every choice carries forward. '
 'The risk you set decides who is eligible; what the pilot proves decides which purchase route is lawful. '
 'Your answers are kept in this browser as you move between steps.</p><div class="grid g3">' +
 "".join(f'<a class="card hover" style="text-decoration:none;display:block" href="{f}">'
         f'<div class="ico">{i+1}</div><h3>{l}</h3><p>{d}</p></a>'
         for i,(f,l,d) in enumerate([
   (STEPS[0][0],STEPS[0][1],"Write the outcome you need, then freeze the success criteria with a hash before anyone shows you a solution."),
   (STEPS[1][0],STEPS[1][1],"Five sliders set the blast radius — and the blast radius decides how much of Rule 173(i) you can lawfully use."),
   (STEPS[2][0],STEPS[2][1],"Eligibility decided by the cap you just set, not by turnover. Pick who goes into the pilot."),
   (STEPS[3][0],STEPS[3][1],"The Evidence Contract: what data the startup gets, and what each milestone must produce."),
   (STEPS[4][0],STEPS[4][1],"Release milestones, then let the validator recompute the seal and mark the paper."),
   (STEPS[5][0],STEPS[5][1],"The platform picks Tier 1, 2 or 3 from facts it already holds — or tells you there is no lawful route."),
 ])) + '</div><div class="flow-nav"><span class="prog">Start at step 1</span>'
 f'<a class="btn btn-d btn-sm" href="{STEPS[0][0]}">Begin →</a></div></div></div></section>')

PLAIN = [
 ("index.html","Home","Welcome",None,
   hero + TASKROW + BAND_GAP + BAND_IDEA + BAND_HOW + BAND_PROOF + BAND_ENTER),
 ("why-its-hard.html","Why it's hard","Why it's hard today",None, strip+section("why")),
 ("run-a-challenge.html","Run a challenge","Run a challenge","run-a-challenge.html", overview),
 ("where-it-runs.html","Where it runs","Where it runs","where-it-runs.html", section("statewide")),
 ("marketplace.html","Marketplace","Marketplace","marketplace.html", section("market")),
 ("skills.html","Skills & Livelihood","Skills & Livelihood","skills.html", section("skills")),
 ("schemes.html","Skill development schemes","Skill development schemes",None, section("schemes")),
 ("skill-gap.html","Skill gap report","Skill gap report",None, section("gap")),
 ("training.html","Training","Training & videos",None, section("training")),
 ("resources.html","Resources","Resources",None, section("resources")),
 ("rule-book.html","Rule book","Rule book","rule-book.html", section("rules")),
 ("judges-questions.html","Judge's questions","Judge's questions",None, section("qa")),
 ("help.html","Help","Help centre",None, section("help")),
 ("department-services.html","Department services","Department services","department-services.html", DEPT_HUB),
 ("about.html","About us","About us","about.html", section("about")),
 ("grievance.html","Grievance 24×7","Grievance redressal","grievance.html", section("grievance")),
 ("contact.html","Contacts","Contacts",None, section("contact")),
]
for fname,title,crumb,nav,content in PLAIN:
    sizes[fname] = page(fname,title,crumb,nav,content)


# ===================================================================
#  SUB-FEATURE PAGES - one feature, one URL
# ===================================================================
market_sec = section("market")
skills_sec = section("skills")
res_sec    = section("resources")
train_sec  = section("training")

def strip_tabs(html):
    """Remove the in-page tab bar; the page itself is now the tab."""
    return re.sub(r'<div class="tabsm".*?</div>', '', html, count=1, flags=re.S)

def retitle(html, eyebrow, heading, lede=None):
    """Give a split-out page its own heading instead of the parent section's."""
    html = re.sub(r'(<div class="s-head"[^>]*>\s*<p class="eyebrow">)[^<]*(</p>)',
                  lambda m: m.group(1) + eyebrow + m.group(2), html, count=1)
    html = re.sub(r'(<div class="s-head"[^>]*>.*?<h2[^>]*>).*?(</h2>)',
                  lambda m: m.group(1) + heading + m.group(2), html, count=1, flags=re.S)
    if lede is not None:
        html = re.sub(r'(</h2>\s*<p>).*?(</p>)',
                      lambda m: m.group(1) + lede + m.group(2), html, count=1, flags=re.S)
    return html

def market_page(kind, title, blurb):
    h = market_sec.replace("The marketplace departments buy from", title)
    h = re.sub(r'(<p class="eyebrow">)[^<]*(</p>)', r'\g<1>' + blurb + r'\g<2>', h, count=1)
    return h

def dialog_page(title, lead):
    return ('<section><div class="wrap"><div class="s-head"><p class="eyebrow">'
            + lead + '</p></div><div id="pageBody"></div></div></section>')

def videos_page():
    h = train_sec
    # keep only the videos half
    i = h.index('<h3 id="videos"')
    rest = h[i:]
    # the source block repeats the heading; the page already has one
    rest = re.sub(r'<h3 id="videos"[^>]*>.*?</h3>\s*<p[^>]*>.*?</p>', '<span id="videos"></span>',
                  rest, count=1, flags=re.S)
    return ('<section id="training"><div class="wrap"><div class="s-head">'
            '<p class="eyebrow">Training</p><h2>Training videos</h2>'
            '<p>Short films, Marathi and English, each tied to one step of the mechanism. '
            'Scripts are written; the films are not yet produced.</p></div>'
            + rest)

SUBPAGES = [
 # marketplace family
 ("categories.html","Categories","Marketplace \u203a Categories","marketplace.html",
  market_page("all","Browse by category","Open 24\u00d77 \u00b7 all demand categories"), {}),
 ("products.html","Products","Marketplace \u203a Products","marketplace.html",
  market_page("product","Products departments buy","Deployable goods &amp; devices"), {"marketType":"product"}),
 ("services.html","Services","Marketplace \u203a Services","marketplace.html",
  market_page("service","Services departments buy","Managed and outcome services"), {"marketType":"service"}),
 ("skill-purchase.html","Skill purchase 24\u00d77","Marketplace \u203a Skill purchase","marketplace.html",
  market_page("skill","Skill purchase, open 24\u00d77","Trainers \u00b7 assessors \u00b7 courseware \u00b7 enumerators"), {"marketType":"skill"}),
 ("sellers.html","About a seller","Marketplace \u203a About a seller","marketplace.html",
  dialog_page("About a seller","Seller profile"), {"dialog":"seller","arg":0}),
 ("licence.html","Licence &amp; registration","Marketplace \u203a Licence","marketplace.html",
  dialog_page("Licence &amp; registration","What each registration unlocks"), {"dialog":"licence"}),
 ("become-a-seller.html","Become a seller","Marketplace \u203a Become a seller","marketplace.html",
  dialog_page("Become a seller","Onboarding"), {"dialog":"becomeSeller"}),
 # buyer family
 ("buyer-login.html","Buyer login","Buyers \u203a Sign in",None,
  dialog_page("Buyer login","Departmental officers"), {"dialog":"login"}),
 ("buyer-registration.html","Buyer registration","Buyers \u203a Register",None,
  dialog_page("Buyer registration","New department, ULB or ZP"), {"dialog":"register"}),
 ("buyer-background.html","Buyer background","Buyers \u203a Background",None,
  dialog_page("Buyer background","Verification &amp; authority limits"), {"dialog":"profile"}),
 # skills family
 ("skill.html","Skill","Skills \u203a Skill","skills.html", retitle(strip_tabs(skills_sec),"Mandate one of three","Skill","A validated solution is useless if nobody in the district can run it \u2014 so the mechanism buys the training in the same breath."), {"skill":"skill"}),
 ("employment.html","Employment","Skills \u203a Employment","skills.html", retitle(strip_tabs(skills_sec),"Mandate two of three","Employment","Every pilot that scales is a small employment event. The mechanism makes that visible instead of incidental."), {"skill":"employment"}),
 ("entrepreneurship.html","Entrepreneurship","Skills \u203a Entrepreneurship","skills.html", retitle(strip_tabs(skills_sec),"Mandate three of three","Entrepreneurship","The hardest part of selling to government is surviving the sales cycle. Milestone payments are what make it financeable."), {"skill":"entre"}),
 # resources family
 ("templates.html","Templates","Resources \u203a Templates","resources.html", retitle(strip_tabs(res_sec),"Resources","Templates","Every artefact the mechanism depends on is a versioned template, not a one-off file."), {"res":"tpl"}),
 ("government-laws.html","Government laws","Resources \u203a Government laws","resources.html", retitle(strip_tabs(res_sec),"Reference","Government laws","Nothing here asks for a change in the law. These are the instruments the mechanism is assembled from."), {"res":"laws"}),
 ("working-reports.html","Working reports","Resources \u203a Working reports","resources.html", retitle(strip_tabs(res_sec),"Programme reporting","Working reports","Generated from the challenge records themselves, so the numbers cannot drift from what actually happened."), {"res":"reports"}),
 ("apps.html","Apps","Resources \u203a Apps","resources.html", retitle(strip_tabs(res_sec),"Field tooling","Apps","Field work happens where the network does not. Every app writes evidence offline first and hashes it before sync."), {"res":"apps"}),
 # training family
 ("training-videos.html","Training videos","Training \u203a Videos",None, videos_page(), {}),
]
for fname,title,crumb,nav,content,feat in SUBPAGES:
    sizes[fname] = page(fname,title,crumb,nav,content,feature=feat)


print(f"{len(sizes)} pages written to {ROOT}\n")
for f in sorted(sizes): print(f"   {f:<34} {sizes[f]/1024:6.1f} KB")
print(f"\n   total page markup {sum(sizes.values())/1024:.0f} KB")
