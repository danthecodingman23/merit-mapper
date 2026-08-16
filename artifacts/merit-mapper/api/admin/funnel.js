const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const PAGE = 1000;   // PostgREST caps a single response; page through with Range
const MAX_ROWS = 50000;

const STEPS = [
  ["visitors", "page_view"],
  ["signup_page", "signup_started"],
  ["signups", "signup_completed"],
  ["matches", "match_run"],
  ["results", "results_viewed"],
  ["applies", "apply_clicked"],
];

async function fetchEvents(sinceIso) {
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const qs = new URLSearchParams({
      select: "session_id,user_id,event,utm_source,utm_medium,utm_campaign,created_at",
      order: "created_at.asc",
    });
    if (sinceIso) qs.set("created_at", `gte.${sinceIso}`);

    const r = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events?${qs}`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text().catch(() => "")}`);

    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

/** Count distinct sessions reaching each funnel step. */
function funnelFor(events) {
  const seen = new Map(STEPS.map(([key]) => [key, new Set()]));
  for (const e of events) {
    for (const [key, name] of STEPS) {
      if (e.event === name) seen.get(key).add(e.session_id);
    }
  }
  const out = {};
  for (const [key] of STEPS) out[key] = seen.get(key).size;
  return out;
}

function groupBy(events, keyFn) {
  const m = new Map();
  for (const e of events) {
    const k = keyFn(e) || "(none)";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(e);
  }
  return m;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD env var not set on server" });
  const pw = (req.headers["x-admin-password"] ?? "").trim();
  if (pw !== ADMIN_PASSWORD.trim()) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: "Server misconfigured" });

  const days = Number.parseInt(req.query?.days ?? "30", 10);
  const sinceIso =
    Number.isFinite(days) && days > 0
      ? new Date(Date.now() - days * 86400000).toISOString()
      : null;

  try {
    const events = await fetchEvents(sinceIso);

    const bySource = [...groupBy(events, (e) => e.utm_source)]
      .map(([source, evs]) => ({ source, ...funnelFor(evs) }))
      .sort((a, b) => b.visitors - a.visitors);

    const byCampaign = [...groupBy(events, (e) =>
      e.utm_campaign ? `${e.utm_source ?? "(none)"} · ${e.utm_campaign}` : null,
    )]
      .filter(([k]) => k !== "(none)")
      .map(([campaign, evs]) => ({ campaign, ...funnelFor(evs) }))
      .sort((a, b) => b.visitors - a.visitors);

    // Cross-check against the real auth table. Tracking only sees signups that
    // happened after it shipped, so a gap here is expected at first and is the
    // honest way to show how much of the funnel is actually instrumented.
    let authUsersTotal = null;
    try {
      const ur = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
      });
      if (ur.ok) {
        const ud = await ur.json();
        const users = ud?.users ?? [];
        authUsersTotal = sinceIso
          ? users.filter((u) => u.created_at && u.created_at >= sinceIso).length
          : users.length;
      }
    } catch {
      /* cross-check is a nicety; never fail the report over it */
    }

    return res.status(200).json({
      days: sinceIso ? days : null,
      totalEvents: events.length,
      truncated: events.length >= MAX_ROWS,
      overall: funnelFor(events),
      bySource,
      byCampaign,
      authUsersTotal,
    });
  } catch (err) {
    console.error("[admin/funnel] error:", err);
    return res.status(500).json({ error: err.message ?? "Query failed" });
  }
}
