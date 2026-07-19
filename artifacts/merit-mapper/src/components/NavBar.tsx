import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function NavBar() {
  const { user, signOut } = useAuth();
  const [location, navigate] = useLocation();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setFirstName(null); return; }

    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = (data as { full_name?: string | null } | null)?.full_name?.trim();
        setFirstName(name ? name.split(" ")[0] : null);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const greeting = firstName
    ? `Welcome, ${firstName}`
    : user?.email ?? null;

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

          {greeting && (
            <span className="text-xs text-[#64748b] hidden sm:block max-w-[180px] truncate">
              {greeting}
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
