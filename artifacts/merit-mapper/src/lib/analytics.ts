/**
 * First-party funnel analytics.
 *
 * Attribution model is FIRST-TOUCH: whichever ad or referrer brought a
 * visitor here the first time is credited with everything they later do.
 * That is the right default for signup attribution — the Google ad that
 * introduced someone shouldn't lose credit because they came back via a
 * bookmark two days later.
 *
 * Every call is fire-and-forget and swallows its own errors. Analytics must
 * never be able to break a page.
 */

const SESSION_KEY = "mm_session_id";
const ATTR_KEY = "mm_attribution";
const USER_KEY = "mm_user_id";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type FunnelEvent =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "match_run"
  | "match_failed"
  | "results_viewed"
  | "scholarship_saved"
  | "apply_clicked";

interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  click_id: string | null;
  referrer: string | null;
}

function safeLocal(): Storage | null {
  try {
    const t = "__mm_t";
    window.localStorage.setItem(t, t);
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return null; // Safari private mode, storage disabled, etc.
  }
}

function uuid(): string {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Random id for this browser, minted once and reused. Not tied to identity. */
export function getSessionId(): string {
  const ls = safeLocal();
  if (!ls) return "00000000-0000-4000-8000-000000000000";
  let id = ls.getItem(SESSION_KEY);
  if (!id) {
    id = uuid();
    ls.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Derive a readable source when there are no UTM params, so direct and
 * organic traffic doesn't all collapse into one unlabelled bucket.
 */
function inferSource(referrer: string | null): string {
  if (!referrer) return "direct";
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "");
    if (h === window.location.hostname) return "direct"; // internal navigation
    if (h.includes("google.")) return "google_organic";
    if (h.includes("reddit.")) return "reddit_organic";
    if (h.includes("bing.")) return "bing_organic";
    return h;
  } catch {
    return "direct";
  }
}

/**
 * Capture attribution on first arrival. Later visits do not overwrite it,
 * except that a visit carrying fresh UTM params from a *new* campaign click
 * is recorded — an explicit ad click is a stronger signal than a stale
 * first-touch value.
 */
export function initAttribution(): void {
  const ls = safeLocal();
  if (!ls) return;

  try {
    const q = new URLSearchParams(window.location.search);
    const clickId = q.get("gclid") ?? q.get("rdt_cid") ?? q.get("fbclid");
    const hasUtm = q.get("utm_source") || q.get("utm_campaign") || clickId;

    const existing = ls.getItem(ATTR_KEY);
    if (existing && !hasUtm) return; // keep first touch

    const referrer = document.referrer || null;
    const attr: Attribution = {
      utm_source: q.get("utm_source") ?? (existing ? null : inferSource(referrer)),
      utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"),
      utm_content: q.get("utm_content"),
      utm_term: q.get("utm_term"),
      click_id: clickId,
      referrer,
    };

    if (existing && hasUtm) {
      // new campaign click — take the new values, keep the original referrer
      const prev = JSON.parse(existing) as Attribution;
      attr.referrer = prev.referrer ?? referrer;
    }

    ls.setItem(ATTR_KEY, JSON.stringify(attr));
  } catch {
    /* never let attribution break the app */
  }
}

function getAttribution(): Partial<Attribution> {
  const ls = safeLocal();
  if (!ls) return {};
  try {
    const raw = ls.getItem(ATTR_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

/** Remember the user id so later events in this browser carry it. */
export function identify(userId: string | null): void {
  const ls = safeLocal();
  if (!ls) return;
  try {
    if (userId) ls.setItem(USER_KEY, userId);
    else ls.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

function getUserId(): string | null {
  const ls = safeLocal();
  if (!ls) return null;
  try {
    return ls.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/**
 * Record a funnel event. Never throws, never awaits anything the caller
 * depends on. `keepalive` lets the request survive the page unloading, which
 * matters for apply_clicked firing on an outbound link.
 */
export function track(event: FunnelEvent, meta?: Record<string, unknown>): void {
  try {
    // The admin dashboard shouldn't pollute the funnel it is reporting on.
    if (window.location.pathname.includes("/admin")) return;

    // React runs child effects before parent effects, so the first page_view
    // fires before App's init effect. Initialising here (idempotent) is what
    // guarantees the landing hit — the one carrying the ad's UTM params —
    // is actually attributed.
    initAttribution();

    const body = JSON.stringify({
      event,
      session_id: getSessionId(),
      user_id: getUserId(),
      path: window.location.pathname,
      ...getAttribution(),
      meta: meta ?? null,
    });

    void fetch(`${BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics must never surface an error to the user */
    });
  } catch {
    /* ignore */
  }
}
