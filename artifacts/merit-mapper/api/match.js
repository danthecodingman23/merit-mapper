import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_SCHOLARSHIPS = 8;

/**
 * Trim a scholarship to only the fields Claude needs for scoring.
 * Keeps the prompt small and fast.
 */
function trimForClaude(s) {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    eligibility: s.eligibility ?? null,
    category_tags: s.category_tags ?? null,
    amount: s.amount ?? null,
    deadline: s.deadline ?? null,
    essay_required: s.essay_required ?? null,
    renewable: s.renewable ?? null,
  };
}

/**
 * Quick rule-based pre-filter to cut the list before hitting Claude.
 * Keeps the prompt small and the call under Vercel Hobby's 10-second limit.
 */
function preFilter(scholarships, profile) {
  const gpa = parseFloat(profile.gpa) || 0;
  const state = (profile.homeState || "").toLowerCase();

  return scholarships
    .filter((s) => {
      if (s.min_gpa != null && gpa < s.min_gpa) return false;
      if (s.state_specific && !s.state_specific.toLowerCase().includes(state)) return false;
      return true;
    })
    .slice(0, MAX_SCHOLARSHIPS)
    .map(trimForClaude);
}

const MATCH_TOOL = {
  name: "return_match_results",
  description:
    "Return the scored scholarship match results for the given student profile. Call this tool exactly once with all results.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        description: "One entry per scholarship, in any order.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "The scholarship id, copied verbatim from the input." },
            match_score: { type: "integer", minimum: 0, maximum: 100 },
            matched_criteria: { type: "array", items: { type: "string" }, maxItems: 4 },
            missing_criteria: { type: "array", items: { type: "string" }, maxItems: 4 },
            deadline_urgency: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["id", "match_score", "matched_criteria", "missing_criteria", "deadline_urgency"],
        },
      },
    },
    required: ["results"],
  },
};

const SYSTEM_PROMPT = `You are a scholarship matching engine. Score how well the student fits each scholarship.

Scoring:
- 90–100: Excellent match — clearly qualifies, highly competitive
- 70–89: Good match — meets most criteria, minor gaps
- 50–69: Moderate match — some criteria met, notable gaps
- 30–49: Weak match — few criteria met
- 0–29: Poor match — unlikely to qualify

Call return_match_results with one entry per scholarship. Be concise.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { profile, scholarships } = req.body;

  if (!profile || !scholarships || !Array.isArray(scholarships)) {
    return res.status(400).json({ error: "profile and scholarships array are required" });
  }

  if (scholarships.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const filtered = preFilter(scholarships, profile);

  if (filtered.length === 0) {
    return res.status(200).json({ results: [] });
  }

  const userMessage =
    `Student profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
    `Scholarships (${filtered.length}):\n${JSON.stringify(filtered, null, 2)}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [MATCH_TOOL],
      tool_choice: { type: "tool", name: "return_match_results" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolBlock = message.content.find((b) => b.type === "tool_use");

    if (!toolBlock) {
      return res.status(502).json({ error: "Matching engine did not return structured results" });
    }

    const { results } = toolBlock.input;
    results.sort((a, b) => b.match_score - a.match_score);

    return res.status(200).json({ results });
  } catch (err) {
    const message = err?.message ?? String(err);
    const status = err?.status ?? 500;
    console.error("Anthropic API error:", err);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: `Matching engine error: ${message}`,
    });
  }
}
