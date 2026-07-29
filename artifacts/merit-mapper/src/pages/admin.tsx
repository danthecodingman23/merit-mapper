import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function adminFetch(path: string, pw: string, options: RequestInit = {}) {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": pw,
      ...(options.headers ?? {}),
    },
  });
}

/* ── tiny shared UI ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-[#1a1a2e] mb-4 pb-2 border-b border-[#e2e8f0]">{title}</h2>
      {children}
    </section>
  );
}

function Tbl({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            {heads.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-[#374151] align-top ${className}`}>{children}</td>;
}

function Btn({
  onClick,
  disabled,
  variant = "default",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger" | "success";
  children: React.ReactNode;
}) {
  const base = "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const colors =
    variant === "danger"
      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
      : variant === "success"
      ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
      : "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] hover:bg-blue-100";
  return (
    <button className={`${base} ${colors}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function fmt(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ── Feedback table ── */
type FeedbackRow = { id: string; scholarship_name: string; reason: string; user_id: string | null; submitted_at: string };

function FeedbackSection({ pw }: { pw: string }) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/feedback", pw)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRows(d); else setErr(d?.error ?? "Failed to load"); })
      .catch(() => setErr("Network error"))
      .finally(() => setLoading(false));
  }, [pw]);

  return (
    <Section title="Not a Good Fit Reports">
      {loading ? <p className="text-sm text-[#64748b]">Loading…</p> : err ? <p className="text-sm text-red-600">{err}</p> : rows.length === 0 ? <p className="text-sm text-[#64748b]">No reports yet.</p> : (
        <Tbl heads={["Scholarship Name", "Reason", "User ID", "Date Submitted"]}>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#f1f5f9] hover:bg-[#fafafa]">
              <Td className="font-medium">{r.scholarship_name}</Td>
              <Td>{r.reason}</Td>
              <Td className="font-mono text-xs text-[#94a3b8] max-w-[180px] truncate">{r.user_id ?? "—"}</Td>
              <Td className="whitespace-nowrap">{fmt(r.submitted_at)}</Td>
            </tr>
          ))}
        </Tbl>
      )}
    </Section>
  );
}

/* ── Reported links table ── */
type LinkRow = { id: string; scholarship_id: string; scholarship_name: string; application_url: string | null; reported_at: string };

