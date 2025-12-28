"use client";

import { useEffect, useState } from "react";

type GmailStatus = {
  google_email: string | null;
  watch_expiration: string | null;
  last_history_id: string | null;
  gmail_query: string | null;
  auto_extract: boolean;
};

export default function SettingsPage() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [query, setQuery] = useState("");
  const [autoExtract, setAutoExtract] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    const res = await fetch("/api/gmail/status");
    const data = await res.json();
    setStatus(data.status ?? null);
    setQuery(data.status?.gmail_query ?? "");
    setAutoExtract(Boolean(data.status?.auto_extract));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const updateSettings = async () => {
    setMessage("Saving...");
    await fetch("/api/gmail/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gmail_query: query, auto_extract: autoExtract })
    });
    setMessage("Saved");
  };

  const runExtraction = async () => {
    setMessage("Running extraction...");
    await fetch("/api/extract/run", { method: "POST" });
    setMessage("Extraction triggered");
  };

  const forceResync = async () => {
    setMessage("Resyncing...");
    await fetch("/api/gmail/force-resync", { method: "POST" });
    setMessage("Resync completed");
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-lg font-semibold">Gmail connection</h2>
        <p className="text-sm text-slate-600">
          Connect Gmail to auto-sync locum offers via push notifications.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href="/api/auth/google/start"
            className="inline-flex w-fit px-4 py-2 rounded-lg bg-slate-900 text-white"
          >
            Connect Gmail
          </a>
          {status?.google_email && (
            <p className="text-sm">Connected as {status.google_email}</p>
          )}
        </div>
        <div className="grid gap-3 text-sm">
          <label className="flex flex-col gap-2">
            Gmail query
            <input
              className="border rounded-lg px-3 py-2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}

              placeholder="newer_than:30d (locum OR shift OR cover OR booking OR rate OR \"£\")"

            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoExtract}
              onChange={(event) => setAutoExtract(event.target.checked)}
            />
            Auto-extract on new Gmail events
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-slate-900 text-white"
            onClick={updateSettings}
          >
            Save settings
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-slate-100"
            onClick={forceResync}
          >
            Force Resync
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-slate-100"
            onClick={runExtraction}
          >
            Run Extraction Now
          </button>
        </div>
        <div className="text-sm text-slate-600 space-y-1">
          <p>Last history ID: {status?.last_history_id ?? "--"}</p>
          <p>Watch expires: {status?.watch_expiration ?? "--"}</p>
        </div>
        {message && <p className="text-sm text-slate-500">{message}</p>}
      </section>
    </div>
  );
}
