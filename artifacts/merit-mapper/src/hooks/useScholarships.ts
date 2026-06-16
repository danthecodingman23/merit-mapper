import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Scholarship } from "@/context/MatchContext";

interface SupabaseScholarshipRow {
  id: string | number;
  scholarship_name: string;
  provider: string;
  amount: number | null;
  deadline: string | null;
  eligibility_criteria: string | null;
  application_url: string | null;
  essay_required: boolean | null;
  renewable: boolean | null;
  category_tags: string[] | null;
}

function toScholarship(row: SupabaseScholarshipRow): Scholarship {
  return {
    id: String(row.id),
    name: row.scholarship_name,
    provider: row.provider,
    amount: row.amount ?? undefined,
    deadline: row.deadline ?? undefined,
    eligibility: row.eligibility_criteria ?? undefined,
    application_url: row.application_url ?? undefined,
    essay_required: row.essay_required ?? undefined,
    renewable: row.renewable ?? undefined,
    category_tags: row.category_tags ?? undefined,
  };
}

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

    async function load() {
      setLoading(true);
      setError(null);

      console.log("[useScholarships] Fetching scholarships from Supabase…");

      const { data, error: sbError } = await supabase
        .from("scholarships")
        .select(
          "id, scholarship_name, provider, amount, deadline, eligibility_criteria, application_url, essay_required, renewable, category_tags",
        )
        .order("scholarship_name");

      if (cancelled) return;

      if (sbError) {
        console.error("[useScholarships] Supabase error:", sbError.message);
        setError(sbError.message);
        setLoading(false);
        return;
      }

      const rows = (data as SupabaseScholarshipRow[]) ?? [];
      console.log(`[useScholarships] Loaded ${rows.length} scholarships. First ID:`, rows[0]?.id, typeof rows[0]?.id);

      const mapped = rows.map(toScholarship);
      setScholarships(mapped);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { scholarships, loading, error };
}
