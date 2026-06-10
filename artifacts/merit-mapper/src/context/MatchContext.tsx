import { createContext, useContext, useState, type ReactNode } from "react";

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  amount?: number;
  deadline?: string;
  eligibility?: string;
  application_url?: string;
  essay_required?: boolean;
  renewable?: boolean;
  category_tags?: string[];
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
