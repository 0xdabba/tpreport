"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  X,
  Loader2,
  Building,
  ChevronRight,
  ChevronDown,
  Globe,
  DollarSign,
  Users as UsersIcon,
  GitBranch,
  Landmark,
  ArrowDownRight,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface ChildEntity {
  id: string;
  name: string;
  country: string;
  entityType: string;
}

interface Entity {
  id: string;
  name: string;
  country: string;
  entityType: string;
  role: string | null;
  functions: string | null;
  risks: string | null;
  assets: string | null;
  revenue: number | null;
  expenses: number | null;
  employees: number | null;
  clientId: string;
  parentId: string | null;
  createdAt: string;
  client: { id: string; name: string };
  parent: { id: string; name: string } | null;
  children: ChildEntity[];
}

const COUNTRIES = [
  { code: "IN", name: "India", flag: "\ud83c\uddee\ud83c\uddf3" },
  { code: "US", name: "United States", flag: "\ud83c\uddfa\ud83c\uddf8" },
  { code: "GB", name: "United Kingdom", flag: "\ud83c\uddec\ud83c\udde7" },
  { code: "SG", name: "Singapore", flag: "\ud83c\uddf8\ud83c\uddec" },
  { code: "AE", name: "UAE", flag: "\ud83c\udde6\ud83c\uddea" },
  { code: "DE", name: "Germany", flag: "\ud83c\udde9\ud83c\uddea" },
  { code: "NL", name: "Netherlands", flag: "\ud83c\uddf3\ud83c\uddf1" },
  { code: "JP", name: "Japan", flag: "\ud83c\uddef\ud83c\uddf5" },
  { code: "CN", name: "China", flag: "\ud83c\udde8\ud83c\uddf3" },
  { code: "HK", name: "Hong Kong", flag: "\ud83c\udded\ud83c\uddf0" },
  { code: "AU", name: "Australia", flag: "\ud83c\udde6\ud83c\uddfa" },
  { code: "CA", name: "Canada", flag: "\ud83c\udde8\ud83c\udde6" },
  { code: "CH", name: "Switzerland", flag: "\ud83c\udde8\ud83c\udded" },
  { code: "IE", name: "Ireland", flag: "\ud83c\uddee\ud83c\uddea" },
  { code: "MU", name: "Mauritius", flag: "\ud83c\uddf2\ud83c\uddfa" },
  { code: "LU", name: "Luxembourg", flag: "\ud83c\uddf1\ud83c\uddfa" },
  { code: "MY", name: "Malaysia", flag: "\ud83c\uddf2\ud83c\uddfe" },
  { code: "TH", name: "Thailand", flag: "\ud83c\uddf9\ud83c\udded" },
  { code: "KR", name: "South Korea", flag: "\ud83c\uddf0\ud83c\uddf7" },
  { code: "ZA", name: "South Africa", flag: "\ud83c\uddff\ud83c\udde6" },
];

const ENTITY_TYPES = [
  "Private Limited",
  "Public Limited",
  "LLP",
  "Branch",
  "Subsidiary",
  "Joint Venture",
  "Partnership Firm",
  "Proprietorship",
  "Holding Company",
  "SPV",
];

const ROLES = [
  "Full-fledged manufacturer",
  "Contract manufacturer",
  "Toll manufacturer",
  "Full-risk distributor",
  "Limited-risk distributor",
  "Commissionaire",
  "Service provider",
  "Contract R&D provider",
  "IP owner",
  "Financing entity",
  "Principal entity",
  "Headquarters",
  "Regional headquarters",
];

function getCountryFlag(countryCode: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country ? country.flag : "\ud83c\udff3\ufe0f";
}

function getCountryName(countryCode: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country ? country.name : countryCode;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return "--";
  if (amount >= 10000000) {
    return `\u20b9${(amount / 10000000).toFixed(1)} Cr`;
  }
  if (amount >= 100000) {
    return `\u20b9${(amount / 100000).toFixed(1)} L`;
  }
  return `\u20b9${amount.toLocaleString("en-IN")}`;
}

