const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getUserId(jwt) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${jwt}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

function dbHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Accept": "application/json",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error("[saved] Missing env vars");
    return res.status(503).json({ error: "Server not configured — contact support" });
  }

  const auth = req.headers["authorization"] ?? "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const userJwt = auth.slice(7).trim();

  const userId = await getUserId(userJwt);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session — please sign in again" });
  }

  try {
    const listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${userId}&order=saved_at.desc`,
      { headers: dbHeaders() },
    );

    const body = await listRes.json().catch(() => []);
    if (!listRes.ok) {
      console.error("[saved] list failed:", listRes.status, body);
      return res.status(listRes.status).json({ error: body?.message ?? "Fetch failed" });
    }

    return res.status(200).json({ data: body });
  } catch (err) {
    console.error("[saved] unexpected error:", err);
    return res.status(500).json({ error: "Server error — please try again" });
  }
}
