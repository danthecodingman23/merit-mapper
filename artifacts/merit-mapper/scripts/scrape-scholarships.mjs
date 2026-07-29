/**
 * MeritMapper Scholarship Scraper
 * --------------------------------
 * Fetches public scholarship listing pages, strips HTML to readable text,
 * sends to Claude to extract structured data, and outputs SQL INSERT statements
 * ready to paste into the Supabase SQL editor.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=<your-key> node scripts/scrape-scholarships.mjs
 *
 * Output:
 *   scripts/scholarships-output.sql  (SQL INSERT statements)
 *   scripts/scholarships-output.json (raw extracted JSON)
 *
 * Add more URLs to SOURCES to scrape additional pages.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error("❌  Set ANTHROPIC_API_KEY before running this script.");
  process.exit(1);
}

// ─── Sources ──────────────────────────────────────────────────────────────────
// Add / remove URLs freely. Each URL is fetched, text-extracted, then sent to
// Claude in one request. Pages behind login walls will return little useful data
// — just remove them if results are empty.

const SOURCES = [
  // Unigo own scholarships – WordPress, server-rendered, rich data
  "https://www.unigo.com/scholarships/our-scholarships",
  // UNCF – large national scholarship org, static listings
  "https://uncf.org/scholarships",
  // ScholarshipOwl blog – curated lists with amounts + deadlines
  "https://www.scholarshipowl.com/blog/scholarships/",
  // Nitro College – large scholarship guide, server-rendered
  "https://www.nitrocollege.com/scholarships",
  // Elks Most Valuable Student scholarship
  "https://www.elks.org/scholars/scholarships/mvs.cfm",
  // Scholars Apply / Thurgood Marshall College Fund
  "https://learnmore.scholarsapply.org/",
  // Additional curated lists
  "https://www.nitrocollege.com/blog/big-list-of-scholarships",
  "https://www.scholarshipowl.com/blog/scholarships-for-college-students/",
  "https://uncf.org/scholarships?searchParams=keyword%3D%26page%3D1",
  "https://www.unigo.com/scholarships/sweepstakes",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

/** Fetch a URL, return {url, text, error} */
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!res.ok) return { url, error: `HTTP ${res.status}` };
    const html = await res.text();
    return { url, html };
  } catch (e) {
    return { url, error: e.message };
  }
}

/** Strip HTML tags, collapse whitespace, keep ~8 KB of useful text */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 8000); // keep first 8 KB — enough for Claude to work with
}

/** Call Claude to extract scholarships from page text */
async function extractScholarships(url, pageText) {
  const prompt = `You are a data extraction assistant. Below is text scraped from a scholarship web page (${url}).

Extract every distinct scholarship you can find. For each one, return a JSON object with these exact keys:
  - name (string, required) — full scholarship name
  - provider (string) — organisation / company offering it
  - description (string) — 1–3 sentence description
  - amount (string | null) — e.g. "$2,000", "$500–$5,000", "Full tuition", or null if unknown
  - deadline (string | null) — ISO date "YYYY-MM-DD" if parseable, else the text deadline, else null
  - requirements (string | null) — eligibility requirements summary
  - eligibility (string | null) — who can apply (year, citizenship, etc.)
  - field_of_study (string | null) — academic field or "Any"
  - state_specific (string | null) — US state abbreviation (e.g. "CA") or null if national
  - min_gpa (number | null) — minimum GPA as a float (e.g. 3.0) or null
  - application_url (string | null) — direct URL to apply

Return ONLY a valid JSON array [ {...}, {...} ] — no markdown, no prose, no code fences.
If you find no scholarships, return [].

PAGE TEXT:
${pageText}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim() ?? "[]";

  try {
    // Strip accidental markdown fences
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn("  ⚠️  Could not parse Claude response as JSON — skipping");
    return [];
  }
}

// ─── SQL formatter ────────────────────────────────────────────────────────────

function esc(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return isNaN(val) ? "NULL" : String(val);
  // Escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toInsert(s) {
  return (
    `INSERT INTO scholarships ` +
    `(name, provider, description, amount, deadline, requirements, eligibility, field_of_study, state_specific, min_gpa, application_url) VALUES (\n` +
    `  ${esc(s.name)},\n` +
    `  ${esc(s.provider)},\n` +
    `  ${esc(s.description)},\n` +
    `  ${esc(s.amount)},\n` +
    `  ${esc(s.deadline)},\n` +
    `  ${esc(s.requirements)},\n` +
    `  ${esc(s.eligibility)},\n` +
    `  ${esc(s.field_of_study)},\n` +
    `  ${esc(s.state_specific)},\n` +
    `  ${esc(s.min_gpa)},\n` +
    `  ${esc(s.application_url)}\n` +
    `);\n`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const allScholarships = [];

  console.log(`\n🎓  MeritMapper Scholarship Scraper`);
  console.log(`   Scraping ${SOURCES.length} sources…\n`);

  // Fetch all pages in parallel (max 5 at a time to be polite)
  const BATCH = 5;
  for (let i = 0; i < SOURCES.length; i += BATCH) {
    const batch = SOURCES.slice(i, i + BATCH);
    const pages = await Promise.all(batch.map(fetchPage));

    for (const page of pages) {
      if (page.error) {
        console.log(`  ❌  ${page.url}\n      → ${page.error}`);
        continue;
      }
      const text = htmlToText(page.html);
      if (text.length < 200) {
        console.log(`  ⚠️   ${page.url}\n      → Too little text (JS-rendered / empty)`);
        continue;
      }

      console.log(`  🔍  ${page.url} (${text.length} chars text)`);

      try {
        const scholarships = await extractScholarships(page.url, text);
        console.log(`      → Extracted ${scholarships.length} scholarship(s)`);
        allScholarships.push(...scholarships);
      } catch (e) {
        console.log(`      → Claude error: ${e.message}`);
      }
    }
  }

  // Deduplicate by name (case-insensitive)
  const seen = new Set();
  const unique = allScholarships.filter((s) => {
    if (!s.name) return false;
    const key = s.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n✅  Total unique scholarships extracted: ${unique.length}`);

  if (unique.length === 0) {
    console.log("   No scholarships found. Try adding more source URLs at the top of the script.");
    return;
  }

  // Write JSON
  const jsonPath = path.join(__dirname, "scholarships-output.json");
  fs.writeFileSync(jsonPath, JSON.stringify(unique, null, 2));
  console.log(`📄  JSON saved → ${jsonPath}`);

  // Write SQL
  const sqlLines = [
    "-- MeritMapper Scholarship Inserts",
    `-- Generated: ${new Date().toISOString()}`,
    `-- ${unique.length} scholarships`,
    "",
    ...unique.map(toInsert),
  ];
  const sqlPath = path.join(__dirname, "scholarships-output.sql");
  fs.writeFileSync(sqlPath, sqlLines.join("\n"));
  console.log(`📄  SQL saved  → ${sqlPath}`);
  console.log("\n🚀  Paste the SQL file contents into Supabase SQL Editor to insert all rows.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
