/**
 * Reports conversions back to Google Ads and Reddit Ads.
 *
 * This is the half that makes campaign optimization possible. Without it the
 * ad platforms only ever learn "someone clicked" — they never learn which
 * clicks turned into signups, so automated bidding has nothing to steer by.
 *
 * Both integrations are env-gated and no-op when unconfigured, so nothing
 * here fires until the corresponding id is set:
 *   VITE_GOOGLE_ADS_CONVERSION_LABEL  — the label from the Google Ads
 *       conversion action, e.g. "AbC-D_efG". The AW- id is already in
 *       index.html; this is the second half of the send_to value.
 *   VITE_REDDIT_PIXEL_ID              — the Reddit pixel advertiser id.
 */

const GOOGLE_ADS_ID = "AW-18382769329";
const GOOGLE_LABEL = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL as string | undefined;
const REDDIT_PIXEL_ID = import.meta.env.VITE_REDDIT_PIXEL_ID as string | undefined;

type Gtag = (...args: unknown[]) => void;
type Rdt = ((...args: unknown[]) => void) & { callQueue?: unknown[]; sendEvent?: Gtag };

declare global {
  interface Window {
    gtag?: Gtag;
    rdt?: Rdt;
  }
}

/** Load the Reddit pixel once, if configured. Safe to call more than once. */
export function initAdsPixels(): void {
  if (!REDDIT_PIXEL_ID || typeof window === "undefined" || window.rdt) return;

  try {
    const rdt: Rdt = function (...args: unknown[]) {
      if (rdt.sendEvent) rdt.sendEvent(...args);
      else (rdt.callQueue = rdt.callQueue ?? []).push(args);
    } as Rdt;
    rdt.callQueue = [];
    window.rdt = rdt;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.redditstatic.com/ads/pixel.js";
    document.head.appendChild(s);

    rdt("init", REDDIT_PIXEL_ID);
    rdt("track", "PageVisit");
  } catch {
    /* a missing pixel must never break the page */
  }
}

/**
 * Fire the signup conversion to both platforms.
 *
 * Call this exactly once per real signup. Firing it on page load or on every
 * render inflates the conversion count and actively misleads the bidding
 * algorithms, which is worse than not reporting at all.
 */
export function trackSignupConversion(): void {
  try {
    if (GOOGLE_LABEL && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: `${GOOGLE_ADS_ID}/${GOOGLE_LABEL}`,
      });
    }
    if (REDDIT_PIXEL_ID && typeof window.rdt === "function") {
      window.rdt("track", "SignUp");
    }
  } catch {
    /* ignore */
  }
}

/** Fired when a user completes their profile and runs their first match. */
export function trackMatchConversion(): void {
  try {
    if (REDDIT_PIXEL_ID && typeof window.rdt === "function") {
      window.rdt("track", "Custom", { customEventName: "MatchRun" });
    }
  } catch {
    /* ignore */
  }
}
