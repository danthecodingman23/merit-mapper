const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getUserId(jwt) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Diagnostic: env check ────────────────────────────────────────────────
  if (!SUPABASE_URL) {
    return res.status(503).json({
      error: "[DIAG] VITE_SUPABASE_URL is not set in Vercel environment variables.",
    });
  }
  if (!SUPABASE_ANON_KEY) {
    return res.status(503).json({
      error: "[DIAG] VITE_SUPABASE_ANON_KEY is not set in Vercel environment variables.",
    });
  }
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(503).json({
      error: "[DIAG] SUPABASE_SERVICE_ROLE_KEY is not set in Vercel environment variables. Go to Vercel → Settings → Environment Variables, add it, then Redeploy.",
    });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const auth = req.headers["authorization"] ?? "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const userJwt = auth.slice(7).trim();

  const userId = await getUserId(userJwt);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session — please sign in again" });
  }

  // ── Body validation ───────────────────────────────────────────────────────
  const { scholarship_id, scholarship_name, amount, application_url } = req.body ?? {};
  if (!scholarship_id || !scholarship_name) {
    return res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
  }

  // ── DB insert using service role key (bypasses RLS) ───────────────────────
  const row = {
    user_id: userId,
    scholarship_id,
    scholarship_name,
    amount: amount ?? null,
    application_url: application_url ?? null,
  };

  const keyPreview = SUPABASE_SERVICE_KEY.slice(0, 12) + "...";

  try {
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?on_conflict=user_id%2Cscholarship_id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Prefer": "return=representation,resolution=merge-duplicates",
        },
        body: JSON.stringify(row),
      },
    );

    const body = await insertRes.json().catch(() => ({}));

    if (!insertRes.ok) {
      const supaMsg = body?.message ?? body?.error ?? JSON.stringify(body);
      // Return a detailed diagnostic that will show on screen
      return res.status(insertRes.status).json({
        error: `[DIAG] DB insert failed (HTTP ${insertRes.status}). Service key prefix: ${keyPreview}. Supabase said: "${supaMsg}"`,
      });
    }

    return res.status(200).json({ data: body });
  } catch (err) {
    return res.status(500).json({
      error: `[DIAG] Network error calling Supabase: ${err?.message ?? String(err)}`,
    });
  }
}
