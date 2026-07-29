const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD env var not set on server" });
  const pw = (req.headers["x-admin-password"] ?? "").trim();
  if (pw !== ADMIN_PASSWORD.trim()) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: "Server misconfigured" });

  const { scholarship_id, new_url } = req.body ?? {};
  if (!scholarship_id || !new_url) return res.status(400).json({ error: "scholarship_id and new_url are required" });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/scholarships?id=eq.${encodeURIComponent(scholarship_id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ application_url: new_url }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return res.status(r.status).json({ error: data?.message ?? "Supabase error" });
  return res.status(200).json({ ok: true });
}
