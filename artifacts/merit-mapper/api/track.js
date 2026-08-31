const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Allowlist. A public write endpoint must not let callers invent event names,
// or the funnel fills with junk and the table becomes a free write target.
const ALLOWED_EVENTS = new Set([
  "page_view",
  "signup_started",
  "signup_completed",
  "match_run",
  "match_failed",
  "results_viewed",
  "scholarship_saved",
  "apply_clicked",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trim to a sane length so no single field can bloat the table. */
function str(v, max = 255) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: "Server misconfigured" });

  const b = req.body ?? {};

  if (!ALLOWED_EVENTS.has(b.event)) return res.status(400).json({ error: "Unknown event" });
  if (!UUID_RE.test(b.session_id ?? "")) return res.status(400).json({ error: "Invalid session_id" });

  const row = {
    session_id: b.session_id,
    user_id: UUID_RE.test(b.user_id ?? "") ? b.user_id : null,
    event: b.event,
    path: str(b.path),
    utm_source: str(b.utm_source, 120),
    utm_medium: str(b.utm_medium, 120),
    utm_campaign: str(b.utm_campaign, 200),
    utm_content: str(b.utm_content, 200),
    utm_term: str(b.utm_term, 200),
    click_id: str(b.click_id, 200),
    referrer: str(b.referrer, 500),
    meta: b.meta && typeof b.meta === "object" ? b.meta : null,
  };

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[track] Supabase insert failed:", r.status, detail);
      return res.status(500).json({ error: "Insert failed" });
    }

    // 204: the browser has nothing to do with the response.
    return res.status(204).end();
  } catch (err) {
    console.error("[track] Unexpected error:", err);
    return res.status(500).json({ error: "Insert failed" });
  }
}
