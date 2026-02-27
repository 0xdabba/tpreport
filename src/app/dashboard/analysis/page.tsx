"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  FileSearch,
  ArrowRightLeft,
  ClipboardList,
  Search,
  AlertCircle,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface EntityBrief {
  id: string;
  name: string;
  country: string;
}

interface TransactionBrief {
  fromEntity: EntityBrief;
  toEntity: EntityBrief;
  type: string;
  description: string | null;
  amount: number | null;
  currency: string;
  method: string | null;
}

interface Analysis {
  id: string;
  status: string;
  summary: string | null;
  functions: string | null;
  risks: string | null;
  assets: string | null;
  pricingMethod: string | null;
  clientId: string;
  client: { id: string; name: string };
  transactions: TransactionBrief[];
  createdAt: string;
  updatedAt: string;
}

interface EntityFull {
  id: string;
  name: string;
  country: string;
  entityType: string;
  role: string | null;
  functions: string | null;
  risks: string | null;
  assets: string | null;
  clientId: string;
  client: { id: string; name: string };
}

interface WizardTransaction {
  fromEntityId: string;
  toEntityId: string;
  type: string;
  description: string;
  amount: string;
  currency: string;
  method: string;
}

const TRANSACTION_TYPES = [
  "Services",
  "Licensing / Royalties",
  "Lending / Borrowing",
  "Goods / Tangible Property",
  "Cost Sharing",
  "Business Restructuring",
  "Guarantee",
  "Management Fees",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "JPY", "AUD"];

const METHODS = [
  { code: "CUP", name: "Comparable Uncontrolled Price" },
  { code: "TNMM", name: "Transactional Net Margin Method" },
  { code: "RPM", name: "Resale Price Method" },
  { code: "CPM", name: "Cost Plus Method" },
  { code: "PSM", name: "Profit Split Method" },
  { code: "Other", name: "Other Method" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  IN: "\ud83c\uddee\ud83c\uddf3",
  US: "\ud83c\uddfa\ud83c\uddf8",
  GB: "\ud83c\uddec\ud83c\udde7",
  SG: "\ud83c\uddf8\ud83c\uddec",
  AE: "\ud83c\udde6\ud83c\uddea",
  DE: "\ud83c\udde9\ud83c\uddea",
  NL: "\ud83c\uddf3\ud83c\uddf1",
  JP: "\ud83c\uddef\ud83c\uddf5",
  CN: "\ud83c\udde8\ud83c\uddf3",
  HK: "\ud83c\udded\ud83c\uddf0",
  AU: "\ud83c\udde6\ud83c\uddfa",
  CA: "\ud83c\udde8\ud83c\udde6",
  CH: "\ud83c\udde8\ud83c\udded",
  IE: "\ud83c\uddee\ud83c\uddea",
  MU: "\ud83c\uddf2\ud83c\uddfa",
  LU: "\ud83c\uddf1\ud83c\uddfa",
  MY: "\ud83c\uddf2\ud83c\uddfe",
  TH: "\ud83c\uddf9\ud83c\udded",
  KR: "\ud83c\uddf0\ud83c\uddf7",
  ZA: "\ud83c\uddff\ud83c\udde6",
};

function getFlag(code: string) {
  return COUNTRY_FLAGS[code] || "\ud83c\udff3\ufe0f";
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    draft: "bg-surface-alt text-muted",
    "in-progress": "bg-primary/10 text-primary",
    complete: "bg-success/10 text-success",
  };
  return styles[status] || styles.draft;
}

