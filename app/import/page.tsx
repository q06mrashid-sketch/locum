"use client";

import { useState } from "react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    const text = await file.text();
    const res = await fetch("/api/ingest/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    setStatus(`Imported ${data.count ?? 0} messages`);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <h2 className="text-lg font-semibold">WhatsApp Export Import</h2>
        <p className="text-sm text-slate-600">
          Upload a .txt export (no media). We will parse and ingest messages for extraction.
        </p>
        <input
          type="file"
          accept=".txt"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white"
          onClick={handleUpload}
          disabled={!file}
        >
          Import
        </button>
        {status && <p className="text-sm text-slate-600">{status}</p>}
      </section>
    </div>
  );
}
