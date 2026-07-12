const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Decode the `role` claim from a Supabase JWT without verifying the signature. */
function jwtRole(jwt) {
  try {
    const payload = jwt.split(".")[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(decoded)?.role ?? "unknown";
  } catch {
    return "decode-error";
  }
}

/** Only store numeric amounts in the integer column — pass null for "Full Tuition" etc. */
function toNumericAmount(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
}

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

  if (!SUPABASE_URL) return res.status(503).json({ error: "[DIAG] VITE_SUPABASE_URL not set in Vercel." });
  if (!SUPABASE_ANON_KEY) return res.status(503).json({ error: "[DIAG] VITE_SUPABASE_ANON_KEY not set in Vercel." });
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(503).json({
      error: "[DIAG] SUPABASE_SERVICE_ROLE_KEY not set — add it in Vercel Settings → Environment Variables, then Redeploy.",
    });
  }

  const serviceKeyRole = jwtRole(SUPABASE_SERVICE_KEY);
  if (serviceKeyRole !== "service_role") {
    return res.status(503).json({
      error: `[DIAG] Wrong key: role="${serviceKeyRole}". Need role="service_role". Copy the service_role key (not anon) from Supabase → Project Settings → API.`,
    });
  }

  const auth = req.headers["authorization"] ?? "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Missing Authorization header" });
  const userJwt = auth.slice(7).trim();

  const userId = await getUserId(userJwt);
  if (!userId) return res.status(401).json({ error: "Invalid or expired session — please sign in again" });

  const { scholarship_id, scholarship_name, amount, application_url } = req.body ?? {};
  if (!scholarship_id || !scholarship_name) {
    return res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
  }

  const row = {
    user_id: userId,
    scholarship_id,
    scholarship_name,
    amount: toNumericAmount(amount),   // converts "Full Tuition" → null safely
    application_url: application_url ?? null,
  };

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
      return res.status(insertRes.status).json({
        error: `[DIAG] DB insert failed (HTTP ${insertRes.status}). Supabase said: "${supaMsg}"`,
      });
    }

    return res.status(200).json({ data: body });
  } catch (err) {
    return res.status(500).json({ error: `[DIAG] Network error: ${err?.message ?? String(err)}` });
  }
}
