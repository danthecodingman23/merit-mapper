import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        created_at: new Date().toISOString(),
      });
    }

    navigate("/profile");
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
        <Link href="/login">
          <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
            Sign in
          </button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8">
            <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight mb-1">Create your account</h1>
            <p className="text-sm text-[#64748b] mb-7">Start finding scholarships built for you</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">
                  Email
                </label>
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
                <label className="block text-sm font-medium text-[#374151] mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8f7f4] text-[#1a1a2e] placeholder:text-[#94a3b8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#64748b] mt-5">
            Already have an account?{" "}
            <Link href="/login">
              <span className="text-[#2563eb] font-medium hover:text-[#1d4ed8] cursor-pointer transition-colors">
                Sign in
              </span>
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
