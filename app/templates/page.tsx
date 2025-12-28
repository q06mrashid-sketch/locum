"use client";

import { useEffect, useState } from "react";

type Template = {
  id: string;
  agency: string;
  channel: "email" | "whatsapp";
  subject_template: string | null;
  body_template: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const loadTemplates = async () => {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSave = async () => {
    setStatus("Saving...");
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates })
    });
    setStatus("Saved");
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Booking Templates</h2>
          <button
            className="px-4 py-2 rounded-lg bg-slate-900 text-white"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
        {templates.map((template, index) => (
          <div key={template.id} className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">
              {template.channel.toUpperCase()} · {template.agency}
            </p>
            {template.channel === "email" && (
              <label className="text-sm flex flex-col gap-2">
                Subject template
                <input
                  className="border rounded-lg px-3 py-2"
                  value={template.subject_template ?? ""}
                  onChange={(event) => {
                    const next = [...templates];
                    next[index] = {
                      ...template,
                      subject_template: event.target.value
                    };
                    setTemplates(next);
                  }}
                />
              </label>
            )}
            <label className="text-sm flex flex-col gap-2">
              Body template
              <textarea
                className="border rounded-lg px-3 py-2 min-h-[120px]"
                value={template.body_template}
                onChange={(event) => {
                  const next = [...templates];
                  next[index] = {
                    ...template,
                    body_template: event.target.value
                  };
                  setTemplates(next);
                }}
              />
            </label>
          </div>
        ))}
        {status && <p className="text-sm text-slate-500">{status}</p>}
      </section>
    </div>
  );
}
