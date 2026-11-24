import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DOMAIN = "users.retask.app";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = createClient(URL, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const UN = /^[a-z0-9]{3,20}$/;
const ROLES = ["admin", "editor", "viewer"];
const PW_MSG = "Password needs at least 5 letters, 1 capital letter and 1 number (for example Regen1).";
const okPw = (p: string) => (p.match(/[A-Za-z]/g) || []).length >= 5 && /[A-Z]/.test(p) && /[0-9]/.test(p) && p.length <= 72;

async function hasAdmin() {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return (count ?? 0) > 0;
}
async function caller(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await admin.from("profiles").select("id,role,username").eq("id", data.user.id).maybeSingle();
  return p;
}
async function makeUser(username: string, password: string, full_name: string, role: string) {
  username = String(username || "").trim().toLowerCase();
  if (!UN.test(username)) return { error: "Username must be 3-20 letters or numbers, with no spaces." };
  if (!okPw(String(password || ""))) return { error: PW_MSG };
  if (!ROLES.includes(role)) return { error: "Unknown role." };
  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return { error: "That username is already taken." };
  const { data, error } = await admin.auth.admin.createUser({ email: `${username}@${DOMAIN}`, password, email_confirm: true, user_metadata: { username, full_name } });
  if (error || !data.user) return { error: error?.message || "Could not create the login." };
  const { error: e2 } = await admin.from("profiles").insert({ id: data.user.id, username, full_name: String(full_name || "").slice(0, 80), role });
  if (e2) { await admin.auth.admin.deleteUser(data.user.id); return { error: e2.message }; }
  return { ok: true, id: data.user.id, username };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const action = String(b.action || "");
  try {
    if (action === "status") return json({ has_admin: await hasAdmin(), domain: DOMAIN });
    if (action === "bootstrap") {
      if (await hasAdmin()) return json({ error: "An admin already exists. Ask them for a login." }, 403);
      const r = await makeUser(String(b.username), String(b.password), String(b.full_name || ""), "admin");
      return json(r, r.error ? 400 : 200);
    }
    const me = await caller(req);
    if (!me) return json({ error: "Please sign in again." }, 401);
    if (me.role !== "admin") return json({ error: "Only an admin can manage logins." }, 403);
    if (action === "create") {
      const r = await makeUser(String(b.username), String(b.password), String(b.full_name || ""), String(b.role || "editor"));
      return json(r, r.error ? 400 : 200);
    }
    const uid = String(b.user_id || "");
    if (!uid) return json({ error: "Missing user" }, 400);
    if (action === "set_password") {
      if (!okPw(String(b.password || ""))) return json({ error: PW_MSG }, 400);
      const { error } = await admin.auth.admin.updateUserById(uid, { password: String(b.password) });
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }
    if (action === "set_role") {
      const role = String(b.role || "");
      if (!ROLES.includes(role)) return json({ error: "Unknown role." }, 400);
      if (uid === me.id && role !== "admin") return json({ error: "You cannot remove your own admin role." }, 400);
      const { error } = await admin.from("profiles").update({ role }).eq("id", uid);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }
    if (action === "delete") {
      if (uid === me.id) return json({ error: "You cannot delete your own login." }, 400);
      const { error } = await admin.auth.admin.deleteUser(uid);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
