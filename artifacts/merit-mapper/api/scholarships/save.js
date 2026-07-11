const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Validate the user's JWT and return their user ID. Uses anon key for auth check. */
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

/** Headers for Supabase REST DB calls — uses service role key to bypass RLS. */
function dbHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error("[save] Missing env vars:", { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY });
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

  const { scholarship_id, scholarship_name, amount, application_url } = req.body ?? {};
  if (!scholarship_id || !scholarship_name) {
    return res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
  }

  const row = {
    user_id: userId,
    scholarship_id,
    scholarship_name,
    amount: amount ?? null,
    application_url: application_url ?? null,
  };

  console.log("[save] inserting for user:", userId, "scholarship:", scholarship_id);

  try {
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?on_conflict=user_id%2Cscholarship_id`,
      {
        method: "POST",
        headers: {
          ...dbHeaders(),
          "Prefer": "return=representation,resolution=merge-duplicates",
        },
        body: JSON.stringify(row),
      },
    );

    const body = await insertRes.json().catch(() => ({}));
    if (!insertRes.ok) {
      console.error("[save] insert failed:", insertRes.status, body);
      return res.status(insertRes.status).json({ error: body?.message ?? "Save failed" });
    }

    console.log("[save] success");
    return res.status(200).json({ data: body });
  } catch (err) {
    console.error("[save] unexpected error:", err);
    return res.status(500).json({ error: "Server error — please try again" });
  }
}
