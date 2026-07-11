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
      console.log("[useSavedScholarships] fetchSaved: no user, skipping");
      setSaved([]);
      setSavedIds(new Set());
      return;
    }
    console.log("[useSavedScholarships] fetchSaved: user_id =", user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_scholarships")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) {
        console.error("[useSavedScholarships] fetchSaved error:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
      } else {
        console.log("[useSavedScholarships] fetchSaved: got", data?.length ?? 0, "rows");
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
  }): Promise<{ error: string | null }> => {
    if (!user) {
      console.warn("[useSavedScholarships] save: no user");
      return { error: "not_logged_in" };
    }

    // Verify session is still active before inserting
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("[useSavedScholarships] save: session active =", !!sessionData?.session, "| user_id =", user.id);

    if (!sessionData?.session) {
      console.warn("[useSavedScholarships] save: session is null — user may need to sign in again");
      return { error: "Session expired. Please sign in again." };
    }

    const row = {
      user_id: user.id,
      scholarship_id: scholarship.id,
      scholarship_name: scholarship.name,
      amount: scholarship.amount ?? null,
      application_url: scholarship.application_url ?? null,
    };
    console.log("[useSavedScholarships] save: inserting row:", row);

    const { data, error } = await supabase
      .from("saved_scholarships")
      .upsert(row, { onConflict: "user_id,scholarship_id" })
      .select();

    if (error) {
      console.error("[useSavedScholarships] save error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { error: error.message };
    }

    console.log("[useSavedScholarships] save: success, returned rows:", data);

    setSavedIds((prev) => new Set([...prev, scholarship.id]));
    setSaved((prev) => {
      if (prev.some((r) => r.scholarship_id === scholarship.id)) return prev;
      return [
        {
          id: (data?.[0]?.id as string) ?? crypto.randomUUID(),
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

  const unsave = useCallback(async (scholarshipId: string): Promise<{ error: string | null }> => {
    if (!user) {
      console.warn("[useSavedScholarships] unsave: no user");
      return { error: "not_logged_in" };
    }
    console.log("[useSavedScholarships] unsave: scholarship_id =", scholarshipId, "| user_id =", user.id);

    const { error } = await supabase
      .from("saved_scholarships")
      .delete()
      .eq("user_id", user.id)
      .eq("scholarship_id", scholarshipId);

    if (error) {
      console.error("[useSavedScholarships] unsave error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return { error: error.message };
    }

    console.log("[useSavedScholarships] unsave: success");
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(scholarshipId);
      return next;
    });
    setSaved((prev) => prev.filter((r) => r.scholarship_id !== scholarshipId));
    return { error: null };
  }, [user]);

  const isSaved = useCallback((scholarshipId: string) => savedIds.has(scholarshipId), [savedIds]);

  return { saved, loading, save, unsave, isSaved, refetch: fetchSaved };
}
