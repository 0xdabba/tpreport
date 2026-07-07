"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Landmark, ExternalLink } from "lucide-react";

interface CaseLaw {
  id: string;
  name: string;
  citation: string | null;
  forum: string | null;
  year: number | null;
  issueTags: string | null;
  method: string | null;
  holding: string;
  fullTextUrl: string | null;
}

const QUICK_TAGS = [
  "AMP expenditure",
  "bright line",
  "TNMM",
  "CUP",
  "comparable selection",
  "royalty",
  "corporate guarantee",
  "management fees",
  "APA",
  "berry ratio",
];

export default function CaseLawPage() {
  const [cases, setCases] = useState<CaseLaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState("");

  const fetchCases = useCallback(async (query: string, tag: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tag) params.set("tag", tag);
    const res = await fetch(`/api/caselaw?${params}`);
    if (res.ok) setCases(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCases("", "");
  }, [fetchCases]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases(q, activeTag);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">TP Case Law Library</h1>
          <p className="text-muted mt-1">
            Landmark Indian transfer pricing rulings, summarised by issue — for method selection and
            litigation-risk assessment
          </p>
        </div>

        <form onSubmit={search} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by issue, party, or citation..."
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 flex-wrap mb-8">
          {QUICK_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => {
                const next = activeTag === t ? "" : t;
                setActiveTag(next);
                fetchCases(q, next);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                activeTag === t
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Landmark className="w-10 h-10 text-muted mb-3" />
            <p className="text-muted">No cases match. Try a broader search.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => (
              <div key={c.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-foreground">{c.name}</h3>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {[c.forum, c.year].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {c.citation && <p className="text-xs text-muted mb-2 font-mono">{c.citation}</p>}
                <p className="text-sm text-foreground leading-relaxed mb-3">{c.holding}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {(c.issueTags || "").split(",").filter(Boolean).map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-muted">
                        {t.trim()}
                      </span>
                    ))}
                    {c.method && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {c.method}
                      </span>
                    )}
                  </div>
                  {c.fullTextUrl && (
                    <a
                      href={c.fullTextUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Full text <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted text-center pt-4">
              Summaries are editorial aids, not legal advice — verify the ruling text before citing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
