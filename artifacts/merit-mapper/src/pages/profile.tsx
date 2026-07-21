import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { useMatch, type MatchResult, type RankedScholarship } from "@/context/MatchContext";
import { useScholarships } from "@/hooks/useScholarships";
import { useProfile, type ProfileData } from "@/hooks/useProfile";
import { useAuth } from "@/context/AuthContext";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

export default function Profile() {
  const { user } = useAuth();
  const { profile, setProfile, saving, loadError, save } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRanked } = useMatch();
  const [, navigate] = useLocation();
  const { scholarships, loading: scholarshipsLoading, error: scholarshipsError } = useScholarships();

  function set(field: keyof ProfileData, value: string) {
    setProfile({ ...profile, [field]: value });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const profilePayload = {
      fullName: profile.fullName,
      gpa: parseFloat(profile.gpa),
      graduationYear: parseInt(profile.graduationYear, 10),
      intendedMajor: profile.intendedMajor,
      homeState: profile.homeState,
      extracurriculars: profile.extracurriculars,
      skillsAndInterests: profile.skillsAndInterests,
      financialNeed: profile.financialNeed as "low" | "medium" | "high",
    };

    console.log(`[profile] Submit — ${scholarships.length} scholarships loaded, sending to API…`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: profilePayload, scholarships }),
        signal: controller.signal,
      });

      console.log("[profile] API response status:", res.status);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const { results }: { results: MatchResult[] } = await res.json();
      console.log(`[profile] API returned ${results.length} results. Sample IDs:`, results.slice(0, 3).map((r) => r.id));

      const resultMap = new Map(results.map((r) => [String(r.id), r]));
      console.log("[profile] Scholarship IDs from Supabase:", scholarships.slice(0, 3).map((s) => `${s.id} (${typeof s.id})`));

      const merged: RankedScholarship[] = scholarships
        .filter((s) => resultMap.has(String(s.id)))
        .map((s) => ({ ...s, result: resultMap.get(String(s.id))! }))
        .sort((a, b) => b.result.match_score - a.result.match_score);

      console.log(`[profile] Merged ${merged.length} ranked scholarships. Navigating to /results…`);

      await save(profile);
      setRanked(merged);
      navigate("/results");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The matching engine took too long to respond. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
      console.error("[profile] Error during matching:", err);
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <NavBar />
      {/* Full-page loading overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f8f7f4]/90 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-lg px-10 py-10 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#e2e8f0] border-t-[#2563eb] animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-[#1a1a2e] text-lg">Finding your matches</p>
              <p className="text-sm text-[#64748b] mt-1">Analyzing scholarships with AI — this can take up to 25 seconds</p>
            </div>
            <div className="w-full bg-[#f1f5f9] rounded-full h-1.5 overflow-hidden">
              <div className="h-full w-1/3 bg-[#2563eb] rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto py-10 px-4">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">
            {profile.fullName.trim()
              ? `Welcome back, ${profile.fullName.trim().split(" ")[0]}!`
              : "Your profile"}
          </h1>
          <p className="text-sm text-[#64748b]">Tell us about yourself so we can match you with the right scholarships.</p>
          {saving && (
            <p className="text-xs text-[#94a3b8] mt-1">Saving…</p>
          )}
          {loadError && (
            <p className="text-xs text-amber-600 mt-1">{loadError}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[#475569] uppercase tracking-wide">Basic info</h2>

            <Field label="Full name" required>
              <input
                type="text"
                placeholder="Jane Smith"
                value={profile.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                required
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="GPA" required hint="0.0 – 4.0">
                <input
                  type="number"
                  placeholder="3.8"
                  min="0"
                  max="4.0"
                  step="0.01"
                  value={profile.gpa}
                  onChange={(e) => set("gpa", e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Graduation year" required>
                <input
                  type="number"
                  placeholder="2026"
                  min="2024"
                  max="2035"
                  value={profile.graduationYear}
                  onChange={(e) => set("graduationYear", e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Intended major" required>
                <input
                  type="text"
                  placeholder="Computer Science"
                  value={profile.intendedMajor}
                  onChange={(e) => set("intendedMajor", e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Home state" required>
                <select
                  value={profile.homeState}
                  onChange={(e) => set("homeState", e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[#475569] uppercase tracking-wide">Background</h2>

            <Field label="Extracurriculars" hint="Clubs, sports, volunteering, etc.">
              <textarea
                placeholder="Student government president, varsity soccer, local food bank volunteer..."
                value={profile.extracurriculars}
                onChange={(e) => set("extracurriculars", e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <Field label="Skills & interests" hint="Technical skills, hobbies, passions">
              <textarea
                placeholder="Python, data analysis, music composition, environmental sustainability..."
                value={profile.skillsAndInterests}
                onChange={(e) => set("skillsAndInterests", e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <Field label="Financial need level" required>
              <select
                value={profile.financialNeed}
                onChange={(e) => set("financialNeed", e.target.value as ProfileData["financialNeed"])}
                required
                className={inputClass}
              >
                <option value="">Select level</option>
                <option value="low">Low — family can cover most costs</option>
                <option value="medium">Medium — need partial assistance</option>
                <option value="high">High — need significant assistance</option>
              </select>
            </Field>
          </div>

          {scholarshipsError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
              Could not load scholarships from database: {scholarshipsError}. Please refresh and try again.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="mt-2 text-sm font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || scholarshipsLoading || scholarships.length === 0}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-base transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            {scholarshipsLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading scholarships…
              </>
            ) : submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Finding your matches…
              </>
            ) : (
              "Find my scholarships"
            )}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#374151]">
        {label}
        {required && <span className="text-[#2563eb] ml-0.5">*</span>}
        {hint && <span className="text-[#94a3b8] font-normal ml-1.5 text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
