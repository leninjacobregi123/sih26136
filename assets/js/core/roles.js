// The seven roles, what each does, and the icon the UI uses for it.
export const ROLES = {
  department: { label: "Department Officer", icon: "building-2", does: "Creates challenges, seals the criteria, accepts milestones, approves the route, records deployment and adoption." },
  admin: { label: "Programme Administrator", icon: "clipboard-check", does: "Verifies baselines, screens startups, awards pilots, reviews for replication." },
  startup: { label: "Startup", icon: "rocket", does: "Keeps its profile, submits milestone evidence on awarded pilots." },
  evaluator: { label: "Expert Evaluator", icon: "users", does: "Scores the shortlist independently." },
  validator: { label: "Independent Validator", icon: "badge-check", does: "Recomputes the seal and attests whether the sealed criteria were met." },
  finance: { label: "Finance / Procurement Officer", icon: "banknote", does: "Records payments against the SLA, compiles the procurement route." },
  public: { label: "Public Viewer", icon: "eye", does: "Reads passports; can't download evidence files." },
};
export const roleLabel = (id) => ROLES[id]?.label ?? id;
