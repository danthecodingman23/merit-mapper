import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface SavedScholarship {
  id: string;
  scholarship_id: string;
  scholarship_name: string;
  amount: number | null;
  application_url: string | null;
  saved_at: string;
}

export function useSavedScholarships() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedScholarship[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user) {
      setSaved([]);
      setSavedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_scholarships")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) {
        console.error("[useSavedScholarships] fetch error:", error.message);
      } else {
        setSaved(data ?? []);
        setSavedIds(new Set((data ?? []).map((r) => r.scholarship_id)));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const save = useCallback(async (scholarship: {
    id: string;
    name: string;
    amount?: number | null;
    application_url?: string | null;
  }) => {
    if (!user) return { error: "not_logged_in" };

    const row = {
      user_id: user.id,
      scholarship_id: scholarship.id,
      scholarship_name: scholarship.name,
      amount: scholarship.amount ?? null,
      application_url: scholarship.application_url ?? null,
    };

    const { error } = await supabase.from("saved_scholarships").upsert(row, {
      onConflict: "user_id,scholarship_id",
    });

    if (error) {
      console.error("[useSavedScholarships] save error:", error.message);
      return { error: error.message };
    }

    setSavedIds((prev) => new Set([...prev, scholarship.id]));
    setSaved((prev) => {
      if (prev.some((r) => r.scholarship_id === scholarship.id)) return prev;
      return [
        {
          id: crypto.randomUUID(),
          scholarship_id: scholarship.id,
          scholarship_name: scholarship.name,
          amount: scholarship.amount ?? null,
          application_url: scholarship.application_url ?? null,
          saved_at: new Date().toISOString(),
        },
        ...prev,
      ];
    });
    return { error: null };
  }, [user]);

  const unsave = useCallback(async (scholarshipId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("saved_scholarships")
      .delete()
      .eq("user_id", user.id)
      .eq("scholarship_id", scholarshipId);

    if (error) {
      console.error("[useSavedScholarships] unsave error:", error.message);
      return;
    }

    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(scholarshipId);
      return next;
    });
    setSaved((prev) => prev.filter((r) => r.scholarship_id !== scholarshipId));
  }, [user]);

  const isSaved = useCallback((scholarshipId: string) => savedIds.has(scholarshipId), [savedIds]);

  return { saved, loading, save, unsave, isSaved, refetch: fetchSaved };
}
