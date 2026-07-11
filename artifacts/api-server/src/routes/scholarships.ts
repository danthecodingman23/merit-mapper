import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"];
const SUPABASE_KEY = process.env["VITE_SUPABASE_ANON_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logger.warn("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — scholarship save routes will return 503");
}

function baseHeaders(jwt: string) {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY ?? "",
    "Authorization": `Bearer ${jwt}`,
  };
}

/** Verify the JWT against Supabase Auth and return the user, or null if invalid. */
async function getUser(jwt: string): Promise<{ id: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { id?: string };
    return data.id ? { id: data.id } : null;
  } catch (err) {
    logger.error({ err }, "[scholarships] getUser: fetch failed");
    return null;
  }
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/** POST /api/scholarships/save */
router.post("/scholarships/save", async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(503).json({ error: "Supabase not configured on the server" });
    return;
  }

  const token = extractToken(req.headers["authorization"]);
  if (!token) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const user = await getUser(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session — please sign in again" });
    return;
  }

  const { scholarship_id, scholarship_name, amount, application_url } = req.body as {
    scholarship_id?: string;
    scholarship_name?: string;
    amount?: number | null;
    application_url?: string | null;
  };

  if (!scholarship_id || !scholarship_name) {
    res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
    return;
  }

  const row = {
    user_id: user.id,
    scholarship_id,
    scholarship_name,
    amount: amount ?? null,
    application_url: application_url ?? null,
  };

  req.log.info({ scholarship_id, user_id: user.id }, "[scholarships] save — inserting");

  try {
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?on_conflict=user_id%2Cscholarship_id`,
      {
        method: "POST",
        headers: {
          ...baseHeaders(token),
          "Prefer": "return=representation,resolution=merge-duplicates",
        },
        body: JSON.stringify(row),
      },
    );

    const body = await insertRes.json() as unknown;

    if (!insertRes.ok) {
      const errMsg = (body as { message?: string })?.message ?? "Save failed";
      req.log.error({ status: insertRes.status, body }, "[scholarships] save — insert error");
      res.status(insertRes.status).json({ error: errMsg });
      return;
    }

    req.log.info({ scholarship_id }, "[scholarships] save — success");
    res.json({ data: body });
  } catch (err) {
    logger.error({ err }, "[scholarships] save — unexpected error");
    res.status(500).json({ error: "Server error — please try again" });
  }
});

/** DELETE /api/scholarships/unsave — body: { scholarship_id } */
router.delete("/scholarships/unsave", async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(503).json({ error: "Supabase not configured on the server" });
    return;
  }

  const token = extractToken(req.headers["authorization"]);
  if (!token) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const user = await getUser(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session — please sign in again" });
    return;
  }

  const { scholarship_id } = req.body as { scholarship_id?: string };
  if (!scholarship_id) {
    res.status(400).json({ error: "scholarship_id is required" });
    return;
  }

  req.log.info({ scholarship_id, user_id: user.id }, "[scholarships] unsave — deleting");

  try {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${user.id}&scholarship_id=eq.${encodeURIComponent(scholarship_id)}`,
      {
        method: "DELETE",
        headers: baseHeaders(token),
      },
    );

    if (!deleteRes.ok) {
      const body = await deleteRes.json() as { message?: string };
      req.log.error({ status: deleteRes.status, body }, "[scholarships] unsave — delete error");
      res.status(deleteRes.status).json({ error: body?.message ?? "Delete failed" });
      return;
    }

    req.log.info({ scholarship_id }, "[scholarships] unsave — success");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[scholarships] unsave — unexpected error");
    res.status(500).json({ error: "Server error — please try again" });
  }
});

/** GET /api/scholarships/saved */
router.get("/scholarships/saved", async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(503).json({ error: "Supabase not configured on the server" });
    return;
  }

  const token = extractToken(req.headers["authorization"]);
  if (!token) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const user = await getUser(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session — please sign in again" });
    return;
  }

  try {
    const listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${user.id}&order=saved_at.desc`,
      {
        headers: { ...baseHeaders(token), "Accept": "application/json" },
      },
    );

    if (!listRes.ok) {
      const body = await listRes.json() as { message?: string };
      res.status(listRes.status).json({ error: body?.message ?? "Fetch failed" });
      return;
    }

    const data = await listRes.json();
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "[scholarships] saved list — unexpected error");
    res.status(500).json({ error: "Server error — please try again" });
  }
});

export default router;
