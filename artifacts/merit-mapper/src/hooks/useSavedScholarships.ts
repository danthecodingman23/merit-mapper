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
    console.log("[useSavedScholarships] fetchSaved for user:", user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_scholarships")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) {
        console.error("[useSavedScholarships] fetchSaved error:", error.message, "code:", error.code);
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
      console.warn("[useSavedScholarships] save called with no user");
      return { error: "not_logged_in" };
    }

    // Read session from localStorage — no network call, no auth-server dependency.
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    console.log("[useSavedScholarships] save — user:", user.id, "| session present:", !!session, "| token prefix:", session?.access_token?.slice(0, 12) ?? "none");

    if (!session) {
      return { error: "No active session found. Please sign out and sign back in." };
    }

    const row = {
      user_id: user.id,
      scholarship_id: scholarship.id,
      scholarship_name: scholarship.name,
      amount: scholarship.amount ?? null,
      application_url: scholarship.application_url ?? null,
    };
    console.log("[useSavedScholarships] save — inserting:", row);

    // The Supabase client automatically attaches the JWT from its internal session
    // to every request — no manual header injection needed.
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
      if (error.code === "42501") {
        return { error: "Permission denied — your session may have expired. Sign out and sign back in." };
      }
      return { error: error.message };
    }

    console.log("[useSavedScholarships] save: success →", data);
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
    if (!user) return { error: "not_logged_in" };

    console.log("[useSavedScholarships] unsave:", scholarshipId, "for user:", user.id);

    const { error } = await supabase
      .from("saved_scholarships")
      .delete()
      .eq("user_id", user.id)
      .eq("scholarship_id", scholarshipId);

    if (error) {
      console.error("[useSavedScholarships] unsave error:", error.message, "code:", error.code);
      return { error: error.message };
    }

    console.log("[useSavedScholarships] unsave: success");
    setSavedIds((prev) => { const n = new Set(prev); n.delete(scholarshipId); return n; });
    setSaved((prev) => prev.filter((r) => r.scholarship_id !== scholarshipId));
    return { error: null };
  }, [user]);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { saved, loading, save, unsave, isSaved, refetch: fetchSaved };
}
