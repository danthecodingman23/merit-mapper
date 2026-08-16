/**
 * scripts/fetch-scholarships.mjs
 *
 * Scrapes public scholarship listing pages, uses Claude to extract structured
 * data, deduplicates against the existing Supabase table, and inserts new rows.
 *
 * Usage:
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ANTHROPIC_API_KEY=... \
 *     node scripts/fetch-scholarships.mjs
 *
 * Required env vars:
 *   VITE_SUPABASE_URL          — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS)
 *   ANTHROPIC_API_KEY          — Claude API key
 */

// ── Env validation ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error("❌  Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

// ── Scholarship sources ───────────────────────────────────────────────────────
// Each entry is a publicly-accessible page that lists or describes scholarships.
// Pages that are fully JS-rendered will be detected and skipped automatically.

const SOURCES = [
  {
    name: "Fastweb — Top Scholarships for High School Seniors",
    url: "https://www.fastweb.com/college-scholarships/articles/top-scholarships-for-high-school-seniors",
    hint: "Top national scholarships for high school seniors entering college",
  },
  {
    name: "Going Merry — Scholarships for High School Seniors",
    url: "https://www.goingmerry.com/blog/scholarships-for-high-school-seniors/",
    hint: "Curated list of scholarships for high school seniors",
  },
  {
    name: "Going Merry — STEM Scholarships",
    url: "https://www.goingmerry.com/blog/stem-scholarships/",
    hint: "STEM scholarships for college students in science, technology, engineering, math",
  },
  {
    name: "Going Merry — Minority Scholarships",
    url: "https://www.goingmerry.com/blog/minority-scholarships/",
    hint: "Scholarships for minority students including African American, Hispanic, Asian, Native American",
  },
  {
    name: "Going Merry — First-Generation College Student Scholarships",
    url: "https://www.goingmerry.com/blog/first-generation-college-student-scholarships/",
    hint: "Scholarships for first-generation college students",
  },
  {
    name: "Scholarships360 — No-Essay Scholarships",
    url: "https://scholarships360.org/scholarships/no-essay-scholarships/",
    hint: "Scholarships that do not require an essay, easy to apply",
  },
  {
    name: "Scholarships360 — Scholarships for High GPA",
    url: "https://scholarships360.org/scholarships/scholarships-for-high-gpa/",
    hint: "Merit-based scholarships rewarding high GPA academic achievement",
  },
  {
    name: "Scholarships360 — Community Service Scholarships",
    url: "https://scholarships360.org/scholarships/community-service-scholarships/",
    hint: "Scholarships for students with strong community service and volunteering records",
  },
  {
    name: "Nitro College — Scholarships",
    url: "https://www.nitrocollege.com/scholarships",
    hint: "General college scholarships for undergraduate students",
  },
  {
    name: "Elks Foundation — Scholarship Programs",
    url: "https://www.elks.org/scholars/scholarships/",
    hint: "Elks Lodge scholarship programs: Most Valuable Student and Emergency Educational Grants",
  },
  {
    name: "Scholarsapply.org — Scholarships",
    url: "https://scholarsapply.org/scholarship/",
    hint: "National scholarships across many categories",
  },
  {
    name: "College Board — Scholarship Opportunities",
    url: "https://bigfuture.collegeboard.org/pay-for-college/scholarships-and-grants",
    hint: "Scholarship opportunities listed by College Board for college-bound students",
  },
  {
    name: "Niche — Scholarships",
    url: "https://www.niche.com/colleges/scholarships/",
    hint: "Wide variety of college scholarships from Niche.com",
  },
  {
    name: "Bold.org — Scholarships",
    url: "https://bold.org/scholarships/",
    hint: "Diverse scholarships for college students including BIPOC, LGBTQ, women in STEM",
  },
  {
    name: "UNCF — Scholarships",
    url: "https://uncf.org/scholarships",
    hint: "UNCF scholarships for African American students, HBCU, financial need",
  },
];

