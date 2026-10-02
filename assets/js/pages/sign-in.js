// Sign in with a real account, or step into the app as one of the seven demo roles.
import { html, render } from "../core/html.js";
import { safeNext } from "../core/api.js";
import { signIn, signInDemo, signOut } from "../core/session.js";
import { ROLES, roleLabel } from "../core/roles.js";
import { page } from "../ui/shell.js";
import { icon } from "../ui/icons.js";
import { input, readForm, clearErrors, busy } from "../ui/fields.js";
import { alert } from "../ui/states.js";

const nextParam = new URLSearchParams(location.search).get("next");
const next = safeNext(nextParam, "/");
const { user, main } = await page({ active: "sign-in", auth: "optional", title: "Sign in" });

render(main, html`<div class="auth"><div class="auth-grid">
  <section class="card" aria-labelledby="signin-title">
    <div class="card-body stack">
      <div><h1 id="signin-title" style="font-size:var(--fs-xl)">Sign in</h1>
        <p class="muted small" style="margin-top:4px">Accounts are issued by the programme desk. There is no sign-up.</p></div>
      ${user && alert("info", { title: `Signed in as ${user.name}`, body: html`${roleLabel(user.role)}${user.is_demo ? " · demo account" : ""}.
        <a href="${next}">Continue</a> or <button class="link-btn" type="button" id="switch">sign out</button> to use another account.` })}
      <div id="form-error"></div>
      <form id="signin" class="stack" novalidate>
        ${input({ name: "email", label: "Email", type: "email", required: true, attrs: html`autocomplete="username" autocapitalize="off" spellcheck="false"` })}
        <div class="field" data-field="password">
          <label class="label" for="password">Password<span class="req" aria-hidden="true">*</span></label>
          <div class="input-group"><input class="input" id="password" name="password" type="password" required autocomplete="current-password">
            <button class="btn btn-icon" type="button" id="reveal" aria-pressed="false" aria-label="Show password" style="border-radius:0 var(--r) var(--r) 0;box-shadow:none">${icon("eye")}</button></div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" type="submit" id="submit">Sign in</button>
      </form>
    </div>
  </section>
  <section class="card" aria-labelledby="demo-title">
    <div class="card-body stack">
      <div><h2 id="demo-title" style="font-size:var(--fs-xl)">Try a demo role</h2>
        <p class="muted small" style="margin-top:4px">No password. Demo accounts drive the guided demo and read the fictional sample pilots; they never see or change real ones.</p></div>
      <div class="role-cards">${Object.entries(ROLES).map(([id, r]) => html`<button class="role-card" type="button" data-role="${id}">
        <span class="role-icon">${icon(r.icon)}</span><span><strong>${r.label}</strong><span>${r.does}</span></span>${icon("chevron-right", { cls: "go" })}</button>`)}</div>
    </div>
  </section>
</div></div>`);

const form = main.querySelector("#signin");
const formError = main.querySelector("#form-error");
main.querySelector("#switch")?.addEventListener("click", signOut);

main.querySelector("#reveal").addEventListener("click", (e) => {
  const pw = main.querySelector("#password");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  e.currentTarget.setAttribute("aria-pressed", String(show));
  e.currentTarget.setAttribute("aria-label", show ? "Hide password" : "Show password");
  render(e.currentTarget, icon(show ? "eye-off" : "eye"));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors(form);
  render(formError, "");
  const { email, password } = readForm(form);
  if (!email.trim() || !password) {
    render(formError, alert("danger", { body: "Enter your email and password." }));
    return;
  }
  await busy(main.querySelector("#submit"), async () => {
    try {
      await signIn(email, password);
      location.replace(next);
    } catch (err) {
      render(formError, alert("danger", { body: err.message }));
      main.querySelector("#password").select();
    }
  });
});

main.querySelectorAll("[data-role]").forEach((b) => b.addEventListener("click", async () => {
  await busy(b, async () => {
    try {
      await signInDemo(b.dataset.role);
      location.replace(nextParam ? next : "/");
    } catch (err) {
      render(formError, alert("danger", { body: err.message }));
    }
  });
}));
