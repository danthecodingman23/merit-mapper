import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isMissingConfig = error.message.includes("VITE_SUPABASE");

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f7f4] px-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6v4M10 14h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-[#1a1a2e] mb-2">
            {isMissingConfig ? "Configuration missing" : "Something went wrong"}
          </h1>
          <p className="text-sm text-[#64748b] leading-relaxed">
            {isMissingConfig
              ? "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set as environment variables in your Vercel project settings."
              : error.message}
          </p>
        </div>
      </div>
    );
  }
}
