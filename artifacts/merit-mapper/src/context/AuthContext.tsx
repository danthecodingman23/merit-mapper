import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionExpired: boolean;   // true when the JWT could not be refreshed
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Seed state immediately from localStorage — no network call needed.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Keep session in sync with any future auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[auth] state change — event:", event, "user:", session?.user?.id ?? null);

      // "TOKEN_REFRESH_FAILED" may not be in the type union in some supabase-js versions.
      if ((event as string) === "TOKEN_REFRESH_FAILED") {
        // autoRefreshToken tried and failed — mark session as expired so the UI can prompt sign-in.
        console.warn("[auth] TOKEN_REFRESH_FAILED — session is expired and refresh server is unreachable.");
        setSessionExpired(true);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      // Clear the expired flag on a successful sign-in or token refresh.
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSessionExpired(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // scope: "local" clears localStorage only — no network call to the auth server.
    // This is safer when the server is unreachable.
    await supabase.auth.signOut({ scope: "local" });
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sessionExpired, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
