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
  };
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error("[unsave] Missing env vars");
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

  const { scholarship_id } = req.body ?? {};
  if (!scholarship_id) {
    return res.status(400).json({ error: "scholarship_id is required" });
  }

  try {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${userId}&scholarship_id=eq.${encodeURIComponent(scholarship_id)}`,
      { method: "DELETE", headers: dbHeaders() },
    );

    if (!deleteRes.ok) {
      const body = await deleteRes.json().catch(() => ({}));
      console.error("[unsave] delete failed:", deleteRes.status, body);
      return res.status(deleteRes.status).json({ error: body?.message ?? "Delete failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[unsave] unexpected error:", err);
    return res.status(500).json({ error: "Server error — please try again" });
  }
}
