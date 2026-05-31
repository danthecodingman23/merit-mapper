import { createContext, useContext, useState, type ReactNode } from "react";

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  description?: string;
  amount?: number;
  deadline?: string;
  requirements?: string;
  eligibility?: string;
  field_of_study?: string;
  state_specific?: string;
  min_gpa?: number;
  application_url?: string;
}

export interface MatchResult {
  id: string;
  match_score: number;
  matched_criteria: string[];
  missing_criteria: string[];
  deadline_urgency: "low" | "medium" | "high";
}

export interface RankedScholarship extends Scholarship {
  result: MatchResult;
}

interface MatchContextValue {
  ranked: RankedScholarship[];
  setRanked: (r: RankedScholarship[]) => void;
}

const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [ranked, setRanked] = useState<RankedScholarship[]>([]);
  return (
    <MatchContext.Provider value={{ ranked, setRanked }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used inside <MatchProvider>");
  return ctx;
}
