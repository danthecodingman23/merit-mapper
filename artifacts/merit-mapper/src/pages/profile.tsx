import { useState, FormEvent } from "react";
import { Link } from "wouter";

interface ProfileForm {
  fullName: string;
  gpa: string;
  graduationYear: string;
  intendedMajor: string;
  homeState: string;
  extracurriculars: string;
  skillsAndInterests: string;
  financialNeed: "low" | "medium" | "high" | "";
}

interface MatchResult {
  id: string;
  match_score: number;
  matched_criteria: string[];
  missing_criteria: string[];
  deadline_urgency: "low" | "medium" | "high";
}

interface RankedScholarship {
  id: string;
  name: string;
  description?: string;
  amount?: number;
  deadline?: string;
  result: MatchResult;
}

const INITIAL: ProfileForm = {
  fullName: "",
  gpa: "",
  graduationYear: "",
  intendedMajor: "",
  homeState: "",
  extracurriculars: "",
  skillsAndInterests: "",
  financialNeed: "",
};

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

// Placeholder scholarships until the Supabase table is populated
const PLACEHOLDER_SCHOLARSHIPS = [
  {
    id: "s1",
    name: "National Merit Scholarship",
    description: "Awarded to students with outstanding academic achievement.",
    amount: 2500,
    deadline: "2026-10-01",
    requirements: "High GPA, strong test scores, academic excellence",
    min_gpa: 3.8,
  },
  {
    id: "s2",
    name: "Community Leadership Award",
    description: "For students who demonstrate exceptional community involvement and leadership.",
    amount: 5000,
    deadline: "2026-09-15",
    requirements: "Community service, leadership roles, extracurricular involvement",
  },
  {
    id: "s3",
    name: "STEM Future Scholars Grant",
    description: "Supporting the next generation of scientists and engineers.",
    amount: 10000,
    deadline: "2026-11-30",
    requirements: "STEM major, strong GPA, interest in research",
    field_of_study: "STEM",
    min_gpa: 3.5,
  },
  {
    id: "s4",
    name: "First-Generation College Student Fund",
    description: "Helping first-generation college students achieve their dreams.",
    amount: 7500,
    deadline: "2026-08-01",
    requirements: "First-generation college student, financial need",
    eligibility: "First-generation college student",
  },
  {
    id: "s5",
    name: "Arts & Humanities Excellence Award",
    description: "Recognizing creative talent in arts, music, writing, and humanities.",
    amount: 3000,
    deadline: "2026-12-15",
    requirements: "Arts or humanities focus, creative portfolio",
    field_of_study: "Arts, Humanities",
  },
];

const URGENCY_COLORS = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-green-50 text-green-700 border-green-200",
};

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
};

export default function Profile() {
  const [form, setForm] = useState<ProfileForm>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranked, setRanked] = useState<RankedScholarship[] | null>(null);

  function set(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRanked(null);

    const profile = {
      fullName: form.fullName,
      gpa: parseFloat(form.gpa),
      graduationYear: parseInt(form.graduationYear, 10),
      intendedMajor: form.intendedMajor,
      homeState: form.homeState,
      extracurriculars: form.extracurriculars,
      skillsAndInterests: form.skillsAndInterests,
      financialNeed: form.financialNeed as "low" | "medium" | "high",
    };

    console.log("Submitting profile:", profile);

    try {
      // TODO: replace PLACEHOLDER_SCHOLARSHIPS with Supabase fetch once table is populated
      const scholarships = PLACEHOLDER_SCHOLARSHIPS;

      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, scholarships }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const { results }: { results: MatchResult[] } = await res.json();

      // Merge results back with scholarship metadata
      const resultMap = new Map(results.map((r) => [r.id, r]));
      const merged: RankedScholarship[] = scholarships
        .filter((s) => resultMap.has(s.id))
        .map((s) => ({ ...s, result: resultMap.get(s.id)! }))
        .sort((a, b) => b.result.match_score - a.result.match_score);

      setRanked(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to home
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-[#1a1a2e] mt-4 mb-1">Your profile</h1>
          <p className="text-sm text-[#64748b]">Tell us about yourself so we can match you with the right scholarships.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[#475569] uppercase tracking-wide">Basic info</h2>

            <Field label="Full name" required>
              <input
                type="text"
                placeholder="Jane Smith"
                value={form.fullName}
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
                  value={form.gpa}
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
                  value={form.graduationYear}
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
                  value={form.intendedMajor}
                  onChange={(e) => set("intendedMajor", e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>

              <Field label="Home state" required>
                <select
                  value={form.homeState}
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
                value={form.extracurriculars}
                onChange={(e) => set("extracurriculars", e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <Field label="Skills & interests" hint="Technical skills, hobbies, passions">
              <textarea
                placeholder="Python, data analysis, music composition, environmental sustainability..."
                value={form.skillsAndInterests}
                onChange={(e) => set("skillsAndInterests", e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <Field label="Financial need level" required>
              <select
                value={form.financialNeed}
                onChange={(e) => set("financialNeed", e.target.value as ProfileForm["financialNeed"])}
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-base transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
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

        {ranked && (
          <div className="mt-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a1a2e]">Your matches</h2>
              <span className="text-sm text-[#64748b]">{ranked.length} scholarships ranked</span>
            </div>

            {ranked.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-[#1a1a2e] leading-tight">{s.name}</h3>
                    {s.amount && (
                      <p className="text-sm text-[#2563eb] font-medium mt-0.5">
                        ${s.amount.toLocaleString()} award
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={`text-2xl font-bold ${SCORE_COLOR(s.result.match_score)}`}>
                      {s.result.match_score}
                    </div>
                    <div className="text-xs text-[#94a3b8]">/ 100</div>
                  </div>
                </div>

                {s.description && (
                  <p className="text-sm text-[#64748b] mb-3">{s.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {s.deadline && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${URGENCY_COLORS[s.result.deadline_urgency]}`}>
                      Due {new Date(s.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>

                {s.result.matched_criteria.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-[#475569] mb-1.5">Why you match</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.result.matched_criteria.map((c) => (
                        <span key={c} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {s.result.missing_criteria.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-[#475569] mb-1.5">Gaps to be aware of</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.result.missing_criteria.map((c) => (
                        <span key={c} className="text-xs bg-[#fef9ec] text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          △ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