// ── HTML → text ───────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 14000); // keep within Claude's useful context range
}

// ── Claude extraction ─────────────────────────────────────────────────────────

async function extractScholarships(pageText, sourceHint) {
  const prompt = `You are a scholarship data extraction assistant. Extract every distinct scholarship mentioned in the text below.

For each scholarship return a JSON object with EXACTLY these fields:
- scholarship_name  (string, required — full official name)
- provider          (string, required — organization/foundation offering it)
- amount            (number or null — award in USD, e.g. 5000; null if unknown)
- deadline          (string or null — YYYY-MM-DD format; null if not found or rolling)
- eligibility_criteria (string — who qualifies, requirements, restrictions; be thorough)
- application_url   (string or null — direct URL to apply; null if not visible)
- essay_required    (boolean — true if an essay is required)
- renewable         (boolean — true if award can be renewed each year)
- category_tags     (string — comma-separated tags, e.g. "Merit, STEM, Women, Financial Need")
- state_specific    (string or null — two-letter state code(s) if state-restricted, else null)
- min_gpa           (number or null — minimum GPA if stated, e.g. 3.0; else null)

Source context: ${sourceHint}

Rules:
- Only include real scholarships with at least a name and provider.
- Do not invent information — use null when a field is not stated.
- Return ONLY a valid JSON array, no markdown, no explanation.
- If no scholarships found, return [].

Page text:
${pageText}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content?.[0]?.text ?? "").trim();

  // Extract JSON array from response (handles minor formatting noise)
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function fetchExistingKeys() {
  const url = `${SUPABASE_URL}/rest/v1/scholarships?select=scholarship_name,application_url&limit=5000`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch existing scholarships (${res.status}): ${body.slice(0, 200)}`);
  }

  const rows = await res.json();
  const nameSet = new Set();
  const urlSet = new Set();

  for (const r of rows) {
    if (r.scholarship_name) nameSet.add(normalizeKey(r.scholarship_name));
    if (r.application_url) urlSet.add(normalizeKey(r.application_url));
  }

  return { nameSet, urlSet, count: rows.length };
}

async function insertScholarships(batch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scholarships`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Insert failed (${res.status}): ${JSON.stringify(body).slice(0, 400)}`);
  }
}

// ── Dedup & cleaning ──────────────────────────────────────────────────────────

