"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Filter,
  Calendar,
  Shield,
  Building2,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  clientId: string;
  client: { id: string; name: string };
  createdAt: string;
  resolvedAt: string | null;
}

interface ComplianceDeadline {
  title: string;
  date: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

const COMPLIANCE_DEADLINES: ComplianceDeadline[] = [
  {
    title: "Form 3CEB Filing",
    date: "2026-10-31",
    description:
      "Due date for filing Form 3CEB (Accountant's Report) for FY 2025-26",
    severity: "critical",
  },
  {
    title: "Income Tax Return Filing",
    date: "2026-10-31",
    description:
      "Due date for filing ITR for companies requiring TP audit (FY 2025-26)",
    severity: "critical",
  },
  {
    title: "Master File Submission",
    date: "2026-11-30",
    description:
      "Master File to be filed with DGIT (Risk Assessment) for FY 2025-26",
    severity: "warning",
  },
  {
    title: "CbCR Filing (Form 3CEAC/3CEAD/3CEAE)",
    date: "2026-11-30",
    description:
      "Country-by-Country Report filing for qualifying MNE groups",
    severity: "warning",
  },
  {
    title: "TP Documentation Completion",
    date: "2026-10-31",
    description:
      "Contemporaneous TP documentation to be maintained before due date of ITR filing",
    severity: "warning",
  },
  {
    title: "APA Renewal Application",
    date: "2026-06-30",
    description:
      "Advance Pricing Agreement renewal applications for expiring APAs",
    severity: "info",
  },
  {
    title: "Quarterly Transfer Pricing Review",
    date: "2026-03-31",
    description:
      "Quarterly review of intercompany pricing to ensure arm's length compliance",
    severity: "info",
  },
  {
    title: "Annual TP Policy Update",
    date: "2026-04-01",
    description:
      "Update intercompany agreements and pricing policies for new financial year",
    severity: "info",
  },
];

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="w-5 h-5 text-danger" />;
    case "warning":
      return <AlertCircle className="w-5 h-5 text-warning" />;
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
}

function severityBadge(severity: string) {
  const styles: Record<string, string> = {
    critical: "bg-danger/10 text-danger border-danger/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-blue-50 text-blue-600 border-blue-200",
  };
  return styles[severity] || styles.info;
}

function statusBadge(status: string) {
  if (status === "resolved") {
    return "bg-success/10 text-success";
  }
  return "bg-surface-alt text-muted";
}

function ComplianceGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "text-success"
      : score >= 60
        ? "text-warning"
        : "text-danger";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"alerts" | "calendar" | "scores">(
    "alerts"
  );

  const fetchData = useCallback(async () => {
    try {
      const [clientsRes] = await Promise.all([fetch("/api/clients")]);
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);

        // Generate sample alerts based on clients
        const sampleAlerts: Alert[] = [];
        for (const client of clientsData) {
          sampleAlerts.push(
            {
              id: `alert-${client.id}-1`,
              title: "Form 3CEB Filing Due",
              description: `Form 3CEB for ${client.name} FY 2025-26 is due by 31 October 2026. Ensure all international transactions are documented.`,
              severity: "critical",
              status: "active",
              clientId: client.id,
              client: { id: client.id, name: client.name },
              createdAt: new Date().toISOString(),
              resolvedAt: null,
            },
            {
              id: `alert-${client.id}-2`,
              title: "TP Documentation Review Pending",
              description: `Transfer pricing documentation for ${client.name} needs to be reviewed and updated for the current financial year.`,
              severity: "warning",
              status: "active",
              clientId: client.id,
              client: { id: client.id, name: client.name },
              createdAt: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000
              ).toISOString(),
              resolvedAt: null,
            },
            {
              id: `alert-${client.id}-3`,
              title: "Benchmarking Analysis Outdated",
              description: `Comparable data for ${client.name} was last updated over 12 months ago. Consider refreshing the benchmarking analysis.`,
              severity: "info",
              status: "active",
              clientId: client.id,
              client: { id: client.id, name: client.name },
              createdAt: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
              resolvedAt: null,
            }
          );
        }
        setAlerts(sampleAlerts);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markResolved = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: "resolved", resolvedAt: new Date().toISOString() }
          : a
      )
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.client.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
    const matchesSeverity =
      severityFilter === "all" || a.severity === severityFilter;
    const matchesStatus =
      statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Generate compliance scores per client (simulated)
  const clientScores = clients.map((client) => {
    const clientAlerts = alerts.filter((a) => a.clientId === client.id);
    const resolved = clientAlerts.filter((a) => a.status === "resolved").length;
    const total = clientAlerts.length;
    const score = total === 0 ? 100 : Math.round((resolved / total) * 100);
    return { client, score, total, resolved };
  });

  const alertCounts = {
    critical: alerts.filter(
      (a) => a.severity === "critical" && a.status === "active"
    ).length,
    warning: alerts.filter(
      (a) => a.severity === "warning" && a.status === "active"
    ).length,
    info: alerts.filter(
      (a) => a.severity === "info" && a.status === "active"
    ).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Compliance Monitoring
          </h1>
          <p className="text-muted mt-1">
            Track compliance deadlines, alerts, and client scores
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface border border-danger/20 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-danger/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-2xl font-bold text-danger">
                  {alertCounts.critical}
                </p>
                <p className="text-xs text-muted">Critical Alerts</p>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-warning/20 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {alertCounts.warning}
                </p>
                <p className="text-xs text-muted">Warnings</p>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {alertCounts.info}
                </p>
                <p className="text-xs text-muted">Info Notices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 mb-6 w-fit">
          {(
            [
              { key: "alerts", label: "Alerts", icon: AlertCircle },
              { key: "calendar", label: "Compliance Calendar", icon: Calendar },
              { key: "scores", label: "Client Scores", icon: Shield },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Alerts Tab */}
        {!loading && activeTab === "alerts" && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Filter className="w-4 h-4 text-muted" />
                </div>
                {(["all", "critical", "warning", "info"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors capitalize cursor-pointer ${
                      severityFilter === s
                        ? "bg-primary text-white"
                        : "bg-surface border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <div className="w-px bg-border" />
                {(["all", "active", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors capitalize cursor-pointer ${
                      statusFilter === s
                        ? "bg-primary text-white"
                        : "bg-surface border border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Cards */}
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-success mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  All clear
                </h3>
                <p className="text-muted">
                  No alerts match your current filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`bg-surface border rounded-xl p-5 transition-all ${
                      alert.status === "resolved"
                        ? "border-border opacity-60"
                        : alert.severity === "critical"
                          ? "border-danger/30"
                          : alert.severity === "warning"
                            ? "border-warning/30"
                            : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {alert.status === "resolved" ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          severityIcon(alert.severity)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">
                              {alert.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${severityBadge(alert.severity)}`}
                              >
                                {alert.severity}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(alert.status)}`}
                              >
                                {alert.status}
                              </span>
                              <span className="text-xs text-muted flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {alert.client.name}
                              </span>
                            </div>
                          </div>
                          {alert.status === "active" && (
                            <button
                              onClick={() => markResolved(alert.id)}
                              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                        {alert.description && (
                          <p className="text-sm text-muted mt-2">
                            {alert.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {formatDate(alert.createdAt)}
                          </span>
                          {alert.resolvedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved {formatDate(alert.resolvedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {!loading && activeTab === "calendar" && (
          <div>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-surface-alt">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Compliance Calendar - FY 2025-26
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Key regulatory deadlines for transfer pricing compliance
                </p>
              </div>
              <div className="divide-y divide-border">
                {COMPLIANCE_DEADLINES.sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                ).map((deadline, idx) => {
                  const days = daysUntil(deadline.date);
                  const isPast = days < 0;
                  const isUrgent = days >= 0 && days <= 30;

                  return (
                    <div
                      key={idx}
                      className="px-6 py-4 flex items-start gap-4 hover:bg-surface-alt/50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {severityIcon(deadline.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-medium text-foreground text-sm">
                              {deadline.title}
                            </h4>
                            <p className="text-xs text-muted mt-0.5">
                              {deadline.description}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-medium text-foreground">
                              {formatDate(deadline.date)}
                            </p>
                            <p
                              className={`text-xs font-medium ${
                                isPast
                                  ? "text-danger"
                                  : isUrgent
                                    ? "text-warning"
                                    : "text-muted"
                              }`}
                            >
                              {isPast
                                ? `${Math.abs(days)} days overdue`
                                : days === 0
                                  ? "Due today"
                                  : `${days} days left`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Scores Tab */}
        {!loading && activeTab === "scores" && (
          <div>
            {clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-12 h-12 text-muted mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No clients yet
                </h3>
                <p className="text-muted">
                  Add clients to see compliance scores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {clientScores.map(({ client, score, total, resolved }) => (
                  <div
                    key={client.id}
                    className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center text-center hover:shadow-md transition-all"
                  >
                    <ComplianceGauge score={score} />
                    <h3 className="font-semibold text-foreground mt-4 mb-1">
                      {client.name}
                    </h3>
                    <p className="text-xs text-muted mb-4">
                      {resolved} of {total} alerts resolved
                    </p>
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Compliance Score</span>
                        <span
                          className={`font-medium ${
                            score >= 80
                              ? "text-success"
                              : score >= 60
                                ? "text-warning"
                                : "text-danger"
                          }`}
                        >
                          {score >= 80
                            ? "Good"
                            : score >= 60
                              ? "Needs Attention"
                              : "At Risk"}
                        </span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            score >= 80
                              ? "bg-success"
                              : score >= 60
                                ? "bg-warning"
                                : "bg-danger"
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
