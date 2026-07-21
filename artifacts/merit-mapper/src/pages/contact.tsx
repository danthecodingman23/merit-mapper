import { useState, FormEvent } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import Footer from "@/components/Footer";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      submitted_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (insertError) {
      setError("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
    }
  };

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

      <main className="flex-1 flex items-start justify-center py-12 px-6">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2">Contact us</h1>
          <p className="text-[#64748b] mb-8">Have a question or feedback? We'd love to hear from you.</p>

          {submitted ? (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm px-8 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-[#dcfce7] flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M5 11.5L9 15.5L17 7.5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#1a1a2e] mb-1">Thanks! We'll get back to you soon.</p>
              <p className="text-sm text-[#64748b] mb-6">We typically respond within 1–2 business days.</p>
              <Link href="/">
                <button className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
                  ← Back to MeritMapper
                </button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm px-8 py-8 space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  Name <span className="text-[#2563eb]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  Email <span className="text-[#2563eb]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#374151]">
                  Message <span className="text-[#2563eb]">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#1a1a2e] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-150 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