function normalizeKey(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function isDuplicate(cleaned, nameSet, urlSet) {
  if (nameSet.has(normalizeKey(cleaned.scholarship_name))) return true;
  if (cleaned.application_url && urlSet.has(normalizeKey(cleaned.application_url))) return true;
  return false;
}

function cleanRow(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = typeof raw.scholarship_name === "string" ? raw.scholarship_name.trim() : "";
  const provider = typeof raw.provider === "string" ? raw.provider.trim() : "";
  if (!name || !provider) return null;

  const amount = typeof raw.amount === "number" && raw.amount > 0
    ? Math.round(raw.amount)
    : null;

  const deadline = typeof raw.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline)
    ? raw.deadline
    : null;

  const applicationUrl = typeof raw.application_url === "string" &&
    raw.application_url.startsWith("http")
    ? raw.application_url.trim()
    : null;

  const stateSpecific = typeof raw.state_specific === "string" &&
    raw.state_specific !== "null" &&
    raw.state_specific.length > 0
    ? raw.state_specific.trim()
    : null;

  const minGpa = typeof raw.min_gpa === "number" &&
    raw.min_gpa >= 1.0 && raw.min_gpa <= 4.5
    ? raw.min_gpa
    : null;

  return {
    scholarship_name: name.slice(0, 255),
    provider: provider.slice(0, 255),
    amount,
    deadline,
    eligibility_criteria: typeof raw.eligibility_criteria === "string"
      ? raw.eligibility_criteria.trim().slice(0, 3000)
      : null,
    application_url: applicationUrl,
    essay_required: raw.essay_required === true,
    renewable: raw.renewable === true,
    category_tags: typeof raw.category_tags === "string"
      ? raw.category_tags.trim().slice(0, 500)
      : null,
    state_specific: stateSpecific,
    min_gpa: minGpa,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("🎓  MeritMapper — Scholarship Fetcher");
console.log("═══════════════════════════════════════\n");

// Step 1: Load existing scholarships for dedup
process.stdout.write("📋  Loading existing scholarships from Supabase… ");
let nameSet, urlSet, existingCount;
try {
  ({ nameSet, urlSet, count: existingCount } = await fetchExistingKeys());
  console.log(`${existingCount} found\n`);
} catch (err) {
  console.error(`\n❌  ${err.message}`);
  process.exit(1);
}

let totalInserted = 0;
let totalSkipped = 0;
let totalSourceErrors = 0;

// Step 2: Process each source
for (const source of SOURCES) {
  console.log(`🌐  ${source.name}`);

  // Fetch page
  let pageText;
  try {
    const res = await fetch(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.log(`    ⚠️  HTTP ${res.status} — skipping\n`);
      totalSourceErrors++;
      continue;
    }

    const html = await res.text();
    pageText = stripHtml(html);

    // A very short result means the page is JS-rendered (empty shell)
    if (pageText.length < 800) {
      console.log(`    ⚠️  Page appears JS-rendered (${pageText.length} chars) — skipping\n`);
      continue;
    }

    console.log(`    ✓ Fetched ${pageText.length.toLocaleString()} chars`);
  } catch (err) {
    console.log(`    ⚠️  Fetch failed: ${err.message} — skipping\n`);
    totalSourceErrors++;
    continue;
  }

  // Extract via Claude
  let extracted = [];
  try {
    process.stdout.write("    🤖  Extracting with Claude… ");
    extracted = await extractScholarships(pageText, source.hint);
    console.log(`${extracted.length} scholarship(s) found`);
  } catch (err) {
    console.log(`\n    ⚠️  Extraction failed: ${err.message}`);
    totalSourceErrors++;
    console.log();
    continue;
  }

  if (extracted.length === 0) {
    console.log("    ℹ️  None extracted — moving on\n");
    continue;
  }

  // Deduplicate & clean
  const toInsert = [];
  for (const raw of extracted) {
    const cleaned = cleanRow(raw);
    if (!cleaned) continue;

    if (isDuplicate(cleaned, nameSet, urlSet)) {
      totalSkipped++;
      continue;
    }

    // Register in sets immediately so within-run duplicates are caught too
    nameSet.add(normalizeKey(cleaned.scholarship_name));
    if (cleaned.application_url) urlSet.add(normalizeKey(cleaned.application_url));

    toInsert.push(cleaned);
  }

  const dupeCount = extracted.length - toInsert.length;
  console.log(`    📊  ${toInsert.length} new  |  ${dupeCount} duplicate(s) skipped`);

  // Insert
  if (toInsert.length > 0) {
    try {
      await insertScholarships(toInsert);
      totalInserted += toInsert.length;
      console.log(`    ✅  Inserted ${toInsert.length} new scholarship(s)`);
    } catch (err) {
      console.log(`    ❌  Insert error: ${err.message}`);
      totalSourceErrors++;
    }
  }

  console.log();
}

// Step 3: Summary
console.log("═══════════════════════════════════════");
console.log(`✅  Run complete`);
console.log(`    • ${totalInserted} new scholarship(s) added to Supabase`);
console.log(`    • ${totalSkipped} duplicate(s) skipped`);
console.log(`    • ${totalSourceErrors} source error(s)`);
console.log();
if (totalInserted === 0 && totalSkipped === 0) {
  console.log("ℹ️   No scholarships were found — most sources may be JS-rendered.");
  console.log("    Try running again, or add more static scholarship listing URLs to SOURCES.");
}
