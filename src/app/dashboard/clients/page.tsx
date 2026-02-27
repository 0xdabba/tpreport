"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Building2,
  X,
  Loader2,
  Users,
  Calendar,
  Briefcase,
  FolderOpen,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    entities: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    description: "",
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const handler = () => setMenuOpenId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({ name: "", industry: "", description: "" });
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      industry: client.industry || "",
      description: client.description || "",
    });
    setShowModal(true);
    setMenuOpenId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClient) {
        const res = await fetch(`/api/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const { client: updated } = await res.json();
          setClients((prev) =>
            prev.map((c) =>
              c.id === editingClient.id
                ? { ...c, ...updated, _count: updated._count || c._count }
                : c
            )
          );
          setShowModal(false);
          setEditingClient(null);
        }
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const newClient = await res.json();
          setClients((prev) => [newClient, ...prev]);
          setShowModal(false);
        }
      }
      setFormData({ name: "", industry: "", description: "" });
    } catch (error) {
      console.error("Failed to save client:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm("Delete this client? All associated entities, analyses, documents, and alerts will be permanently removed.")) {
      return;
    }
    setDeletingId(clientId);
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const industries = [
    "Information Technology",
    "Pharmaceuticals",
    "Manufacturing",
    "Financial Services",
    "Automotive",
    "Textiles",
    "FMCG",
    "E-Commerce",
    "Telecommunications",
    "Energy",
    "Real Estate",
    "Healthcare",
    "Consulting",
    "Logistics",
    "Other",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted mt-1">
              Manage your transfer pricing clients
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search clients by name or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No clients yet
            </h3>
            <p className="text-muted mb-6 max-w-md">
              Start by adding your first client to manage their transfer pricing
              documentation and compliance.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Your First Client
            </button>
          </div>
        )}

        {!loading && clients.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-muted mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No results found
            </h3>
            <p className="text-muted">
              No clients match &quot;{search}&quot;. Try a different search term.
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((client) => (
              <div
                key={client.id}
                className={`bg-surface border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all group relative ${
                  deletingId === client.id ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === client.id ? null : client.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4 text-muted" />
                  </button>

                  {menuOpenId === client.id && (
                    <div
                      className="absolute right-0 top-8 w-40 bg-surface border border-border rounded-lg shadow-lg z-10 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEditModal(client)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Client
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Client
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs px-2.5 py-1 bg-surface-alt text-muted rounded-full font-medium">
                    {client._count.entities}{" "}
                    {client._count.entities === 1 ? "entity" : "entities"}
                  </span>
                </div>

                <h3
                  className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors cursor-pointer"
                  onClick={() => openEditModal(client)}
                >
                  {client.name}
                </h3>

                {client.industry && (
                  <div className="flex items-center gap-1.5 text-sm text-muted mb-3">
                    <Briefcase className="w-3.5 h-3.5" />
                    {client.industry}
                  </div>
                )}

                {client.description && (
                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {client.description}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{client._count.entities} entities</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(client.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowModal(false);
              setEditingClient(null);
            }}
          />
          <div className="relative bg-surface rounded-xl shadow-xl w-full max-w-lg border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  {editingClient ? (
                    <Pencil className="w-5 h-5 text-primary" />
                  ) : (
                    <FolderOpen className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingClient ? "Edit Client" : "Add New Client"}
                  </h2>
                  <p className="text-sm text-muted">
                    {editingClient
                      ? "Update client details"
                      : "Create a new transfer pricing client"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingClient(null);
                }}
                className="p-2 hover:bg-surface-alt rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Client Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Reliance Industries Ltd."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      industry: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="">Select industry</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of the client and their TP needs..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                  }}
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
                  {submitting
                    ? editingClient
                      ? "Saving..."
                      : "Creating..."
                    : editingClient
                      ? "Save Changes"
                      : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
