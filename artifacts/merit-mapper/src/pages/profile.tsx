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

export default function Profile() {
  const [form, setForm] = useState<ProfileForm>(INITIAL);
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const profile = {
      ...form,
      gpa: parseFloat(form.gpa),
      graduationYear: parseInt(form.graduationYear, 10),
    };
    console.log("Profile:", profile);
    setSubmitted(true);
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

        {submitted ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#dcfce7] flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11.5L9 15.5L17 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">Profile saved!</h2>
            <p className="text-sm text-[#64748b] mb-6">Your profile data has been logged to the console. Matching engine coming next.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
            >
              Edit profile
            </button>
          </div>
        ) : (
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

            <button
              type="submit"
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-semibold py-3.5 rounded-xl text-base transition-all duration-150 shadow-sm hover:shadow-md"
            >
              Save profile &amp; find scholarships
            </button>
          </form>
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
