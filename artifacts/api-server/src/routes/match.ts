import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MAX_SCHOLARSHIPS = 8;

interface ClaudeScholarship {
  id: string;
  name: string;
  provider: string;
  eligibility?: string;
  category_tags?: string[];
  amount?: number;
  deadline?: string;
  essay_required?: boolean;
  renewable?: boolean;
}

function trimForClaude(s: Scholarship): ClaudeScholarship {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    eligibility: s.eligibility,
    category_tags: s.category_tags,
    amount: s.amount,
    deadline: s.deadline,
    essay_required: s.essay_required,
    renewable: s.renewable,
  };
}

function preFilter(scholarships: Scholarship[], profile: StudentProfile): ClaudeScholarship[] {
  const gpa = profile.gpa ?? 0;
  const state = (profile.homeState ?? "").toLowerCase();

  return scholarships
    .filter((s) => {
      if (s.min_gpa != null && gpa < s.min_gpa) return false;
      if (s.state_specific && !s.state_specific.toLowerCase().includes(state)) return false;
      return true;
    })
    .slice(0, MAX_SCHOLARSHIPS)
    .map(trimForClaude);
}

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
  provider: string;
  amount?: number;
  deadline?: string;
  eligibility?: string;
  application_url?: string;
  essay_required?: boolean;
  renewable?: boolean;
  category_tags?: string[];
  // legacy fields kept for pre-filter compatibility
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

// JSON Schema passed as the tool's input_schema — Claude must populate
// every field exactly as described; the SDK validates the structure.
const MATCH_TOOL: Anthropic.Tool = {
  name: "return_match_results",
  description:
    "Return the scored scholarship match results for the given student profile. " +
    "Call this tool exactly once with all results.",
  input_schema: {
    type: "object" as const,
    properties: {
      results: {
        type: "array",
        description: "One entry per scholarship, in any order.",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The scholarship id, copied verbatim from the input.",
            },
            match_score: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description:
                "Fit score 0–100. 90–100 excellent, 70–89 good, 50–69 moderate, 30–49 weak, 0–29 poor.",
            },
            matched_criteria: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Short phrases describing why the student is a good fit.",
            },
            missing_criteria: {
              type: "array",
              items: { type: "string" },
              maxItems: 4,
              description: "Short phrases describing gaps or risks.",
            },
            deadline_urgency: {
              type: "string",
              enum: ["low", "medium", "high"],
              description:
                "Urgency based on deadline proximity. Use 'medium' when deadline is unknown.",
            },
          },
          required: [
            "id",
            "match_score",
            "matched_criteria",
            "missing_criteria",
            "deadline_urgency",
          ],
        },
      },
    },
    required: ["results"],
  },
};

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

  const filtered = preFilter(scholarships, profile);
  if (filtered.length === 0) {
    res.json({ results: [] });
    return;
  }

  const systemPrompt = `You are a scholarship matching engine. Score how well the student fits each scholarship.

Scoring:
- 90–100: Excellent match — clearly qualifies, highly competitive
- 70–89: Good match — meets most criteria, minor gaps
- 50–69: Moderate match — some criteria met, notable gaps
- 30–49: Weak match — few criteria met
- 0–29: Poor match — unlikely to qualify

Call the return_match_results tool with one entry per scholarship. Be concise.`;

  const userMessage = `Student profile:\n${JSON.stringify(profile, null, 2)}\n\nScholarships (${filtered.length}):\n${JSON.stringify(filtered, null, 2)}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      tools: [MATCH_TOOL],
      // Force Claude to call exactly this tool — no free-text fallback possible.
      tool_choice: { type: "tool", name: "return_match_results" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolBlock = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (!toolBlock) {
      req.log.error({ content: message.content }, "No tool_use block in response");
      res.status(502).json({ error: "Matching engine did not return structured results" });
      return;
    }

    const { results } = toolBlock.input as { results: MatchResult[] };

    // Sort by match_score descending
    results.sort((a, b) => b.match_score - a.match_score);

    res.json({ results });
  } catch (err) {
    logger.error({ err }, "Anthropic API error");
    res.status(500).json({ error: "Failed to contact matching engine" });
  }
});

export default router;
