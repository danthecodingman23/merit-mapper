import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface ProfileData {
  fullName: string;
  gpa: string;
  graduationYear: string;
  intendedMajor: string;
  homeState: string;
  extracurriculars: string;
  skillsAndInterests: string;
  financialNeed: "low" | "medium" | "high" | "";
}

export const EMPTY_PROFILE: ProfileData = {
  fullName: "",
  gpa: "",
  graduationYear: "",
  intendedMajor: "",
  homeState: "",
  extracurriculars: "",
  skillsAndInterests: "",
  financialNeed: "",
};

interface UseProfileResult {
  profile: ProfileData;
  setProfile: (p: ProfileData) => void;
  saving: boolean;
  loadError: string | null;
  save: (p: ProfileData) => Promise<void>;
}

function toRow(userId: string, p: ProfileData) {
  return {
    id: userId,
    full_name: p.fullName || null,
    gpa: p.gpa ? parseFloat(p.gpa) : null,
    graduation_year: p.graduationYear ? parseInt(p.graduationYear, 10) : null,
    intended_major: p.intendedMajor || null,
    home_state: p.homeState || null,
    extracurriculars: p.extracurriculars || null,
    skills_and_interests: p.skillsAndInterests || null,
    financial_need: p.financialNeed || null,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: Record<string, unknown>): ProfileData {
  return {
    fullName: (row.full_name as string) ?? "",
    gpa: row.gpa != null ? String(row.gpa) : "",
    graduationYear: row.graduation_year != null ? String(row.graduation_year) : "",
    intendedMajor: (row.intended_major as string) ?? "",
    homeState: (row.home_state as string) ?? "",
    extracurriculars: (row.extracurriculars as string) ?? "",
    skillsAndInterests: (row.skills_and_interests as string) ?? "",
    financialNeed: ((row.financial_need as string) ?? "") as ProfileData["financialNeed"],
  };
}

export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(EMPTY_PROFILE);
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error && error.code !== "PGRST116") {
          setLoadError("Could not load saved profile.");
          return;
        }
        if (data) {
          setProfile(fromRow(data as Record<string, unknown>));
        }
      });
  }, [user]);

  const save = useCallback(
    async (p: ProfileData) => {
      if (!user) return;
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .upsert(toRow(user.id, p), { onConflict: "id" });
      setSaving(false);
      if (error) {
        console.error("[useProfile] save error:", error.message);
      }
    },
    [user],
  );

  return { profile, setProfile, saving, loadError, save };
}
