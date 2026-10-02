// Who is signed in. One request per page; everything else asks this module.
import { api, signInUrl } from "./api.js";

let current;
export async function currentUser(refresh = false) {
  if (current === undefined || refresh) {
    current = (await api("/api/auth").catch(() => ({ user: null }))).user ?? null;
  }
  return current;
}

// Pages that need an account call this; it never returns for a signed-out visitor.
export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    location.replace(signInUrl());
    await new Promise(() => {});
  }
  return user;
}

export async function signIn(email, password) {
  current = (await api("/api/auth", { method: "POST", body: { action: "login", email, password } })).user;
  return current;
}

export async function signInDemo(role) {
  current = (await api("/api/auth", { method: "POST", body: { action: "demo", role } })).user;
  return current;
}

export async function signOut() {
  await api("/api/auth", { method: "POST", body: { action: "logout" } }).catch(() => {});
  current = null;
  location.href = "/";
}
