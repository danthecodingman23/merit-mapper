import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export default function NavBar() {
  const { user, signOut } = useAuth();
  const [location, navigate] = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <nav className="w-full bg-white border-b border-[#e2e8f0] px-4 py-0">
      <div className="max-w-2xl mx-auto h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/">
          <span className="text-[#1a1a2e] font-bold text-base tracking-tight cursor-pointer select-none">
            Merit<span className="text-[#2563eb]">Mapper</span>
          </span>
        </Link>

        {/* Nav links + sign-out */}
        <div className="flex items-center gap-5">
          <Link href="/profile">
            <button
              className={`text-sm font-medium transition-colors ${
                location === "/profile"
                  ? "text-[#2563eb]"
                  : "text-[#475569] hover:text-[#1a1a2e]"
              }`}
            >
              Profile
            </button>
          </Link>
          <Link href="/saved">
            <button
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                location === "/saved"
                  ? "text-[#2563eb]"
                  : "text-[#475569] hover:text-[#1a1a2e]"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  fill={location === "/saved" ? "currentColor" : "none"}
                />
              </svg>
              Saved
            </button>
          </Link>

          <div className="w-px h-4 bg-[#e2e8f0]" />

          {user && (
            <span className="text-xs text-[#94a3b8] hidden sm:block max-w-[140px] truncate">
              {user.email}
            </span>
          )}

          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-[#94a3b8] hover:text-[#ef4444] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
