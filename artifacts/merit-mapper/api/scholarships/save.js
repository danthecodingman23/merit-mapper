const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function baseHeaders(jwt) {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${jwt}`,
  };
}

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

  // POST — save
  if (req.method === "POST") {
    const { scholarship_id, scholarship_name, amount, application_url } = req.body ?? {};
    if (!scholarship_id || !scholarship_name) {
      return res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
    }

    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?on_conflict=user_id%2Cscholarship_id`,
      {
        method: "POST",
        headers: {
          ...baseHeaders(token),
          "Prefer": "return=representation,resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: user.id,
          scholarship_id,
          scholarship_name,
          amount: amount ?? null,
          application_url: application_url ?? null,
        }),
      },
    );

    const body = await insertRes.json().catch(() => ({}));
    if (!insertRes.ok) {
      return res.status(insertRes.status).json({ error: body?.message ?? "Save failed" });
    }
    return res.status(200).json({ data: body });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
