import { Link } from "wouter";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f4]">
      <header className="px-6 py-5 border-b border-[#e2e8f0] bg-white">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
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
        </div>
      </header>

      <main className="flex-1 py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">Privacy Policy</h1>
          <p className="text-sm text-[#94a3b8] mb-10">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <div className="space-y-10 text-[#374151] leading-relaxed">

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">1. Introduction</h2>
              <p>
                MeritMapper ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard the personal information you provide when using our scholarship matching service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">2. Information We Collect</h2>
              <p className="mb-3">We collect the following information when you create a profile and use MeritMapper:</p>
              <ul className="list-disc list-inside space-y-2 text-[#475569]">
                <li><span className="font-medium text-[#374151]">Name</span> — your first and last name, used to personalize your experience.</li>
                <li><span className="font-medium text-[#374151]">Email address</span> — used to create and manage your account.</li>
                <li><span className="font-medium text-[#374151]">Academic profile information</span> — including your GPA, intended major, year in school, state of residence, extracurricular activities, career goals, and any other details you choose to provide in your profile form.</li>
              </ul>
              <p className="mt-3">We do not collect payment information, Social Security numbers, or any other sensitive financial data.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">3. How We Use Your Information</h2>
              <p className="mb-3">Your information is used solely for the purpose of providing MeritMapper's scholarship matching service. Specifically, we use it to:</p>
              <ul className="list-disc list-inside space-y-2 text-[#475569]">
                <li>Match your profile against our scholarship database to surface relevant opportunities.</li>
                <li>Personalize your experience within the app (e.g., your name in the navigation bar).</li>
                <li>Save your scholarship matches and bookmarks across sessions.</li>
                <li>Improve the accuracy of our matching algorithm based on user feedback.</li>
              </ul>
              <p className="mt-3 font-medium text-[#1a1a2e]">We do not use your information for advertising, marketing campaigns, or any purpose outside of scholarship matching.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">4. How We Store Your Data</h2>
              <p>
                Your data is stored securely using <span className="font-medium">Supabase</span>, a cloud database platform that uses industry-standard encryption at rest and in transit (TLS). Access to your data is protected by Row Level Security (RLS) policies, which ensure that only you can read and modify your own profile information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">5. Data Sharing</h2>
              <p>
                We do not sell, rent, or share your personal information with third parties for commercial purposes. Your data is never sold to advertisers, data brokers, or any other third party.
              </p>
              <p className="mt-3">
                The only external service that processes your data is our AI matching engine (Anthropic's Claude), which receives your academic profile to generate scholarship matches. Anthropic's data handling is governed by their own{" "}
                <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors underline underline-offset-2">Privacy Policy</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">6. Data Retention</h2>
              <p>
                We retain your account information for as long as your account remains active. You may request deletion of your account and all associated data at any time (see section 7 below).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">7. Your Rights — Data Deletion</h2>
              <p className="mb-3">You have the right to request the deletion of your personal data at any time. To do so, please contact us and we will permanently delete your account, profile information, and any associated records within 30 days.</p>
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-5 py-4">
                <p className="text-sm font-medium text-[#1e40af] mb-1">Request data deletion</p>
                <p className="text-sm text-[#3b82f6]">
                  Email us at{" "}
                  <a href="mailto:privacy@meritmapper.com" className="font-medium underline underline-offset-2 hover:text-[#2563eb] transition-colors">
                    privacy@meritmapper.com
                  </a>
                  {" "}with the subject line "Data Deletion Request" and the email address associated with your account.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-3">8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. We encourage you to review this page periodically.
              </p>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-[#e2e8f0]">
            <Link href="/">
              <button className="inline-flex items-center gap-2 text-sm font-medium text-[#475569] hover:text-[#1a1a2e] transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to MeritMapper
              </button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
