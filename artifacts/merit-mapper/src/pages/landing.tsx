import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e8f0fe] to-white">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#2563eb] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" fillOpacity="0.9" />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-[#1a1a2e] tracking-tight text-[15px]">MeritMapper</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/saved">
                <button className="text-sm font-medium text-[#475569] hover:text-[#1a1a2e] transition-colors flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  Saved
                </button>
              </Link>
              <Link href="/profile">
                <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                  My profile
                </button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                Sign in
              </button>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] inline-block"></span>
            Scholarship discovery made simple
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-[#1a1a2e] leading-[1.08] tracking-tight mb-5">
            Find scholarships
            <br />
            <span className="text-[#2563eb]">built for you.</span>
          </h1>

          <p className="text-lg text-[#64748b] mb-10 leading-relaxed max-w-md mx-auto">
            MeritMapper matches students with college scholarships tailored to their background, interests, and goals using cutting-edge AI technology.
          </p>

          <Link href="/profile">
            <button className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all duration-150 shadow-sm hover:shadow-md">
              Build my profile
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </Link>

          {user && (
            <div className="mt-5">
              <Link href="/saved">
                <button className="inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#1a1a2e] border border-[#e2e8f0] hover:border-[#cbd5e1] bg-white px-5 py-2.5 rounded-xl transition-all duration-150 shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  View saved scholarships
                </button>
              </Link>
            </div>
          )}

        </div>
      </main>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] text-center mb-2">How It Works</h2>
          <p className="text-sm text-[#64748b] text-center mb-10">Three steps to your best scholarship matches.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Build Your Profile",
                desc: "Tell us about your background, interests, and goals so we can find the best fits for you.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="7" r="4" stroke="#2563eb" strokeWidth="1.6"/>
                    <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                ),
              },
              {
                step: "2",
                title: "Get Matched",
                desc: "Our AI finds scholarships tailored specifically to you from our database of thousands.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 3l2.5 5 5.5.8-4 3.9.95 5.5L11 15.5l-4.95 2.7.95-5.5L3 8.8l5.5-.8L11 3z" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round"/>
                  </svg>
                ),
              },
              {
                step: "3",
                title: "Apply With Confidence",
                desc: "See your best matches ranked with deadlines and apply directly with one click.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="3" width="16" height="16" rx="3" stroke="#2563eb" strokeWidth="1.6"/>
                    <path d="M7 11l3 3 5-5" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="bg-white rounded-2xl border border-[#e2e8f0] px-6 py-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <span className="text-xs font-bold text-[#2563eb] uppercase tracking-widest">Step {step}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1a1a2e] mb-1">{title}</h3>
                  <p className="text-sm text-[#64748b] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
