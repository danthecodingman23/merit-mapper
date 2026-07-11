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

/**
 * Validates the session by calling getUser(), which hits the Supabase auth server
 * (unlike getSession() which only reads localStorage and can return a stale/expired token).
 * Returns { uid, accessToken } if valid, or { error } if not.
 */
async function validateAndRefreshSession(): Promise<
  { uid: string; accessToken: string; error: null } | { uid: null; accessToken: null; error: string }
> {
  console.log("[validateSession] calling supabase.auth.getUser() to verify JWT server-side");

  // getUser() makes a real network call — it returns an error if the JWT is expired or invalid.
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    console.warn("[validateSession] getUser failed:", error?.message ?? "no user returned");

    // Try to refresh the session explicitly before giving up.
    console.log("[validateSession] attempting refreshSession()");
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError || !refreshData.session) {
      console.error("[validateSession] refreshSession also failed:", refreshError?.message ?? "no session");
      return { uid: null, accessToken: null, error: "Your session has expired. Please sign in again." };
    }

    console.log("[validateSession] refreshSession succeeded, user:", refreshData.user?.id);
    return {
      uid: refreshData.user!.id,
      accessToken: refreshData.session.access_token,
      error: null,
    };
  }

  // Get the current session to confirm we have an access token.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    console.warn("[validateSession] getUser succeeded but no access_token in session");
    return { uid: null, accessToken: null, error: "Your session has expired. Please sign in again." };
  }

  console.log("[validateSession] valid session — user:", data.user.id, "| token prefix:", accessToken.slice(0, 12) + "…");
  return { uid: data.user.id, accessToken, error: null };
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
    console.log("[useSavedScholarships] fetchSaved for user:", user.id);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_scholarships")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) {
        console.error("[useSavedScholarships] fetchSaved error:", { message: error.message, code: error.code });
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
      console.warn("[useSavedScholarships] save: no user in React state");
      return { error: "not_logged_in" };
    }

    // Validate the session against the Supabase server before attempting the insert.
    const session = await validateAndRefreshSession();
    if (session.error) {
      return { error: session.error };
    }

    const row = {
      user_id: session.uid,
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
      // 42501 = permission denied — almost always means the JWT wasn't sent (anon role)
      if (error.code === "42501") {
        return { error: "Session error — please sign out and sign back in, then try again." };
      }
      return { error: error.message };
    }

    console.log("[useSavedScholarships] save: success", data);
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

    const session = await validateAndRefreshSession();
    if (session.error) return { error: session.error };

    console.log("[useSavedScholarships] unsave:", scholarshipId, "for user:", session.uid);

    const { error } = await supabase
      .from("saved_scholarships")
      .delete()
      .eq("user_id", session.uid)
      .eq("scholarship_id", scholarshipId);

    if (error) {
      console.error("[useSavedScholarships] unsave error:", { message: error.message, code: error.code });
      return { error: error.message };
    }

    console.log("[useSavedScholarships] unsave: success");
    setSavedIds((prev) => { const n = new Set(prev); n.delete(scholarshipId); return n; });
    setSaved((prev) => prev.filter((r) => r.scholarship_id !== scholarshipId));
    return { error: null };
  }, [user]);

  const isSaved = useCallback((scholarshipId: string) => savedIds.has(scholarshipId), [savedIds]);

  return { saved, loading, save, unsave, isSaved, refetch: fetchSaved };
}
