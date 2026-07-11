const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function getUser(jwt) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ? data : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: "Supabase not configured" });
  }

  const auth = req.headers["authorization"] ?? "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const token = auth.slice(7).trim();

  const user = await getUser(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session — please sign in again" });
  }

  const { scholarship_id } = req.body ?? {};
  if (!scholarship_id) {
    return res.status(400).json({ error: "scholarship_id is required" });
  }

  try {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${user.id}&scholarship_id=eq.${encodeURIComponent(scholarship_id)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${token}`,
        },
      },
    );

    if (!deleteRes.ok) {
      const body = await deleteRes.json().catch(() => ({}));
      return res.status(deleteRes.status).json({ error: body?.message ?? "Delete failed" });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[/api/scholarships/unsave] error:", err);
    return res.status(500).json({ error: "Server error — please try again" });
  }
}
