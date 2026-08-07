const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("[contact] Missing env vars — SUPABASE_URL:", !!SUPABASE_URL, "SERVICE_KEY:", !!SUPABASE_SERVICE_KEY);
    return res.status(503).json({ error: "Server misconfigured — missing Supabase credentials." });
  }

  const { name, email, message } = req.body ?? {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email, and message are required" });
  }

  // ── 1. Save to Supabase (service role key — bypasses RLS) ──────────────────
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      submitted_at: new Date().toISOString(),
    }),
  });

  if (!dbRes.ok) {
    const err = await dbRes.json().catch(() => ({}));
    console.error("[contact] Supabase insert failed — status:", dbRes.status, "error:", JSON.stringify(err));
    return res.status(500).json({
      error: `Database error (${dbRes.status}): ${err?.message ?? err?.code ?? "unknown"}`,
    });
  }

  console.log("[contact] Saved to contact_submissions ✓");

  // ── 2. Send email via Resend (best-effort — never blocks the response) ─────
  if (!RESEND_API_KEY) {
    console.warn("[contact] RESEND_API_KEY not set — skipping email notification");
  } else {
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "noreply@meritmapper.com",
          to: ["contact@meritmapper.com"],
          subject: "New Contact Form Submission - MeritMapper",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="background: #2563eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 18px;">New Contact Form Submission</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">MeritMapper</p>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; width: 100px;">
                    <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Name</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 15px; color: #1a1a2e;">${name.trim()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Email</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <a href="mailto:${email.trim()}" style="font-size: 15px; color: #2563eb;">${email.trim()}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; vertical-align: top;">
                    <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Message</span>
                  </td>
                  <td style="padding: 12px 0;">
                    <p style="font-size: 15px; color: #1a1a2e; margin: 0; white-space: pre-wrap;">${message.trim()}</p>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 24px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="font-size: 13px; color: #64748b; margin: 0;">
                  Submitted ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} UTC
                  · Reply directly to <a href="mailto:${email.trim()}" style="color: #2563eb;">${email.trim()}</a>
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.json().catch(() => ({}));
        console.error("[contact] Resend failed — status:", emailRes.status, "error:", JSON.stringify(err));
      } else {
        console.log("[contact] Email sent via Resend ✓");
      }
    } catch (e) {
      console.error("[contact] Email send threw:", e.message);
    }
  }

  return res.status(200).json({ ok: true });
}
