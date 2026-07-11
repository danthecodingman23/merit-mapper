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

/** Returns the current access token from the local session — no network call. */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Call the server-side scholarships API.
 *  All auth validation happens on the server — no client-side Supabase writes.
 */
async function api(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: object,
): Promise<{ data?: unknown; error?: string; status: number }> {
  const token = await getAccessToken();
  if (!token) {
    return { error: "Please sign in to continue.", status: 401 };
  }

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = await res.json() as Record<string, unknown>;
  } catch {
    // empty body (e.g. 204)
  }

  if (!res.ok) {
    const msg = (payload.error as string | undefined) ?? `Request failed (${res.status})`;
    return { error: msg, status: res.status };
  }

  return { data: payload.data ?? payload, status: res.status };
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
    console.log("[useSavedScholarships] fetchSaved for user:", user.id);
    try {
      const { data, error, status } = await api("GET", "/api/scholarships/saved");
      if (error) {
        console.error("[useSavedScholarships] fetchSaved error:", error, "status:", status);
      } else {
        const rows = data as SavedScholarship[];
        console.log("[useSavedScholarships] fetchSaved: got", rows.length, "rows");
        setSaved(rows);
        setSavedIds(new Set(rows.map((r) => r.scholarship_id)));
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
    if (!user) return { error: "not_logged_in" };

    console.log("[useSavedScholarships] save — calling API for scholarship:", scholarship.id);

    const { error, status } = await api("POST", "/api/scholarships/save", {
      scholarship_id: scholarship.id,
      scholarship_name: scholarship.name,
      amount: scholarship.amount ?? null,
      application_url: scholarship.application_url ?? null,
    });

    if (error) {
      console.error("[useSavedScholarships] save error:", error, "status:", status);
      if (status === 401) return { error: "session_expired" };
      return { error };
    }

    console.log("[useSavedScholarships] save: success");
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

  const unsave = useCallback(async (scholarshipId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: "not_logged_in" };

    console.log("[useSavedScholarships] unsave — calling API for scholarship:", scholarshipId);

    const { error, status } = await api("DELETE", "/api/scholarships/unsave", {
      scholarship_id: scholarshipId,
    });

    if (error) {
      console.error("[useSavedScholarships] unsave error:", error, "status:", status);
      if (status === 401) return { error: "session_expired" };
      return { error };
    }

    console.log("[useSavedScholarships] unsave: success");
    setSavedIds((prev) => { const n = new Set(prev); n.delete(scholarshipId); return n; });
    setSaved((prev) => prev.filter((r) => r.scholarship_id !== scholarshipId));
    return { error: null };
  }, [user]);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return { saved, loading, save, unsave, isSaved, refetch: fetchSaved };
}
