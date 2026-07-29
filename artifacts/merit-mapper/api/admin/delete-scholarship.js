const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD env var not set on server" });
  const pw = (req.headers["x-admin-password"] ?? "").trim();
  if (pw !== ADMIN_PASSWORD.trim()) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: "Server misconfigured" });

  const { scholarship_id } = req.body ?? {};
  if (!scholarship_id) return res.status(400).json({ error: "scholarship_id is required" });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/scholarships?id=eq.${encodeURIComponent(scholarship_id)}`, {
    method: "DELETE",
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return res.status(r.status).json({ error: data?.message ?? "Supabase error" });
  }
  return res.status(200).json({ ok: true });
}
