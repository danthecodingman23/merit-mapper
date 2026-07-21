import { Link } from "wouter";
import { useSavedScholarships } from "@/hooks/useSavedScholarships";
import { useReportLink } from "@/hooks/useReportLink";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z"
        stroke={filled ? "#2563eb" : "currentColor"}
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill={filled ? "#2563eb" : "none"}
      />
    </svg>
  );
}

function SavedCard({ s, onUnsave }: { s: ReturnType<typeof useSavedScholarships>["saved"][number]; onUnsave: () => void }) {
  const { report, reporting, reported, error: reportError } = useReportLink();
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="p-5">
        <h3 className="font-semibold text-[#1a1a2e] leading-tight">{s.scholarship_name}</h3>
        {s.amount != null && (
          <div className="flex items-center gap-1.5 mt-2 text-sm">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#2563eb" strokeWidth="1.4"/>
              <path d="M7 4v6M5.5 8.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S8.33 7 7 7 5.5 6.33 5.5 5.5 6.17 4 7 4s1.5.67 1.5 1.5" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="font-semibold text-[#1a1a2e]">${s.amount.toLocaleString()}</span>
          </div>
        )}
        <p className="text-xs text-[#94a3b8] mt-1.5">
          Saved {new Date(s.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="px-5 py-3.5 border-t border-[#f1f5f9] flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
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
            <span className="text-xs text-[#94a3b8]">No application link</span>
          )}

          <button
            onClick={onUnsave}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748b] hover:text-red-600 border border-[#e2e8f0] hover:border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-150"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Unsave
          </button>

          {s.application_url && (
            <button
              onClick={() => report({ scholarshipId: s.scholarship_id, scholarshipName: s.scholarship_name, applicationUrl: s.application_url })}
              disabled={reporting || reported}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#94a3b8] hover:text-red-500 disabled:opacity-50 disabled:cursor-default transition-colors ml-auto"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v5M6 9v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              {reported ? "Reported" : reporting ? "Reporting…" : "Report bad link"}
            </button>
          )}
        </div>

        {reported && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            ✓ Thanks for reporting this! We'll review it soon.
          </p>
        )}
        {reportError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            ✗ {reportError}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Saved() {
  const { saved, loading, unsave } = useSavedScholarships();

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <NavBar />
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-1">Saved Scholarships</h1>
          <p className="text-sm text-[#64748b]">
            {loading
              ? "Loading…"
              : saved.length === 0
              ? "No saved scholarships yet"
              : `${saved.length} scholarship${saved.length !== 1 ? "s" : ""} saved`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
          </div>
        ) : saved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[#eff6ff] flex items-center justify-center mx-auto mb-4">
              <BookmarkIcon />
            </div>
            <p className="text-[#64748b] mb-4">
              You haven't saved any scholarships yet. Run a match and save the ones you want to track.
            </p>
            <Link href="/profile">
              <button className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all">
                Find scholarships
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {saved.map((s) => (
              <SavedCard key={s.id} s={s} onUnsave={() => unsave(s.scholarship_id)} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
