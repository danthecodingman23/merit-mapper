import { Link } from "wouter";

export default function Profile() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#eff6ff] flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#2563eb" strokeWidth="1.8" />
            <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Your profile</h1>
        <p className="text-[#64748b] text-sm mb-8">
          This is where you will build your scholarship profile. More features are coming soon.
        </p>
        <Link href="/">
          <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors flex items-center gap-1.5 mx-auto">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </button>
        </Link>
      </div>
    </div>
  );
}
