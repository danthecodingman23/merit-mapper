const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: "Server misconfigured" });
  }

  const { scholarship_id, scholarship_name, application_url, user_id } = req.body ?? {};
  if (!scholarship_id || !scholarship_name) {
    return res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/reported_links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      scholarship_id,
      scholarship_name,
      application_url: application_url ?? null,
      reported_at: new Date().toISOString(),
      user_id: user_id ?? null,
    }),
  });

  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    console.error("[report-link] Supabase error:", data);
    return res.status(r.status).json({ error: data?.message ?? "Supabase insert failed" });
  }

  return res.status(200).json({ ok: true });
}
