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

/** Returns the current access token, refreshing if the JWT is within 60 s of expiry. */
async function getValidAccessToken(): Promise<{ token: string; error: null } | { token: null; error: string }> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    console.error("[getValidAccessToken] getSession failed:", error?.message ?? "no session");
    return { token: null, error: "No active session. Please sign in." };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  const secondsLeft = expiresAt - now;

  console.log(
    "[getValidAccessToken] user:", session.user.id,
    "| token prefix:", session.access_token.slice(0, 16) + "…",
    "| expires:", new Date(expiresAt * 1000).toISOString(),
    "| seconds left:", secondsLeft,
  );

  // If JWT is expired or about to expire, try a refresh.
  if (secondsLeft <= 60) {
    console.warn("[getValidAccessToken] JWT near/past expiry — attempting refresh");
    try {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !refreshed.session) {
        console.error("[getValidAccessToken] refresh failed:", refreshErr?.message ?? "no session returned");
        // Sign out locally so stale session doesn't persist.
        await supabase.auth.signOut({ scope: "local" });
        return { token: null, error: "session_expired" };
      }
      console.log("[getValidAccessToken] refresh succeeded — new expiry:", new Date((refreshed.session.expires_at ?? 0) * 1000).toISOString());
      return { token: refreshed.session.access_token, error: null };
    } catch (e) {
      console.error("[getValidAccessToken] refresh threw:", e);
      return { token: null, error: "session_expired" };
    }
  }

  return { token: session.access_token, error: null };
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
      console.warn("[useSavedScholarships] save: no user");
      return { error: "not_logged_in" };
    }

    const auth = await getValidAccessToken();
    if (auth.error) return { error: auth.error };

    const row = {
      user_id: user.id,
      scholarship_id: scholarship.id,
      scholarship_name: scholarship.name,
      amount: scholarship.amount ?? null,
      application_url: scholarship.application_url ?? null,
    };
    console.log("[useSavedScholarships] save — inserting:", row);

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
      if (error.code === "42501") return { error: "session_expired" };
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

    const auth = await getValidAccessToken();
    if (auth.error) return { error: auth.error };

    console.log("[useSavedScholarships] unsave:", scholarshipId, "for user:", user.id);

    const { error } = await supabase
      .from("saved_scholarships")
      .delete()
      .eq("user_id", user.id)
      .eq("scholarship_id", scholarshipId);

    if (error) {
      console.error("[useSavedScholarships] unsave error:", error.message, "code:", error.code);
      if (error.code === "42501") return { error: "session_expired" };
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
