import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMatch, type RankedScholarship } from "@/context/MatchContext";
import { useAuth } from "@/context/AuthContext";
import { useSavedScholarships } from "@/hooks/useSavedScholarships";

function scoreBadge(score: number) {
  if (score >= 80)
    return { bg: "bg-green-100 text-green-800 border-green-200", label: "Strong match" };
  if (score >= 50)
    return { bg: "bg-amber-100 text-amber-800 border-amber-200", label: "Moderate match" };
  return { bg: "bg-slate-100 text-slate-600 border-slate-200", label: "Weak match" };
}

const URGENCY: Record<string, { chip: string; label: string }> = {
  high: { chip: "bg-red-50 text-red-700 border-red-200", label: "Deadline soon" },
  medium: { chip: "bg-amber-50 text-amber-700 border-amber-200", label: "Coming up" },
  low: { chip: "bg-green-50 text-green-700 border-green-200", label: "Plenty of time" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#94a3b8";
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function ScholarshipCard({
  s,
  isSaved,
  onSave,
  onUnsave,
}: {
  s: RankedScholarship;
  isSaved: boolean;
  onSave: () => Promise<{ error: string | null }>;
  onUnsave: () => Promise<{ error: string | null }>;
}) {
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const badge = scoreBadge(s.result.match_score);
  const urgency = URGENCY[s.result.deadline_urgency] ?? URGENCY.low;
  const matchedCriteria = s.result.matched_criteria ?? [];
  const missingCriteria = s.result.missing_criteria ?? [];

  const handleSaveToggle = async () => {
    setSaving(true);
    setFeedback(null);
    const { error } = isSaved ? await onUnsave() : await onSave();
    setSaving(false);
    if (error) {
      if (error === "session_expired" || error === "not_logged_in") {
        setFeedback({ type: "error", msg: "session_expired" });
      } else {
        setFeedback({ type: "error", msg: error });
      }
      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback({ type: "success", msg: isSaved ? "Removed from saved" : "Saved!" });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-start gap-4">
        <ScoreRing score={s.result.match_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h2 className="text-base font-bold text-[#1a1a2e] leading-snug">{s.name}</h2>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
          {s.provider && (
            <p className="text-sm text-[#64748b] mt-0.5">{s.provider}</p>
          )}
        </div>
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-3">
        {s.amount != null && (
          <div className="flex items-center gap-1.5 text-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#2563eb" strokeWidth="1.4"/>
              <path d="M7 4v6M5.5 8.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S8.33 7 7 7 5.5 6.33 5.5 5.5 6.17 4 7 4s1.5.67 1.5 1.5" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="font-semibold text-[#1a1a2e]">${s.amount.toLocaleString()}</span>
          </div>
        )}
        {s.deadline && (
          <div className="flex items-center gap-1.5 text-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="2" stroke="#64748b" strokeWidth="1.4"/>
              <path d="M1 6h12M4 1v2M10 1v2" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="text-[#475569]">
              {new Date(s.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {s.result.deadline_urgency !== "high" && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full border ${urgency.chip}`}>{urgency.label}</span>
            )}
          </div>
        )}
        {Array.isArray(s.category_tags) && s.category_tags.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-[#475569]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5v4L7 12 1 8.5v-4L7 1z" stroke="#64748b" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            {s.category_tags.join(", ")}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 space-y-3">
        {matchedCriteria.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Why you match</p>
            <div className="flex flex-wrap gap-1.5">
              {matchedCriteria.map((c) => (
                <span key={c} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {missingCriteria.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Gaps to be aware of</p>
            <div className="flex flex-wrap gap-1.5">
              {missingCriteria.map((c) => (
                <span key={c} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 3v2.5M5 7.5v.1" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M5 1L9 8H1L5 1z" stroke="#d97706" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-[#f1f5f9] flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {s.application_url ? (
            <a
              href={s.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-150 shadow-sm hover:shadow"
            >
              Apply now
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L10 2M10 2H5M10 2v5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ) : (
            <span className="text-xs text-[#94a3b8]">No application link available</span>
          )}

          <button
            onClick={handleSaveToggle}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border transition-all duration-150 disabled:opacity-50 ${
              isSaved
                ? "text-[#2563eb] border-[#bfdbfe] bg-[#eff6ff] hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                : "text-[#475569] border-[#e2e8f0] hover:border-[#2563eb] hover:text-[#2563eb] hover:bg-[#eff6ff]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z"
                stroke={isSaved ? "#2563eb" : "currentColor"}
                strokeWidth="1.4"
                strokeLinejoin="round"
                fill={isSaved ? "#2563eb" : "none"}
              />
            </svg>
            {saving ? "…" : isSaved ? "Saved" : "Save"}
          </button>

          {s.amount != null && (
            <span className="ml-auto text-xs text-[#94a3b8]">Up to ${s.amount.toLocaleString()}</span>
          )}
        </div>

        {feedback && (
          feedback.msg === "session_expired" ? (
            <div className="text-xs font-medium px-3 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0">
                <path d="M6.5 1L12 11H1L6.5 1z" stroke="#d97706" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6.5 5v2.5M6.5 9.5v.1" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Session expired — scroll up and sign out, then sign back in to save.
            </div>
          ) : (
            <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {feedback.type === "success" ? "✓ " : "✗ "}{feedback.msg}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function Results() {
  const { ranked } = useMatch();
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const { isSaved, save, unsave } = useSavedScholarships();
  const [showExpiredBanner, setShowExpiredBanner] = useState(false);

  const handleSave = async (s: RankedScholarship): Promise<{ error: string | null }> => {
    if (!user) {
      navigate("/login");
      return { error: "Please sign in to save scholarships." };
    }
    const result = await save({ id: s.id, name: s.name, amount: s.amount, application_url: s.application_url });
    if (result.error === "session_expired") setShowExpiredBanner(true);
    return result;
  };

  const handleUnsave = async (s: RankedScholarship): Promise<{ error: string | null }> => {
    const result = await unsave(s.id);
    if (result.error === "session_expired") setShowExpiredBanner(true);
    return result;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Session-expired banner */}
        {showExpiredBanner && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 mt-0.5">
              <path d="M9 2L16 15H2L9 2z" stroke="#d97706" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M9 7v3.5M9 13v.1" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Your session has expired</p>
              <p className="text-xs text-amber-700 mt-0.5">Sign out and sign back in to save scholarships. Your results will still be here.</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex-shrink-0 text-xs font-semibold bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link href="/profile">
              <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Edit profile
              </button>
            </Link>
            <div className="flex items-center gap-4">
              {user && (
                <Link href="/saved">
                  <button className="text-sm font-medium text-[#475569] hover:text-[#1a1a2e] transition-colors flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    </svg>
                    Saved
                  </button>
                </Link>
              )}
              {user && (
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-[#94a3b8] hover:text-[#475569] transition-colors"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] mt-4 mb-1">Your scholarship matches</h1>
          <p className="text-sm text-[#64748b]">
            {ranked.length === 0
              ? "No results yet — go back and submit your profile."
              : `${ranked.length} scholarship${ranked.length !== 1 ? "s" : ""} ranked by fit`}
          </p>
          {ranked.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {ranked.filter((s) => s.result.match_score >= 80).length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-[#475569]">{ranked.filter((s) => s.result.match_score >= 80).length} strong</span>
                </div>
              )}
              {ranked.filter((s) => s.result.match_score >= 50 && s.result.match_score < 80).length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span className="text-[#475569]">{ranked.filter((s) => s.result.match_score >= 50 && s.result.match_score < 80).length} moderate</span>
                </div>
              )}
              {ranked.filter((s) => s.result.match_score < 50).length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                  <span className="text-[#475569]">{ranked.filter((s) => s.result.match_score < 50).length} weak</span>
                </div>
              )}
            </div>
          )}
        </div>

        {ranked.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-10 text-center">
            <p className="text-[#64748b] mb-4">Submit your profile to see your matches here.</p>
            <Link href="/profile">
              <button className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
                Build my profile
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ranked.map((s) => (
              <ScholarshipCard
                key={s.id}
                s={s}
                isSaved={isSaved(s.id)}
                onSave={() => handleSave(s)}
                onUnsave={() => handleUnsave(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