function EditUrlModal({ row, pw, onDone }: { row: LinkRow; pw: string; onDone: () => void }) {
  const [url, setUrl] = useState(row.application_url ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    const r = await adminFetch("/api/admin/update-scholarship", pw, {
      method: "POST",
      body: JSON.stringify({ scholarship_id: row.scholarship_id, new_url: url }),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(d?.error ?? "Failed to save"); return; }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onDone}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-[#1a1a2e] mb-1">Edit Application URL</h3>
        <p className="text-xs text-[#64748b] mb-4">{row.scholarship_name}</p>
        <input
          className="w-full border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] mb-3"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
        {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button className="text-sm text-[#64748b] hover:text-[#1a1a2e] px-3 py-1.5 transition-colors" onClick={onDone}>Cancel</button>
          <button
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            disabled={saving || !url.trim()}
            onClick={save}
          >
            {saving ? "Saving…" : "Save URL"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportedLinksSection({ pw }: { pw: string }) {
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<LinkRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch("/api/admin/reported-links", pw)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRows(d); else setErr(d?.error ?? "Failed to load"); })
      .catch(() => setErr("Network error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [pw]);

  const deleteScholarship = async (row: LinkRow) => {
    if (!confirm(`Delete "${row.scholarship_name}" from the scholarships table? This cannot be undone.`)) return;
    setDeleting(row.id);
    const r = await adminFetch("/api/admin/delete-scholarship", pw, {
      method: "POST",
      body: JSON.stringify({ scholarship_id: row.scholarship_id }),
    });
    setDeleting(null);
    if (r.ok) setRows((prev) => prev.filter((x) => x.id !== row.id));
    else { const d = await r.json().catch(() => ({})); alert(d?.error ?? "Failed to delete"); }
  };

  return (
    <Section title="Bad Link Reports">
      {editRow && <EditUrlModal row={editRow} pw={pw} onDone={() => { setEditRow(null); load(); }} />}
      {loading ? <p className="text-sm text-[#64748b]">Loading…</p> : err ? <p className="text-sm text-red-600">{err}</p> : rows.length === 0 ? <p className="text-sm text-[#64748b]">No reports yet.</p> : (
        <Tbl heads={["Scholarship Name", "Reported URL", "Date Reported", "Actions"]}>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#f1f5f9] hover:bg-[#fafafa]">
              <Td className="font-medium">{r.scholarship_name}</Td>
              <Td className="max-w-[200px]">
                <span className="font-mono text-xs text-[#64748b] break-all">{r.application_url ?? "—"}</span>
              </Td>
              <Td className="whitespace-nowrap">{fmt(r.reported_at)}</Td>
              <Td>
                <div className="flex gap-2 flex-wrap">
                  <Btn onClick={() => setEditRow(r)}>Edit URL</Btn>
                  <Btn variant="danger" disabled={deleting === r.id} onClick={() => deleteScholarship(r)}>
                    {deleting === r.id ? "Removing…" : "Remove Scholarship"}
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
        </Tbl>
      )}
    </Section>
  );
}

/* ── Users table ── */
type UserRow = { id: string; email: string; created_at: string };

function UsersSection({ pw }: { pw: string }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/users", pw)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRows(d); else setErr(d?.error ?? "Failed to load"); })
      .catch(() => setErr("Network error"))
      .finally(() => setLoading(false));
  }, [pw]);

  const deleteUser = async (row: UserRow) => {
    if (!confirm(`Delete account for ${row.email}? This cannot be undone.`)) return;
    setDeleting(row.id);
    const r = await adminFetch("/api/admin/delete-user", pw, {
      method: "POST",
      body: JSON.stringify({ user_id: row.id }),
    });
    setDeleting(null);
    if (r.ok) setRows((prev) => prev.filter((x) => x.id !== row.id));
    else { const d = await r.json().catch(() => ({})); alert(d?.error ?? "Failed to delete"); }
  };

  return (
    <Section title="Account Management">
      {loading ? <p className="text-sm text-[#64748b]">Loading…</p> : err ? <p className="text-sm text-red-600">{err}</p> : rows.length === 0 ? <p className="text-sm text-[#64748b]">No users found.</p> : (
        <Tbl heads={["Email", "Date Joined", "Actions"]}>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#f1f5f9] hover:bg-[#fafafa]">
              <Td className="font-medium">{r.email}</Td>
              <Td className="whitespace-nowrap">{fmt(r.created_at)}</Td>
              <Td>
                <Btn variant="danger" disabled={deleting === r.id} onClick={() => deleteUser(r)}>
                  {deleting === r.id ? "Deleting…" : "Delete Account"}
                </Btn>
              </Td>
            </tr>
          ))}
        </Tbl>
      )}
    </Section>
  );
}

/* ── Main admin page ── */
export default function Admin() {
  const [input, setInput] = useState("");
  const [pw, setPw] = useState<string | null>(() => sessionStorage.getItem("admin_pw"));
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);

  const verify = async () => {
    setChecking(true);
    setWrong(false);
    try {
      const r = await fetch(`${BASE}/api/admin/feedback`, {
        headers: { "x-admin-password": input },
      });
      if (r.ok || r.status !== 401) {
        sessionStorage.setItem("admin_pw", input);
        setPw(input);
      } else {
        setWrong(true);
      }
    } catch {
      setWrong(true);
    }
    setChecking(false);
  };

  if (!pw) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#e8f0fe] to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-md bg-[#2563eb] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" fillOpacity="0.9" />
                <circle cx="8" cy="8" r="2" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-[#1a1a2e] tracking-tight text-[15px]">MeritMapper Admin</span>
          </div>
          <p className="text-sm text-[#64748b] mb-5">Enter the admin password to continue.</p>
          <input
            type="password"
            className="w-full border border-[#e2e8f0] rounded-xl px-3.5 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] mb-3"
            placeholder="Password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          {wrong && <p className="text-xs text-red-600 mb-3">Incorrect password.</p>}
          <button
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            disabled={checking || !input}
            onClick={verify}
          >
            {checking ? "Checking…" : "Enter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f0fe] to-white">
      <header className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#2563eb] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="white" fillOpacity="0.9" />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-semibold text-[#1a1a2e] tracking-tight text-[15px]">MeritMapper Admin</span>
        </div>
        <button
          className="text-xs text-[#94a3b8] hover:text-red-500 transition-colors font-medium"
          onClick={() => { sessionStorage.removeItem("admin_pw"); setPw(null); }}
        >
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto py-10 px-4">
        <FeedbackSection pw={pw} />
        <ReportedLinksSection pw={pw} />
        <UsersSection pw={pw} />
      </main>
    </div>
  );
}
