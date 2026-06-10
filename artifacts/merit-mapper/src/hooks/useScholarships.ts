import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Scholarship } from "@/context/MatchContext";

interface UseScholarshipsResult {
  scholarships: Scholarship[];
  loading: boolean;
  error: string | null;
}

export function useScholarships(): UseScholarshipsResult {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      const { data, error: sbError } = await supabase
        .from("scholarships")
        .select(
          "id, name, provider, description, amount, deadline, requirements, eligibility, field_of_study, state_specific, min_gpa, application_url",
        )
        .order("name");

      if (cancelled) return;

      if (sbError) {
        setError(sbError.message);
        setLoading(false);
        return;
      }

      setScholarships((data as Scholarship[]) ?? []);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { scholarships, loading, error };
}
