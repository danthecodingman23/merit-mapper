import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ReportArgs {
  scholarshipId: string;
  scholarshipName: string;
  applicationUrl: string | null;
}

export function useReportLink() {
  const { user } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = async ({ scholarshipId, scholarshipName, applicationUrl }: ReportArgs) => {
    if (reported || reporting) return;
    setReporting(true);
    setError(null);

    try {
      const r = await fetch(`${BASE}/api/report-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scholarship_id: scholarshipId,
          scholarship_name: scholarshipName,
          application_url: applicationUrl,
          user_id: user?.id ?? null,
        }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        const msg = data?.error ?? `HTTP ${r.status}`;
        console.error("[useReportLink] API error:", r.status, data);
        setError(`Failed (${msg})`);
      } else {
        setReported(true);
      }
    } catch (err) {
      console.error("[useReportLink] Network error:", err);
      setError("Network error — are you on the Vercel URL?");
    } finally {
      setReporting(false);
    }
  };

  return { report, reporting, reported, error };
}
