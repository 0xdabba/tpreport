"use client";

import { useState, useEffect, use } from "react";
import { Loader2, FileText, Download, CalendarDays, Mail, Phone } from "lucide-react";

interface PortalData {
  firm: {
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    brandColor: string | null;
    logoText: string | null;
  };
  client: { name: string; industry: string | null };
  documents: {
    id: string;
    name: string;
    type: string;
    financialYear: string | null;
    updatedAt: string;
  }[];
  deadlines: {
    id: string;
    label: string;
    dueDate: string;
    status: string;
    financialYear: string;
  }[];
}

export default function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(async (res) => {
        if (res.ok) setData(await res.json());
        else setError((await res.json()).error || "Link invalid");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-foreground">This link is not available</p>
        <p className="text-muted text-sm">{error || "The portal link may have been revoked. Contact your accountant."}</p>
      </div>
    );
  }

  const brand = data.firm.brandColor || "#C2410C";
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* Firm-branded header — the whole point of white-label */}
      <header className="border-b border-border" style={{ background: brand }}>
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-lg">
            {data.firm.logoText || data.firm.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{data.firm.name}</h1>
            <p className="text-white/80 text-sm">
              Transfer pricing deliverables for {data.client.name}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: brand }} /> Final deliverables
          </h2>
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted bg-surface border border-border rounded-xl p-5">
              No finalised documents yet — your accountant will publish them here.
            </p>
          ) : (
            <div className="space-y-2">
              {data.documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between bg-surface border border-border rounded-xl p-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{d.name}</div>
                    <div className="text-xs text-muted">
                      FY {d.financialYear || "—"} · updated {fmt(d.updatedAt)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-3">
                    <a
                      href={`/api/portal/${token}/doc/${d.id}?format=pdf`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                      style={{ background: brand }}
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                    <a
                      href={`/api/portal/${token}/doc/${d.id}?format=docx`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground"
                    >
                      <Download className="w-3.5 h-3.5" /> DOCX
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: brand }} /> Compliance calendar
          </h2>
          {data.deadlines.length === 0 ? (
            <p className="text-sm text-muted bg-surface border border-border rounded-xl p-5">
              No tracked deadlines.
            </p>
          ) : (
            <div className="bg-surface border border-border rounded-xl divide-y divide-border">
              {data.deadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <div className="text-foreground">{d.label}</div>
                    <div className="text-xs text-muted">FY {d.financialYear}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground font-medium">{fmt(d.dueDate)}</div>
                    <div
                      className={`text-xs font-medium ${
                        d.status === "done"
                          ? "text-success"
                          : d.status === "overdue"
                            ? "text-danger"
                            : "text-muted"
                      }`}
                    >
                      {d.status === "done" ? "Filed ✓" : d.status === "overdue" ? "Overdue" : "Upcoming"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-2">Questions?</h2>
          <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted">
            {data.firm.email && (
              <a href={`mailto:${data.firm.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Mail className="w-4 h-4" /> {data.firm.email}
              </a>
            )}
            {data.firm.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> {data.firm.phone}
              </span>
            )}
            {data.firm.city && <span>{data.firm.city}</span>}
          </div>
        </section>

        <p className="text-xs text-muted text-center">
          Secure portal provided by {data.firm.name}. Documents are final versions released by the
          firm.
        </p>
      </div>
    </div>
  );
}
