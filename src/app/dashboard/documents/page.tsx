"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  X,
  Loader2,
  FileText,
  Download,
  Calendar,
  Building2,
  Filter,
  File,
  FileCheck,
  FilePen,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  status: string;
  content: string | null;
  clientId: string;
  client: { id: string; name: string };
  analysis: { id: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

const DOCUMENT_TYPES = [
  {
    value: "tp-study",
    label: "Transfer Pricing Study Report",
    icon: FileText,
    description: "Comprehensive TP study per Sections 92-92F",
  },
  {
    value: "local-file",
    label: "Local File (Form 3CEB)",
    icon: FileCheck,
    description: "Form 3CEB compatible local file documentation",
  },
  {
    value: "master-file",
    label: "Master File",
    icon: File,
    description: "Master file per Rule 10DA requirements",
  },
  {
    value: "agreement-services",
    label: "Intragroup Agreement - Services",
    icon: FilePen,
    description: "Service agreement between associated enterprises",
  },
  {
    value: "agreement-licensing",
    label: "Intragroup Agreement - Licensing",
    icon: FilePen,
    description: "License/royalty agreement for IP usage",
  },
  {
    value: "agreement-lending",
    label: "Intragroup Agreement - Lending",
    icon: FilePen,
    description: "Intercompany loan agreement",
  },
  {
    value: "benchmarking",
    label: "Benchmarking Report",
    icon: FileText,
    description: "Comparable analysis and benchmarking study",
  },
];

function getDocTypeLabel(type: string) {
  return DOCUMENT_TYPES.find((d) => d.value === type)?.label || type;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: "bg-surface-alt text-muted",
    review: "bg-warning/10 text-warning",
    final: "bg-success/10 text-success",
  };
  return styles[status] || styles.draft;
}

function statusIcon(status: string) {
  switch (status) {
    case "final":
      return <FileCheck className="w-4 h-4" />;
    case "review":
      return <FilePen className="w-4 h-4" />;
    default:
      return <File className="w-4 h-4" />;
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    clientId: "",
    name: "",
    financialYear: "2025-26",
  });

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, clientsRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/clients"),
      ]);
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const docType = DOCUMENT_TYPES.find((d) => d.value === formData.type);
      const client = clients.find((c) => c.id === formData.clientId);
      const name =
        formData.name ||
        `${docType?.label || formData.type} - ${client?.name || "Client"} - FY ${formData.financialYear}`;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name,
        }),
      });
      if (res.ok) {
        await fetchData();
        setShowModal(false);
        setFormData({ type: "", clientId: "", name: "", financialYear: "2025-26" });
      }
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (doc: Document) => {
    if (!doc.content) return;
    const blob = new Blob([doc.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${doc.name.replace(/[^a-zA-Z0-9\-_ ]/g, "")}.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = documents.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.client.name.toLowerCase().includes(search.toLowerCase()) ||
      getDocTypeLabel(d.type).toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const counts = {
    all: documents.length,
    draft: documents.filter((d) => d.status === "draft").length,
    review: documents.filter((d) => d.status === "review").length,
    final: documents.filter((d) => d.status === "final").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Document Generation
            </h1>
            <p className="text-muted mt-1">
              Generate and manage TP documentation
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Generate Document
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            {(["all", "draft", "review", "final"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors capitalize cursor-pointer ${
                  statusFilter === s
                    ? "bg-primary text-white"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                {s} ({counts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No documents yet
            </h3>
            <p className="text-muted mb-6 max-w-md">
              Generate transfer pricing documentation including study reports,
              Form 3CEB local files, master files, and intragroup agreements.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Generate First Document
            </button>
          </div>
        )}

        {/* Documents Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {statusIcon(doc.status)}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge(doc.status)}`}
                  >
                    {doc.status}
                  </span>
                </div>

                <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">
                  {doc.name}
                </h3>
                <p className="text-xs text-muted mb-3">
                  {getDocTypeLabel(doc.type)}
                </p>

                <div className="flex items-center gap-3 text-xs text-muted mb-4 mt-auto">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {doc.client.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(doc.createdAt)}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(doc)}
                  disabled={!doc.content}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm font-medium text-foreground hover:bg-border/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && documents.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-muted mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No results found
            </h3>
            <p className="text-muted">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Generate Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-surface rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Generate Document
                  </h2>
                  <p className="text-sm text-muted">
                    Select type and client to generate TP documentation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Document Type <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {DOCUMENT_TYPES.map((docType) => {
                    const Icon = docType.icon;
                    return (
                      <button
                        key={docType.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            type: docType.value,
                          }))
                        }
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-3 cursor-pointer ${
                          formData.type === docType.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            formData.type === docType.value
                              ? "text-primary"
                              : "text-muted"
                          }`}
                        />
                        <div>
                          <span className="font-medium text-sm text-foreground block">
                            {docType.label}
                          </span>
                          <span className="text-xs text-muted">
                            {docType.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Client <span className="text-danger">*</span>
                </label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Financial Year */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Financial Year
                </label>
                <select
                  value={formData.financialYear}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      financialYear: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="2025-26">FY 2025-26</option>
                  <option value="2024-25">FY 2024-25</option>
                  <option value="2023-24">FY 2023-24</option>
                  <option value="2022-23">FY 2022-23</option>
                </select>
              </div>

              {/* Custom Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Document Name{" "}
                  <span className="text-xs text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Auto-generated if left blank"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground hover:bg-surface-alt transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.type || !formData.clientId}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Generating..." : "Generate Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