// Entity Tree Node Component
function EntityTreeNode({
  entity,
  allEntities,
  depth = 0,
}: {
  entity: Entity;
  allEntities: Entity[];
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allEntities.filter((e) => e.parentId === entity.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-surface-alt rounded-lg cursor-pointer transition-colors group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
          )
        ) : (
          <ArrowDownRight className="w-4 h-4 text-border flex-shrink-0" />
        )}

        <span className="text-lg flex-shrink-0">
          {getCountryFlag(entity.country)}
        </span>

        <span className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
          {entity.name}
        </span>

        <span className="text-xs px-2 py-0.5 bg-surface-alt text-muted rounded-full">
          {entity.entityType}
        </span>

        {entity.role && (
          <span className="text-xs text-muted hidden sm:inline">
            &middot; {entity.role}
          </span>
        )}
      </div>

      {expanded &&
        children.map((child) => (
          <EntityTreeNode
            key={child.id}
            entity={child}
            allEntities={allEntities}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"grouped" | "tree">("grouped");
  const [formData, setFormData] = useState({
    name: "",
    country: "IN",
    entityType: "",
    role: "",
    functions: "",
    risks: "",
    assets: "",
    revenue: "",
    expenses: "",
    employees: "",
    parentId: "",
    clientId: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [entitiesRes, clientsRes] = await Promise.all([
        fetch("/api/entities"),
        fetch("/api/clients"),
      ]);
      if (entitiesRes.ok) {
        const data = await entitiesRes.json();
        setEntities(data);
      }
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchData();
        setShowModal(false);
        setFormData({
          name: "",
          country: "IN",
          entityType: "",
          role: "",
          functions: "",
          risks: "",
          assets: "",
          revenue: "",
          expenses: "",
          employees: "",
          parentId: "",
          clientId: "",
        });
      }
    } catch (error) {
      console.error("Failed to create entity:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      getCountryName(e.country)
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      e.entityType.toLowerCase().includes(search.toLowerCase())
  );

  // Group entities by client
  const grouped = filtered.reduce(
    (acc, entity) => {
      const clientName = entity.client.name;
      if (!acc[clientName]) acc[clientName] = [];
      acc[clientName].push(entity);
      return acc;
    },
    {} as Record<string, Entity[]>
  );

  // For tree view, get root entities (no parent) per client
  const rootEntitiesByClient = Object.entries(grouped).reduce(
    (acc, [clientName, ents]) => {
      acc[clientName] = ents.filter((e) => !e.parentId);
      return acc;
    },
    {} as Record<string, Entity[]>
  );

  const entitiesForClient = formData.clientId
    ? entities.filter((e) => e.clientId === formData.clientId)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Entity Management
            </h1>
            <p className="text-muted mt-1">
              Manage entities across your clients
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Entity
          </button>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search entities by name, country, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
          </div>
          <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Building className="w-4 h-4 inline-block mr-1.5" />
              Grouped
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                viewMode === "tree"
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <GitBranch className="w-4 h-4 inline-block mr-1.5" />
              Tree
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && entities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <Landmark className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No entities yet
            </h3>
            <p className="text-muted mb-6 max-w-md">
              Add entities to represent the legal entities in your clients
              group structure.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add First Entity
            </button>
          </div>
        )}

        {/* Tree View */}
        {!loading && viewMode === "tree" && Object.keys(grouped).length > 0 && (
          <div className="space-y-6">
            {Object.entries(rootEntitiesByClient).map(
              ([clientName, rootEntities]) => (
                <div
                  key={clientName}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-border bg-surface-alt">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary" />
                      {clientName}
                    </h3>
                  </div>
                  <div className="p-3">
                    {rootEntities.map((entity) => (
                      <EntityTreeNode
                        key={entity.id}
                        entity={entity}
                        allEntities={filtered}
                      />
                    ))}
                    {rootEntities.length === 0 && (
                      <p className="text-sm text-muted p-4 text-center">
                        No root entities found. All entities have parent
                        entities assigned.
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Grouped View */}
        {!loading &&
          viewMode === "grouped" &&
          Object.keys(grouped).length > 0 && (
            <div className="space-y-8">
              {Object.entries(grouped).map(([clientName, clientEntities]) => (
                <div key={clientName}>
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {clientName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-surface-alt text-muted rounded-full">
                      {clientEntities.length}{" "}
                      {clientEntities.length === 1 ? "entity" : "entities"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientEntities.map((entity) => (
                      <div
                        key={entity.id}
                        className="bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {getCountryFlag(entity.country)}
                            </span>
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">
                                {entity.name}
                              </h4>
                              <p className="text-xs text-muted">
                                {getCountryName(entity.country)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                            {entity.entityType}
                          </span>
                        </div>

                        {entity.role && (
                          <p className="text-xs text-muted mb-3 bg-surface-alt px-2 py-1 rounded">
                            {entity.role}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <DollarSign className="w-3.5 h-3.5" />
                            <div>
                              <span className="block text-foreground font-medium">
                                {formatCurrency(entity.revenue)}
                              </span>
                              <span>Revenue</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <DollarSign className="w-3.5 h-3.5" />
                            <div>
                              <span className="block text-foreground font-medium">
                                {formatCurrency(entity.expenses)}
                              </span>
                              <span>Expenses</span>
                            </div>
                          </div>
                        </div>

                        {(entity.employees !== null || entity.parent) && (
                          <div className="flex items-center gap-4 pt-3 mt-3 border-t border-border text-xs text-muted">
                            {entity.employees !== null && (
                              <div className="flex items-center gap-1">
                                <UsersIcon className="w-3.5 h-3.5" />
                                <span>{entity.employees} employees</span>
                              </div>
                            )}
                            {entity.parent && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" />
                                <span>Parent: {entity.parent.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Add Entity Modal */}
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
                  <Landmark className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Add New Entity
                  </h2>
                  <p className="text-sm text-muted">
                    Add a legal entity to a client group
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
              {/* Client Selection */}
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
                      parentId: "",
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entity Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Entity Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Reliance Jio Infocomm Ltd."
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Country <span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entity Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Entity Type <span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={formData.entityType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        entityType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  >
                    <option value="">Select type</option>
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  >
                    <option value="">Select role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Functional Profile */}
              <div className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Functional Profile
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Functions Performed
                    </label>
                    <textarea
                      value={formData.functions}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          functions: e.target.value,
                        }))
                      }
                      placeholder="e.g., Manufacturing, R&D, Distribution, Marketing..."
                      rows={2}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Risks Assumed
                    </label>
                    <textarea
                      value={formData.risks}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          risks: e.target.value,
                        }))
                      }
                      placeholder="e.g., Market risk, Credit risk, Foreign exchange risk..."
                      rows={2}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Assets Employed
                    </label>
                    <textarea
                      value={formData.assets}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          assets: e.target.value,
                        }))
                      }
                      placeholder="e.g., Manufacturing plant, IP portfolio, Warehouse..."
                      rows={2}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Financial Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Revenue (INR)
                    </label>
                    <input
                      type="number"
                      value={formData.revenue}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          revenue: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Expenses (INR)
                    </label>
                    <input
                      type="number"
                      value={formData.expenses}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expenses: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Employees
                    </label>
                    <input
                      type="number"
                      value={formData.employees}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          employees: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Parent Entity */}
              <div className="border-t border-border pt-5">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Parent Entity
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      parentId: e.target.value,
                    }))
                  }
                  disabled={!formData.clientId}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50"
                >
                  <option value="">None (Root entity)</option>
                  {entitiesForClient.map((e) => (
                    <option key={e.id} value={e.id}>
                      {getCountryFlag(e.country)} {e.name}
                    </option>
                  ))}
                </select>
                {!formData.clientId && (
                  <p className="text-xs text-muted mt-1">
                    Select a client first to see available parent entities
                  </p>
                )}
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
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Creating..." : "Create Entity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
