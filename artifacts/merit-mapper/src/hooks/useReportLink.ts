import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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

    const { error: insertError } = await supabase.from("reported_links").insert({
      scholarship_id: scholarshipId,
      scholarship_name: scholarshipName,
      application_url: applicationUrl,
      reported_at: new Date().toISOString(),
      user_id: user?.id ?? null,
    });

    setReporting(false);
    if (insertError) {
      setError("Couldn't submit report. Try again.");
    } else {
      setReported(true);
    }
  };

  return { report, reporting, reported, error };
}
