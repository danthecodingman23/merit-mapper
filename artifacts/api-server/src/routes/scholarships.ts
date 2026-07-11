import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"];
const SUPABASE_ANON_KEY = process.env["VITE_SUPABASE_ANON_KEY"];
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.warn("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set");
}
if (!SUPABASE_SERVICE_KEY) {
  logger.warn("SUPABASE_SERVICE_ROLE_KEY not set — scholarship routes will return 503");
}

/** Headers for Supabase REST DB calls — service role key bypasses RLS entirely. */
function dbHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY ?? "",
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY ?? ""}`,
  };
}

/** Validate the user's JWT against Supabase Auth and return their user ID. */
async function getUserId(jwt: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { id?: string };
    return data.id ?? null;
  } catch (err) {
    logger.error({ err }, "[scholarships] getUserId: fetch failed");
    return null;
  }
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

function missingConfig(res: ReturnType<typeof router.post extends (path: string, ...handlers: infer H) => unknown ? never : never>) {
  return false; // type helper — unused
}

/** POST /api/scholarships/save */
router.post("/scholarships/save", async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(503).json({ error: "Server not configured — SUPABASE_SERVICE_ROLE_KEY missing" });
    return;
  }

  const token = extractToken(req.headers["authorization"]);
  if (!token) { res.status(401).json({ error: "Missing Authorization header" }); return; }

  const userId = await getUserId(token);
  if (!userId) { res.status(401).json({ error: "Invalid or expired session — please sign in again" }); return; }

  const { scholarship_id, scholarship_name, amount, application_url } = req.body as {
    scholarship_id?: string; scholarship_name?: string; amount?: number | null; application_url?: string | null;
  };

  if (!scholarship_id || !scholarship_name) {
    res.status(400).json({ error: "scholarship_id and scholarship_name are required" });
    return;
  }

  const row = { user_id: userId, scholarship_id, scholarship_name, amount: amount ?? null, application_url: application_url ?? null };
  req.log.info({ scholarship_id, user_id: userId }, "[scholarships] save — inserting");

  try {
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?on_conflict=user_id%2Cscholarship_id`,
      {
        method: "POST",
        headers: { ...dbHeaders(), "Prefer": "return=representation,resolution=merge-duplicates" },
        body: JSON.stringify(row),
      },
    );
    const body = await insertRes.json().catch(() => ({})) as { message?: string };
    if (!insertRes.ok) {
      req.log.error({ status: insertRes.status, body }, "[scholarships] save — insert error");
      res.status(insertRes.status).json({ error: body?.message ?? "Save failed" });
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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(503).json({ error: "Server not configured — SUPABASE_SERVICE_ROLE_KEY missing" });
    return;
  }

  const token = extractToken(req.headers["authorization"]);
  if (!token) { res.status(401).json({ error: "Missing Authorization header" }); return; }

  const userId = await getUserId(token);
  if (!userId) { res.status(401).json({ error: "Invalid or expired session — please sign in again" }); return; }

  const { scholarship_id } = req.body as { scholarship_id?: string };
  if (!scholarship_id) { res.status(400).json({ error: "scholarship_id is required" }); return; }

  req.log.info({ scholarship_id, user_id: userId }, "[scholarships] unsave — deleting");

  try {
    const deleteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${userId}&scholarship_id=eq.${encodeURIComponent(scholarship_id)}`,
      { method: "DELETE", headers: dbHeaders() },
    );
    if (!deleteRes.ok) {
      const body = await deleteRes.json().catch(() => ({})) as { message?: string };
      req.log.error({ status: deleteRes.status, body }, "[scholarships] unsave — error");
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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(503).json({ error: "Server not configured — SUPABASE_SERVICE_ROLE_KEY missing" });
    return;
  }

  const token = extractToken(req.headers["authorization"]);
  if (!token) { res.status(401).json({ error: "Missing Authorization header" }); return; }

  const userId = await getUserId(token);
  if (!userId) { res.status(401).json({ error: "Invalid or expired session — please sign in again" }); return; }

  try {
    const listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_scholarships?user_id=eq.${userId}&order=saved_at.desc`,
      { headers: { ...dbHeaders(), "Accept": "application/json" } },
    );
    const body = await listRes.json().catch(() => []) as unknown;
    if (!listRes.ok) {
      res.status(listRes.status).json({ error: (body as { message?: string })?.message ?? "Fetch failed" });
      return;
    }
    res.json({ data: body });
  } catch (err) {
    logger.error({ err }, "[scholarships] saved list — unexpected error");
    res.status(500).json({ error: "Server error — please try again" });
  }
});

export default router;
