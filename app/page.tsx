"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

type ShiftOffer = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  rate_value: number | null;
  rate_unit: string | null;
  practice_name: string | null;
  postcode: string | null;
  town: string | null;
  agency: string | null;
  booking_channel: string;
  booking_target: string | null;
  notes: string | null;
  status: string;
  source_raw_ids: string[];
};

const statusOptions = ["new", "requested", "booked", "ignored"];

export default function DashboardPage() {
  const [offers, setOffers] = useState<ShiftOffer[]>([]);
  const [minRate, setMinRate] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["new"]);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return offers.filter((offer) => {
      if (minRate && (offer.rate_value ?? 0) < minRate) return false;
      if (statusFilter.length && !statusFilter.includes(offer.status)) return false;
      const haystack = [
        offer.practice_name,
        offer.postcode,
        offer.town,
        offer.agency,
        offer.notes
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      return true;
    });
  }, [offers, minRate, query, statusFilter]);

  const loadOffers = async () => {
    setLoading(true);
    const res = await fetch("/api/shifts");
    const data = await res.json();
    setOffers(data.offers ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/shift/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    await loadOffers();
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm flex flex-col gap-2">
              Min rate
              <input
                type="number"
                className="border rounded-lg px-3 py-2"
                value={minRate}
                onChange={(event) => setMinRate(Number(event.target.value))}
              />
            </label>
            <label className="text-sm flex flex-col gap-2">
              Search
              <input
                type="text"
                className="border rounded-lg px-3 py-2"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="agency, postcode, notes"
              />
            </label>
            <div className="text-sm flex flex-col gap-2">
              Status
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={clsx(
                      "px-3 py-1 rounded-full border",
                      statusFilter.includes(status)
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100"
                    )}
                    onClick={() =>
                      setStatusFilter((current) =>
                        current.includes(status)
                          ? current.filter((item) => item !== status)
                          : [...current, status]
                      )
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shift offers</h2>
          <button
            type="button"
            className="text-sm px-3 py-2 rounded-lg bg-slate-900 text-white"
            onClick={loadOffers}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {filtered.length === 0 && (
          <div className="bg-white p-4 rounded-xl border border-dashed text-sm text-slate-500">
            No offers yet. Connect Gmail in <Link href="/settings">Settings</Link> or
            import WhatsApp chats.
          </div>
        )}
        <div className="grid gap-4">
          {filtered.map((offer) => (
            <article
              key={offer.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">{offer.date}</p>
                  <h3 className="text-lg font-semibold">
                    {offer.practice_name ?? "Practice"}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {offer.town ?? offer.postcode ?? "Location unknown"}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  {offer.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  Time: {offer.start_time ?? "--"} - {offer.end_time ?? "--"}
                </span>
                <span>
                  Rate: {offer.rate_value ?? "--"} {offer.rate_unit ?? ""}
                </span>
                <span>Agency: {offer.agency ?? "--"}</span>
              </div>
              {offer.notes && (
                <p className="text-sm text-slate-600">Notes: {offer.notes}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <a
                  className="text-center px-3 py-2 rounded-lg bg-slate-900 text-white"
                  href={`/api/shift/action?type=email&id=${offer.id}`}
                >
                  Draft Email
                </a>
                <a
                  className="text-center px-3 py-2 rounded-lg bg-emerald-600 text-white"
                  href={`/api/shift/action?type=whatsapp&id=${offer.id}`}
                >
                  Open WhatsApp
                </a>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <button
                  className="px-3 py-2 rounded-lg bg-slate-100"
                  onClick={() => updateStatus(offer.id, "requested")}
                >
                  Mark Requested
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-slate-100"
                  onClick={() => updateStatus(offer.id, "booked")}
                >
                  Mark Booked
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-slate-100"
                  onClick={() => updateStatus(offer.id, "ignored")}
                >
                  Ignore
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Sources: {offer.source_raw_ids.length}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
