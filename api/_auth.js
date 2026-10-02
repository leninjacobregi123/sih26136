// Accounts and sessions. The session is a signed cookie: base64url({uid, exp}).HMAC-SHA256,
// HttpOnly and SameSite=Lax. The user row is re-read on every request, so setting
// users.active = false ends a session at once.
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./_lib.js";
import { HttpError } from "./_http.js";

const scrypt = promisify(scryptCb);

export const ROLES = {
  department: "Department Officer",
  admin: "Programme Administrator",
  startup: "Startup",
  evaluator: "Expert Evaluator",
  validator: "Independent Validator",
  finance: "Finance / Procurement Officer",
  public: "Public Viewer",
};

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [kind, salt, hash] = (stored ?? "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64");
  const got = await scrypt(String(password), Buffer.from(salt, "base64"), want.length);
  return timingSafeEqual(want, got);
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is not set (32+ random characters; see .env.example)");
  return s;
}
const sign = (data) => createHmac("sha256", secret()).update(data).digest("base64url");

const COOKIE = "sid";
const TTL = 8 * 3600; // one working day

export function sessionToken(userId, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Math.floor(now / 1000) + TTL })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token, now = Date.now()) {
  const [payload, mac] = (token ?? "").split(".");
  if (!payload || !mac) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
  return exp > now / 1000 ? uid : null;
}

function cookie(req, value, maxAge) {
  const https = req.headers["x-forwarded-proto"] === "https";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
}
export const setSession = (req, res, user) => res.setHeader("Set-Cookie", cookie(req, sessionToken(user.id), TTL));
export const clearSession = (req, res) => res.setHeader("Set-Cookie", cookie(req, "", 0));

const USER_COLS = "id, email, name, role, org, is_demo";

export async function currentUser(req) {
  const raw = (req.headers.cookie ?? "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const uid = raw && readToken(raw);
  if (!uid) return null;
  const { rows } = await db().query(`select ${USER_COLS} from users where id = $1 and active`, [uid]);
  return rows[0] ?? null;
}

export async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "Sign in first.");
  return user;
}

export async function login(email, password) {
  const { rows } = await db().query(
    `select ${USER_COLS}, password_hash from users where email = lower($1) and active and not is_demo`,
    [String(email ?? "").trim()]);
  // Hash anyway when the email is unknown, so timing doesn't reveal which emails exist.
  const ok = await verifyPassword(password ?? "", rows[0]?.password_hash ?? DUMMY_HASH);
  if (!rows[0] || !ok) throw new HttpError(401, "Email or password is wrong.");
  const { password_hash, ...user } = rows[0];
  return user;
}
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

// One shared account per role for the demo. They have no password and can only
// act on simulated records (enforced where actions run).
export async function demoUser(role, name) {
  if (!ROLES[role]) throw new HttpError(400, "unknown role");
  const { rows } = await db().query(
    `insert into users (email, name, role, is_demo) values ($1, $2, $3, true)
     on conflict (email) do update set name = excluded.name
     returning ${USER_COLS}`,
    [`demo-${role}@demo.invalid`, name, role]);
  return rows[0];
}

export async function createUser({ email, name, role, org, password }) {
  if (!ROLES[role]) throw new Error(`role must be one of: ${Object.keys(ROLES).join(", ")}`);
  const { rows } = await db().query(
    `insert into users (email, name, role, org, password_hash) values (lower($1), $2, $3, $4, $5)
     returning ${USER_COLS}`,
    [email.trim(), name.trim(), role, org ?? null, await hashPassword(password)]);
  return rows[0];
}
