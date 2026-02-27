"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Download,
  RefreshCw,
  Check,
  Edit3,
  Save,
  X,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2,
  AlertCircle,
} from "lucide-react";

interface DocumentData {
  id: string;
  name: string;
  type: string;
  status: string;
  content: string | null;
  client: { id: string; name: string; industry: string | null };
  analysis: { id: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  title: string;
}

const SECTION_DEFS: Record<string, Section[]> = {
  "tp-study": [
    { id: "executive-summary", title: "Executive Summary" },
    { id: "industry-overview", title: "Industry Overview" },
    { id: "company-overview", title: "Company Overview" },
    { id: "associated-enterprises", title: "Overview of Associated Enterprises" },
    { id: "international-transactions", title: "International Transactions" },
    { id: "functional-analysis", title: "Functional Analysis" },
    { id: "economic-analysis", title: "Economic Analysis" },
    { id: "alp-determination", title: "Determination of Arm's Length Price" },
    { id: "conclusion", title: "Conclusion" },
  ],
  "local-file": [
    { id: "part-a", title: "Part A: Particulars of the Person" },
    { id: "part-b", title: "Part B: International Transactions" },
    { id: "part-c", title: "Part C: Specified Domestic Transactions" },
    { id: "part-d", title: "Part D: Additional Information" },
    { id: "certification", title: "Certification under Section 92E" },
  ],
  "master-file": [
    { id: "org-structure", title: "Part A: Organisational Structure" },
    { id: "business-description", title: "Part B: MNE Group Business" },
    { id: "intangibles", title: "Part C: Intangibles" },
    { id: "financial-activities", title: "Part D: Financial Activities" },
    { id: "financial-tax", title: "Part E: Financial and Tax Positions" },
  ],
  "agreement-services": [
    { id: "recitals", title: "Recitals and Parties" },
    { id: "scope", title: "Scope of Services" },
    { id: "compensation", title: "Compensation and Payment Terms" },
    { id: "tp-compliance", title: "Transfer Pricing Compliance" },
    { id: "general-terms", title: "General Terms and Execution" },
  ],
  "agreement-licensing": [
    { id: "recitals", title: "Recitals and Parties" },
    { id: "grant", title: "Grant of License" },
    { id: "royalty", title: "Royalty and Payment" },
    { id: "tp-compliance", title: "Transfer Pricing and Withholding Tax" },
    { id: "general-terms", title: "General Terms and Execution" },
  ],
  "agreement-lending": [
    { id: "recitals", title: "Recitals and Parties" },
    { id: "loan-terms", title: "Loan Amount, Interest and Repayment" },
    { id: "tp-compliance", title: "Transfer Pricing and Thin Capitalisation" },
    { id: "security", title: "Security and Covenants" },
    { id: "general-terms", title: "General Terms and Execution" },
  ],
  benchmarking: [
    { id: "executive-summary", title: "Executive Summary" },
    { id: "tested-party", title: "Tested Party Selection" },
    { id: "method-selection", title: "Most Appropriate Method" },
    { id: "search-process", title: "Benchmarking Search Process" },
    { id: "comparable-set", title: "Comparable Set and Results" },
    { id: "alp-range", title: "Arm's Length Range and Conclusion" },
  ],
};

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionContent, setEditingSectionContent] = useState("");

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setDoc(data);
        // Parse sections from content
        if (data.content) {
          parseSections(data.content, data.type);
        }
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Parse existing document content into sections by splitting on numbered headings
  function parseSections(content: string, docType: string) {
    const sections = SECTION_DEFS[docType] || [];
    const parsed: Record<string, string> = {};

    if (sections.length === 0) {
      parsed["full"] = content;
      setSectionContents(parsed);
      return;
    }

    // Try to split content by section titles
    for (let i = 0; i < sections.length; i++) {
      const current = sections[i];
      const next = sections[i + 1];

      // Build regex patterns to find section boundaries
      const titlePattern = current.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const startRegex = new RegExp(
        `(?:^|\\n)\\s*\\d+\\.\\s*${titlePattern}\\s*\\n[-=]*\\n?`,
        "i"
      );
      const startMatch = content.match(startRegex);

      if (startMatch && startMatch.index !== undefined) {
        const startIdx = startMatch.index + startMatch[0].length;
        let endIdx = content.length;

        if (next) {
          const nextTitlePattern = next.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const endRegex = new RegExp(
            `\\n\\s*\\d+\\.\\s*${nextTitlePattern}`,
            "i"
          );
          const endMatch = content.substring(startIdx).match(endRegex);
          if (endMatch && endMatch.index !== undefined) {
            endIdx = startIdx + endMatch.index;
          }
        }

        parsed[current.id] = content.substring(startIdx, endIdx).trim();
      }
    }

    // If parsing failed (no sections found), store as full content
    if (Object.keys(parsed).length === 0) {
      parsed["full"] = content;
    }

    setSectionContents(parsed);
    // Expand all sections that have content
    setExpandedSections(new Set(Object.keys(parsed)));
  }

  const handleRegenerateSection = async (sectionId: string) => {
    setRegeneratingSection(sectionId);
    try {
      const res = await fetch(`/api/documents/${docId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSectionContents((prev) => ({
          ...prev,
          [sectionId]: data.content,
        }));
        // Rebuild full document from sections and save
        await rebuildAndSave({ ...sectionContents, [sectionId]: data.content });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to regenerate section");
      }
    } catch (error) {
      console.error("Regeneration failed:", error);
      alert("Failed to regenerate section. Check your API key configuration.");
    } finally {
      setRegeneratingSection(null);
    }
  };

  const handleSaveSection = async (sectionId: string) => {
    const updated = { ...sectionContents, [sectionId]: editingSectionContent };
    setSectionContents(updated);
    setEditingSectionId(null);
    await rebuildAndSave(updated);
  };

  async function rebuildAndSave(sections: Record<string, string>) {
    setSaving(true);
    try {
      const docSections = SECTION_DEFS[doc?.type || ""] || [];
      let fullContent = "";

      if (sections["full"]) {
        fullContent = sections["full"];
      } else {
        const header = doc?.content?.split("=".repeat(50))?.[0] || "";
        fullContent = header
          ? header + "=".repeat(50) + "\n\n"
          : "";

        docSections.forEach((s, i) => {
          if (sections[s.id]) {
            fullContent += `${i + 1}. ${s.title}\n${"-".repeat(s.title.length + 4)}\n\n${sections[s.id]}\n\n\n`;
          }
        });
      }

      await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullContent }),
      });

      setDoc((prev) => (prev ? { ...prev, content: fullContent } : prev));
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDoc((prev) =>
          prev ? { ...prev, status: updated.status } : prev
        );
      }
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!doc?.content) return;
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

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-muted" />
        <p className="text-muted">Document not found</p>
        <button
          onClick={() => router.push("/dashboard/documents")}
          className="text-primary hover:underline cursor-pointer"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  const sections = SECTION_DEFS[doc.type] || [];
  const hasSections = sections.length > 0 && !sectionContents["full"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard/documents")}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{doc.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted">
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {doc.client.name}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(doc.updatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status selector */}
              <select
                value={doc.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="final">Final</option>
              </select>

              <button
                onClick={handleDownload}
                disabled={!doc.content}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-foreground hover:bg-surface-alt transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              {saving && (
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Generation Badge */}
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-6">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-medium">AI-Powered Document.</span>{" "}
            Each section can be individually regenerated or manually edited.
            Click any section to expand, edit, or regenerate with Claude.
          </p>
        </div>

        {/* Section-by-Section View */}
        {hasSections ? (
          <div className="space-y-3">
            {sections.map((section, idx) => {
              const content = sectionContents[section.id];
              const isExpanded = expandedSections.has(section.id);
              const isEditing = editingSectionId === section.id;
              const isRegenerating = regeneratingSection === section.id;

              return (
                <div
                  key={section.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-alt/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground text-sm">
                        {section.title}
                      </span>
                      {content && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                      {!content && (
                        <span className="text-xs text-muted bg-surface-alt px-2 py-0.5 rounded">
                          Not generated
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Action Bar */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-surface-alt/30 border-b border-border">
                        <button
                          onClick={() => handleRegenerateSection(section.id)}
                          disabled={isRegenerating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isRegenerating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          {isRegenerating ? "Regenerating..." : "Regenerate with AI"}
                        </button>

                        {!isEditing && content && (
                          <button
                            onClick={() => {
                              setEditingSectionId(section.id);
                              setEditingSectionContent(content);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border text-foreground rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Manually
                          </button>
                        )}

                        {isEditing && (
                          <>
                            <button
                              onClick={() => handleSaveSection(section.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSectionId(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border text-muted rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {isRegenerating && (
                          <div className="flex items-center gap-3 py-8 justify-center">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            <span className="text-sm text-muted">
                              Generating with Claude AI...
                            </span>
                          </div>
                        )}

                        {!isRegenerating && isEditing && (
                          <textarea
                            value={editingSectionContent}
                            onChange={(e) =>
                              setEditingSectionContent(e.target.value)
                            }
                            className="w-full min-h-[300px] p-3 bg-background border border-border rounded-lg text-sm text-foreground font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                          />
                        )}

                        {!isRegenerating && !isEditing && content && (
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed bg-transparent p-0 m-0 border-0">
                              {content}
                            </pre>
                          </div>
                        )}

                        {!isRegenerating && !isEditing && !content && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <FileText className="w-8 h-8 text-muted mb-2" />
                            <p className="text-sm text-muted mb-3">
                              This section hasn&apos;t been generated yet.
                            </p>
                            <button
                              onClick={() =>
                                handleRegenerateSection(section.id)
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                              Generate with AI
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Full content view for unsectioned documents */
          <div className="bg-surface border border-border rounded-xl p-6">
            {editingContent !== null ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">
                    Editing Document
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSaving(true);
                        await fetch(`/api/documents/${docId}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ content: editingContent }),
                        });
                        setDoc((prev) =>
                          prev
                            ? { ...prev, content: editingContent }
                            : prev
                        );
                        setEditingContent(null);
                        setSaving(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingContent(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-surface-alt cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full min-h-[600px] p-4 bg-background border border-border rounded-lg text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={() => setEditingContent(doc.content || "")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-surface-alt cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {doc.content || "No content generated yet."}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
