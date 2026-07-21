import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log("[login] Attempting signInWithPassword for:", email);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      console.log("[login] result — user:", data?.user?.id ?? null, "error:", signInError?.message ?? null);

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
          setError("Incorrect email or password. Please try again.");
        } else if (msg.includes("email not confirmed")) {
          setError("Please confirm your email address before signing in.");
        } else if (msg.includes("failed to fetch") || msg.includes("network")) {
          setError("Network error — check your connection and try again.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Sign in failed — no user returned. Please try again.");
        setLoading(false);
        return;
      }

      console.log("[login] Success — navigating to /profile");
      navigate("/profile");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[login] Unexpected error:", err);
      if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
        setError("Network error — check your connection and try again.");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f4]">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-md bg-[#2563eb] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" fillOpacity="0.9" />
                <circle cx="8" cy="8" r="2" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-[#1a1a2e] tracking-tight text-[15px]">MeritMapper</span>
          </div>
        </Link>
        <Link href="/signup">
          <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
            Create account
          </button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8">
            <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight mb-1">Welcome back</h1>
            <p className="text-sm text-[#64748b] mb-7">Sign in to your MeritMapper account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8f7f4] text-[#1a1a2e] placeholder:text-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8f7f4] text-[#1a1a2e] placeholder:text-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition-all"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-150 shadow-sm hover:shadow-md mt-2"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#64748b] mt-5">
            Don't have an account?{" "}
            <Link href="/signup">
              <span className="text-[#2563eb] font-medium hover:text-[#1d4ed8] cursor-pointer transition-colors">
                Sign up free
              </span>
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
