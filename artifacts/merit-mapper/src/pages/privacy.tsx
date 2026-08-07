import { useEffect } from "react";

// The canonical privacy policy is the static, crawlable page at /privacy.html.
// This SPA route exists only to redirect any old /privacy links there, so the
// policy lives in exactly one place (public/privacy.html) and can't drift.
export default function Privacy() {
  useEffect(() => {
    window.location.replace("/privacy.html");
  }, []);
  return null;
}
