const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!ADMIN_PASSWORD) return res.status(503).json({ error: "ADMIN_PASSWORD env var not set on server" });
  const pw = (req.headers["x-admin-password"] ?? "").trim();
  if (pw !== ADMIN_PASSWORD.trim()) return res.status(401).json({ error: "Unauthorized" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: "Server misconfigured" });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/scholarship_feedback?order=submitted_at.desc`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  const data = await r.json();
  if (!r.ok) return res.status(r.status).json({ error: data?.message ?? "Supabase error" });
  return res.status(200).json(data);
}
