// 404: say so plainly and offer the ways back.
import { html, render } from "../core/html.js";
import { page } from "../ui/shell.js";
import { empty } from "../ui/states.js";
import { icon } from "../ui/icons.js";

const { main } = await page({ auth: "optional", title: "Page not found", crumbs: [{ label: "Not found" }] });
render(main, html`<div class="card" style="max-width:640px;margin:var(--s-10) auto">${empty({
  icon: "circle-help", title: "This page doesn't exist",
  body: html`Check the address, or start again from one of these. <span class="muted">(${location.pathname})</span>`,
  actions: html`<a class="btn btn-primary" href="/">${icon("house", { cls: "icon-sm" })}Home</a>
    <a class="btn" href="/pilots">Pilots</a><a class="btn" href="/programme">Programme</a>`,
})}</div>`);
