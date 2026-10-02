// Loading, empty, error and notice blocks, used the same way on every page.
import { html } from "../core/html.js";
import { icon } from "./icons.js";

export const skeleton = (lines = 3) => html`<div aria-busy="true" aria-label="Loading">
  <span class="skeleton lg"></span>${Array.from({ length: lines }, (_, i) => html`<span class="skeleton" style="width:${92 - i * 13}%"></span>`)}</div>`;

export const skeletonPage = () => html`<div aria-busy="true" aria-label="Loading" class="stack-lg">
  <div><span class="skeleton lg"></span><span class="skeleton" style="width:30%"></span></div>
  <span class="skeleton block"></span><span class="skeleton block"></span></div>`;

export const empty = ({ icon: name = "inbox", title, body, actions }) => html`<div class="empty">
  <div class="empty-icon">${icon(name)}</div><h3>${title}</h3>${body && html`<p>${body}</p>`}${actions && html`<div class="row">${actions}</div>`}</div>`;

export const alert = (tone, { title, body, icon: name }) => html`<div class="alert alert-${tone}" role="${tone === "danger" ? "alert" : "note"}">
  ${icon(name ?? { info: "info", success: "circle-check", warning: "triangle-alert", danger: "circle-alert" }[tone])}
  <div class="grow">${title && html`<div class="alert-title">${title}</div>`}${body && html`<div>${body}</div>`}</div></div>`;

export const errorState = (err, { retry = true } = {}) => html`<div class="card"><div class="empty">
  <div class="empty-icon">${icon("circle-alert")}</div>
  <h3>${err?.status === 404 ? "Not found" : err?.status === 403 ? "You can't open this" : "Something went wrong"}</h3>
  <p>${err?.message ?? "The page couldn't load."}</p>
  ${retry && html`<div class="row"><button class="btn" type="button" data-retry>Try again</button><a class="btn btn-ghost" href="/">Go to home</a></div>`}
</div></div>`;
