import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const apiKey = process.env["ANTHROPIC_API_KEY"];
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const anthropic = new Anthropic({ apiKey });

export interface StudentProfile {
  fullName: string;
  gpa: number;
  graduationYear: number;
  intendedMajor: string;
  homeState: string;
  extracurriculars: string;
  skillsAndInterests: string;
  financialNeed: "low" | "medium" | "high";
}

export interface Scholarship {
  id: string;
  name: string;
  description?: string;
  amount?: number;
  deadline?: string;
  requirements?: string;
  eligibility?: string;
  field_of_study?: string;
  state_specific?: string;
  min_gpa?: number;
}

export interface MatchResult {
  id: string;
  match_score: number;
  matched_criteria: string[];
  missing_criteria: string[];
  deadline_urgency: "low" | "medium" | "high";
}

router.post("/match", async (req, res) => {
  const { profile, scholarships } = req.body as {
    profile: StudentProfile;
    scholarships: Scholarship[];
  };

  if (!profile || !scholarships || !Array.isArray(scholarships)) {
    res.status(400).json({ error: "profile and scholarships array are required" });
    return;
  }

  if (scholarships.length === 0) {
    res.json({ results: [] });
    return;
  }

  const systemPrompt = `You are a scholarship matching engine. Your sole job is to score how well a student profile fits each scholarship.

For every scholarship provided, evaluate:
1. Eligibility alignment (GPA requirements, state restrictions, field of study, financial need)
2. Background alignment (extracurriculars, skills, interests vs. scholarship focus)
3. Competitive likelihood (how strong the student looks relative to typical applicants)

Scoring rules:
- 90–100: Excellent match, student clearly meets all criteria and is highly competitive
- 70–89: Good match, student meets most criteria with minor gaps
- 50–69: Moderate match, some criteria met but notable gaps exist
- 30–49: Weak match, student meets few criteria
- 0–29: Poor match, student is unlikely to qualify

Return ONLY a valid JSON array. No prose. No markdown. No code fences.
Each element must have exactly these keys:
- id (string): the scholarship id
- match_score (integer 0–100)
- matched_criteria (array of short strings, max 4)
- missing_criteria (array of short strings, max 4)
- deadline_urgency ("low" | "medium" | "high") based on deadline proximity; if no deadline provided use "medium"`;

  const userMessage = `Student profile:
${JSON.stringify(profile, null, 2)}

Scholarships to evaluate:
${JSON.stringify(scholarships, null, 2)}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let results: MatchResult[];

    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const parsed = JSON.parse(cleaned);
      results = Array.isArray(parsed) ? parsed : parsed.results ?? [];
    } catch (parseErr) {
      req.log.error({ parseErr, raw }, "Failed to parse Claude JSON response");
      res.status(502).json({ error: "Matching engine returned malformed JSON", raw });
      return;
    }

    // Defensive normalisation
    const normalised: MatchResult[] = results.map((r) => ({
      id: String(r.id ?? ""),
      match_score: Math.min(100, Math.max(0, Number(r.match_score ?? 0))),
      matched_criteria: Array.isArray(r.matched_criteria) ? r.matched_criteria.map(String) : [],
      missing_criteria: Array.isArray(r.missing_criteria) ? r.missing_criteria.map(String) : [],
      deadline_urgency: (["low", "medium", "high"] as const).includes(r.deadline_urgency)
        ? r.deadline_urgency
        : "medium",
    }));

    // Sort by match_score descending
    normalised.sort((a, b) => b.match_score - a.match_score);

    res.json({ results: normalised });
  } catch (err) {
    logger.error({ err }, "Anthropic API error");
    res.status(500).json({ error: "Failed to contact matching engine" });
  }
});

export default router;