export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allEntities, setAllEntities] = useState<EntityFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Wizard state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<WizardTransaction[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [analysesRes, clientsRes, entitiesRes] = await Promise.all([
        fetch("/api/analysis"),
        fetch("/api/clients"),
        fetch("/api/entities"),
      ]);
      if (analysesRes.ok) setAnalyses(await analysesRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
      if (entitiesRes.ok) setAllEntities(await entitiesRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clientEntities = allEntities.filter(
    (e) => e.clientId === selectedClientId
  );
  const selectedEntities = allEntities.filter((e) =>
    selectedEntityIds.includes(e.id)
  );

  const addTransaction = () => {
    setTransactions((prev) => [
      ...prev,
      {
        fromEntityId: "",
        toEntityId: "",
        type: "",
        description: "",
        amount: "",
        currency: "INR",
        method: "TNMM",
      },
    ]);
  };

  const removeTransaction = (idx: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTransaction = (
    idx: number,
    field: keyof WizardTransaction,
    value: string
  ) => {
    setTransactions((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  };

  const generateSummary = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    const funcs = selectedEntities
      .filter((e) => e.functions)
      .map((e) => `${e.name}: ${e.functions}`)
      .join("; ");
    const risks = selectedEntities
      .filter((e) => e.risks)
      .map((e) => `${e.name}: ${e.risks}`)
      .join("; ");
    const assets = selectedEntities
      .filter((e) => e.assets)
      .map((e) => `${e.name}: ${e.assets}`)
      .join("; ");

    const txnSummary = transactions
      .map((t) => {
        const from = allEntities.find((e) => e.id === t.fromEntityId);
        const to = allEntities.find((e) => e.id === t.toEntityId);
        return `${t.type} from ${from?.name || "?"} to ${to?.name || "?"} (${t.currency} ${t.amount || "TBD"}, Method: ${t.method})`;
      })
      .join("; ");

    return {
      summary: `Functional analysis for ${client?.name || "Client"} covering ${selectedEntities.length} entities and ${transactions.length} international transactions. Methods applied include ${[...new Set(transactions.map((t) => t.method))].join(", ")}.`,
      functions: funcs || "To be documented",
      risks: risks || "To be documented",
      assets: assets || "To be documented",
      pricingMethod: [...new Set(transactions.map((t) => t.method))].join(
        ", "
      ),
      benchmarkData: txnSummary,
    };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const summary = generateSummary();
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          status: "draft",
          ...summary,
          transactions: transactions.map((t) => ({
            type: t.type,
            description: t.description,
            amount: t.amount ? parseFloat(t.amount) : null,
            currency: t.currency,
            method: t.method,
            fromEntityId: t.fromEntityId,
            toEntityId: t.toEntityId,
          })),
        }),
      });

      if (res.ok) {
        await fetchData();
        resetWizard();
      }
    } catch (error) {
      console.error("Failed to create analysis:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep(1);
    setSelectedClientId("");
    setSelectedEntityIds([]);
    setTransactions([]);
  };

  const toggleEntity = (id: string) => {
    setSelectedEntityIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filtered = analyses.filter(
    (a) =>
      a.client.name.toLowerCase().includes(search.toLowerCase()) ||
      a.status.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const canNext = () => {
    switch (wizardStep) {
      case 1:
        return !!selectedClientId;
      case 2:
        return selectedEntityIds.length >= 2;
      case 3:
        return (
          transactions.length > 0 &&
          transactions.every(
            (t) => t.fromEntityId && t.toEntityId && t.type && t.method
          )
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const STEPS = [
    "Select Client",
    "Select Entities",
    "Define Transactions",
    "Review Summary",
    "Confirm & Save",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Functional Analysis
            </h1>
            <p className="text-muted mt-1">
              Analyse transactions between related entities
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Analysis
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search analyses by client or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && analyses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <FileSearch className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No analyses yet
            </h3>
            <p className="text-muted mb-6 max-w-md">
              Create a functional analysis to document the functions,
              risks, assets, and pricing methods for intercompany transactions.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create First Analysis
            </button>
          </div>
        )}

        {/* Analyses List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((analysis) => (
              <div
                key={analysis.id}
                className="bg-surface border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {analysis.client.name}
                      </h3>
                      <p className="text-xs text-muted">
                        Created {formatDate(analysis.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusBadge(analysis.status)}`}
                  >
                    {analysis.status}
                  </span>
                </div>

                {analysis.summary && (
                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {analysis.summary}
                  </p>
                )}

                {analysis.transactions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Transactions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.transactions.map((txn, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs bg-surface-alt px-3 py-1.5 rounded-lg"
                        >
                          <span>
                            {getFlag(txn.fromEntity.country)}{" "}
                            {txn.fromEntity.name}
                          </span>
                          <ArrowRightLeft className="w-3 h-3 text-muted" />
                          <span>
                            {getFlag(txn.toEntity.country)}{" "}
                            {txn.toEntity.name}
                          </span>
                          <span className="text-muted">
                            ({txn.type})
                          </span>
                          {txn.method && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                              {txn.method}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.pricingMethod && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted">Methods: </span>
                    <span className="text-xs font-medium text-foreground">
                      {analysis.pricingMethod}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Step Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={resetWizard}
          />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-3xl border border-border max-h-[90vh] flex flex-col">
            {/* Wizard Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  New Functional Analysis
                </h2>
                <p className="text-sm text-muted">
                  Step {wizardStep} of 5 &mdash; {STEPS[wizardStep - 1]}
                </p>
              </div>
              <button
                onClick={resetWizard}
                className="p-2 hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-4">
              <div className="flex gap-2">
                {STEPS.map((step, idx) => (
                  <div key={step} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        idx + 1 <= wizardStep
                          ? "bg-primary"
                          : "bg-border"
                      }`}
                    />
                    <p
                      className={`text-xs mt-1 hidden sm:block ${
                        idx + 1 === wizardStep
                          ? "text-primary font-medium"
                          : "text-muted"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Wizard Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Client */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted mb-4">
                    Choose the client for this functional analysis.
                  </p>
                  {clients.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-warning mx-auto mb-2" />
                      <p className="text-sm text-muted">
                        No clients found. Add a client first.
                      </p>
                    </div>
                  ) : (
                    clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setSelectedEntityIds([]);
                          setTransactions([]);
                        }}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedClientId === client.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <span className="font-medium text-foreground">
                          {client.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Step 2: Select Entities */}
              {wizardStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted mb-4">
                    Select at least 2 entities involved in this analysis.
                  </p>
                  {clientEntities.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-warning mx-auto mb-2" />
                      <p className="text-sm text-muted">
                        No entities found for this client. Add entities first.
                      </p>
                    </div>
                  ) : (
                    clientEntities.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => toggleEntity(entity.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedEntityIds.includes(entity.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {getFlag(entity.country)}
                            </span>
                            <div>
                              <span className="font-medium text-foreground">
                                {entity.name}
                              </span>
                              <span className="text-xs text-muted ml-2">
                                {entity.entityType}
                              </span>
                            </div>
                          </div>
                          {selectedEntityIds.includes(entity.id) && (
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        {entity.role && (
                          <p className="text-xs text-muted mt-1 ml-8">
                            {entity.role}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Step 3: Define Transactions */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted">
                      Define the intercompany transactions between selected
                      entities.
                    </p>
                    <button
                      onClick={addTransaction}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Transaction
                    </button>
                  </div>

                  {transactions.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                      <ArrowRightLeft className="w-8 h-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted mb-3">
                        No transactions defined yet.
                      </p>
                      <button
                        onClick={addTransaction}
                        className="text-sm text-primary hover:text-primary-dark font-medium cursor-pointer"
                      >
                        Add your first transaction
                      </button>
                    </div>
                  )}

                  {transactions.map((txn, idx) => (
                    <div
                      key={idx}
                      className="bg-surface-alt border border-border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          Transaction {idx + 1}
                        </span>
                        <button
                          onClick={() => removeTransaction(idx)}
                          className="p-1 hover:bg-surface rounded text-muted hover:text-danger transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            From Entity
                          </label>
                          <select
                            value={txn.fromEntityId}
                            onChange={(e) =>
                              updateTransaction(
                                idx,
                                "fromEntityId",
                                e.target.value
                              )
                            }
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            <option value="">Select entity</option>
                            {selectedEntities.map((e) => (
                              <option key={e.id} value={e.id}>
                                {getFlag(e.country)} {e.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            To Entity
                          </label>
                          <select
                            value={txn.toEntityId}
                            onChange={(e) =>
                              updateTransaction(
                                idx,
                                "toEntityId",
                                e.target.value
                              )
                            }
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            <option value="">Select entity</option>
                            {selectedEntities.map((e) => (
                              <option key={e.id} value={e.id}>
                                {getFlag(e.country)} {e.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Transaction Type
                          </label>
                          <select
                            value={txn.type}
                            onChange={(e) =>
                              updateTransaction(idx, "type", e.target.value)
                            }
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            <option value="">Select type</option>
                            {TRANSACTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            TP Method
                          </label>
                          <select
                            value={txn.method}
                            onChange={(e) =>
                              updateTransaction(idx, "method", e.target.value)
                            }
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            <option value="">Select method</option>
                            {METHODS.map((m) => (
                              <option key={m.code} value={m.code}>
                                {m.code} - {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={txn.amount}
                            onChange={(e) =>
                              updateTransaction(idx, "amount", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Currency
                          </label>
                          <select
                            value={txn.currency}
                            onChange={(e) =>
                              updateTransaction(
                                idx,
                                "currency",
                                e.target.value
                              )
                            }
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={txn.description}
                            onChange={(e) =>
                              updateTransaction(
                                idx,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Optional description"
                            className="w-full px-2.5 py-2 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Review Summary */}
              {wizardStep === 4 && (
                <div className="space-y-5">
                  <p className="text-sm text-muted">
                    Review the auto-generated functional analysis summary.
                  </p>

                  {(() => {
                    const summary = generateSummary();
                    return (
                      <div className="space-y-4">
                        <div className="bg-surface-alt rounded-lg p-4">
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                            Summary
                          </h4>
                          <p className="text-sm text-foreground">
                            {summary.summary}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-surface-alt rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                              Functions
                            </h4>
                            <p className="text-sm text-muted">
                              {summary.functions}
                            </p>
                          </div>
                          <div className="bg-surface-alt rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                              Risks
                            </h4>
                            <p className="text-sm text-muted">
                              {summary.risks}
                            </p>
                          </div>
                          <div className="bg-surface-alt rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                              Assets
                            </h4>
                            <p className="text-sm text-muted">
                              {summary.assets}
                            </p>
                          </div>
                        </div>

                        <div className="bg-surface-alt rounded-lg p-4">
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                            Pricing Methods
                          </h4>
                          <p className="text-sm text-foreground">
                            {summary.pricingMethod || "Not specified"}
                          </p>
                        </div>

                        <div className="bg-surface-alt rounded-lg p-4">
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                            Transactions Overview
                          </h4>
                          <p className="text-sm text-muted">
                            {summary.benchmarkData || "No transactions"}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Step 5: Confirm */}
              {wizardStep === 5 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Ready to Save
                  </h3>
                  <p className="text-sm text-muted max-w-md mx-auto mb-6">
                    Your functional analysis for{" "}
                    <strong>
                      {clients.find((c) => c.id === selectedClientId)?.name}
                    </strong>{" "}
                    with {transactions.length} transaction(s) is ready. It will
                    be saved as a draft.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 text-sm">
                    <span className="px-3 py-1.5 bg-surface-alt rounded-full text-muted">
                      {selectedEntities.length} entities
                    </span>
                    <span className="px-3 py-1.5 bg-surface-alt rounded-full text-muted">
                      {transactions.length} transactions
                    </span>
                    <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full font-medium">
                      Draft
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="flex items-center justify-between p-6 border-t border-border">
              <button
                onClick={() =>
                  wizardStep === 1
                    ? resetWizard()
                    : setWizardStep((s) => s - 1)
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-foreground hover:bg-surface-alt transition-colors font-medium cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                {wizardStep === 1 ? "Cancel" : "Back"}
              </button>

              {wizardStep < 5 ? (
                <button
                  onClick={() => setWizardStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-success text-white rounded-lg hover:bg-success/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Saving..." : "Save Analysis"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
