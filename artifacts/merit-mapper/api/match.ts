import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MATCH_TOOL: Anthropic.Tool = {
  name: "return_match_results",
  description:
    "Return the scored scholarship match results for the given student profile. Call this tool exactly once with all results.",
  input_schema: {
    type: "object" as const,
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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: { profile: unknown; scholarships: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { profile, scholarships } = body;

  if (!profile || !scholarships || !Array.isArray(scholarships)) {
    return Response.json({ error: "profile and scholarships array are required" }, { status: 400 });
  }

  if ((scholarships as unknown[]).length === 0) {
    return Response.json({ results: [] });
  }

  const systemPrompt = `You are a scholarship matching engine. Evaluate how well the student fits each scholarship.

For each scholarship consider:
1. Eligibility alignment — GPA requirements, state restrictions, field of study, financial need
2. Background alignment — extracurriculars, skills, and interests vs. scholarship focus
3. Competitive likelihood — how strong the student looks relative to typical applicants

Scoring:
- 90–100: Excellent match, student clearly qualifies and is highly competitive
- 70–89: Good match, meets most criteria with minor gaps
- 50–69: Moderate match, some criteria met but notable gaps
- 30–49: Weak match, few criteria met
- 0–29: Poor match, unlikely to qualify

Call the return_match_results tool with one entry per scholarship.`;

  const userMessage = `Student profile:\n${JSON.stringify(profile, null, 2)}\n\nScholarships:\n${JSON.stringify(scholarships, null, 2)}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools: [MATCH_TOOL],
      tool_choice: { type: "tool", name: "return_match_results" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolBlock = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (!toolBlock) {
      return Response.json({ error: "Matching engine did not return structured results" }, { status: 502 });
    }

    const { results } = toolBlock.input as { results: unknown[] };
    (results as { match_score: number }[]).sort((a, b) => b.match_score - a.match_score);

    return Response.json({ results });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return Response.json({ error: "Failed to contact matching engine" }, { status: 500 });
  }
}

export const config = { runtime: "edge" };
