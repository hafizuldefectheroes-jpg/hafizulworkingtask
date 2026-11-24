import { createClient } from "npm:@supabase/supabase-js@2";

// ReTask AI proxy.
// Preferred: Vercel AI Gateway (free $5/month tier) via AI_GATEWAY_API_KEY.
// Fallback: direct Anthropic API via ANTHROPIC_API_KEY (paid).
const URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GW_KEY = Deno.env.get("AI_GATEWAY_API_KEY") || "";
const AN_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
// Models tried in order on the gateway. If one is not in the free tier (403),
// the next is tried. Override with RETASK_AI_MODELS="a,b,c".
const GW_MODELS = (Deno.env.get("RETASK_AI_MODELS") ||
  "anthropic/claude-haiku-5.5,deepseek/deepseek-v4.1-flash,google/gemini-2.5-flash-lite,openai/gpt-5-nano,nvidia/nemotron-3.5-lightning-free")
  .split(",").map((s) => s.trim()).filter(Boolean);
const AN_MODEL = Deno.env.get("RETASK_AI_MODEL") || "claude-haiku-5-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = createClient(URL, SRK, { auth: { persistSession: false } });
let goodModel = ""; // remembers the first gateway model that worked

async function call(url: string, headers: Record<string, string>, body: Record<string, unknown>) {
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({ error: { message: "Bad response from AI service" } }));
  return { r, out };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data } = await admin.auth.getUser(token);
  if (!data?.user) return json({ error: "Please sign in again." }, 401);
  const { data: p } = await admin.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (!p) return json({ error: "Your login has no access yet." }, 403);
  if (!GW_KEY && !AN_KEY) return json({ error: "not_configured" }, 200);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const base: Record<string, unknown> = {
    max_tokens: Math.min(Number(b.max_tokens) || 1500, 4000),
    system: String(b.system || "").slice(0, 120000),
    messages: Array.isArray(b.messages) ? b.messages.slice(-30) : [],
  };
  if (p.role !== "viewer" && Array.isArray(b.tools) && b.tools.length) base.tools = b.tools.slice(0, 8);

  if (GW_KEY) {
    const headers = {
      "Authorization": `Bearer ${GW_KEY}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    };
    const order = goodModel ? [goodModel, ...GW_MODELS.filter((m) => m !== goodModel)] : GW_MODELS;
    let last = "";
    for (const model of order) {
      const { r, out } = await call("https://ai-gateway.vercel.sh/v1/messages", headers, { ...base, model });
      if (r.ok) {
        goodModel = model;
        return json({ content: out.content, stop_reason: out.stop_reason, model: out.model || model });
      }
      last = out?.error?.message || `AI service error ${r.status}`;
      if (r.status === 429) return json({ error: "Regen AI is busy (free-tier limit). Wait a minute and try again." }, 200);
      if (r.status === 401) return json({ error: "The AI Gateway key is invalid or expired. An admin needs to update AI_GATEWAY_API_KEY." }, 200);
      if (/credit|balance|insufficient|quota/i.test(last) && r.status === 402) {
        return json({ error: "This month's free AI credit is used up. It renews every 30 days." }, 200);
      }
      // 403 free-tier model restriction, 404 unknown model, 400 tool format etc.: try the next model
    }
    return json({ error: last || "No AI model is available right now." }, 200);
  }

  const { r, out } = await call("https://api.anthropic.com/v1/messages", {
    "x-api-key": AN_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  }, { ...base, model: AN_MODEL });
  if (!r.ok) return json({ error: out?.error?.message || `AI service error ${r.status}` }, 200);
  return json({ content: out.content, stop_reason: out.stop_reason, model: out.model });
});
