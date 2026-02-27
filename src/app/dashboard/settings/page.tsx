"use client";

import { useState, useEffect } from "react";
import {
  User,
  Settings,
  CreditCard,
  Key,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Crown,
  Zap,
  Shield,
} from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  firm: string;
  phone: string;
}

interface Preferences {
  currency: string;
  dateFormat: string;
  documentLanguage: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "profile" | "preferences" | "billing" | "api"
  >("profile");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    firm: "",
    phone: "",
  });

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    currency: "INR",
    dateFormat: "dd/MM/yyyy",
    documentLanguage: "English",
  });

  // API state
  const [apiKey, setApiKey] = useState("tp_live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load profile from session
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.user) {
            setProfile({
              name: session.user.name || "",
              email: session.user.email || "",
              firm: session.user.firm || "",
              phone: session.user.phone || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    loadProfile();
  }, []);

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      // Simulate save - in production this would hit an API
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateApiKey = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const newKey =
      "tp_live_sk_" +
      Array.from({ length: 28 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
    setApiKey(newKey);
  };

  const TABS = [
    { key: "profile" as const, label: "Profile", icon: User },
    { key: "preferences" as const, label: "Preferences", icon: Settings },
    { key: "billing" as const, label: "Billing", icon: CreditCard },
    { key: "api" as const, label: "API", icon: Key },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 mb-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-surface border border-border rounded-xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Profile Information
              </h2>
              <p className="text-sm text-muted mt-0.5">
                Update your personal and firm details
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="CA Rajesh Kumar"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="rajesh@caassociates.in"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Firm Name
                  </label>
                  <input
                    type="text"
                    value={profile.firm}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, firm: e.target.value }))
                    }
                    placeholder="Kumar & Associates, Chartered Accountants"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleProfileSave}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <div className="bg-surface border border-border rounded-xl">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Preferences
              </h2>
              <p className="text-sm text-muted mt-0.5">
                Customize your default settings
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Default Currency
                </label>
                <select
                  value={preferences.currency}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Date Format
                </label>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      dateFormat: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="dd/MM/yyyy">DD/MM/YYYY (31/03/2026)</option>
                  <option value="MM/dd/yyyy">MM/DD/YYYY (03/31/2026)</option>
                  <option value="yyyy-MM-dd">YYYY-MM-DD (2026-03-31)</option>
                  <option value="dd-MMM-yyyy">DD-MMM-YYYY (31-Mar-2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Document Language
                </label>
                <select
                  value={preferences.documentLanguage}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      documentLanguage: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handlePreferencesSave}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading
                    ? "Saving..."
                    : saved
                      ? "Saved!"
                      : "Save Preferences"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-surface border border-primary/30 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Crown className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Professional Plan
                      </h2>
                      <p className="text-sm text-muted">
                        Your current subscription
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      <span className="text-lg">&#8377;</span>4,999
                    </p>
                    <p className="text-xs text-muted">/month</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-surface-alt rounded-lg">
                    <p className="text-xl font-bold text-foreground">25</p>
                    <p className="text-xs text-muted">Clients</p>
                  </div>
                  <div className="text-center p-3 bg-surface-alt rounded-lg">
                    <p className="text-xl font-bold text-foreground">100</p>
                    <p className="text-xs text-muted">Entities</p>
                  </div>
                  <div className="text-center p-3 bg-surface-alt rounded-lg">
                    <p className="text-xl font-bold text-foreground">
                      Unlimited
                    </p>
                    <p className="text-xs text-muted">Documents</p>
                  </div>
                  <div className="text-center p-3 bg-surface-alt rounded-lg">
                    <p className="text-xl font-bold text-foreground">
                      Priority
                    </p>
                    <p className="text-xs text-muted">Support</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-surface border border-border rounded-xl">
              <div className="p-6 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Usage This Month
                </h3>
              </div>
              <div className="p-6 space-y-5">
                {[
                  { label: "Clients", used: 3, total: 25 },
                  { label: "Entities", used: 8, total: 100 },
                  { label: "Documents Generated", used: 12, total: 50 },
                  { label: "Analyses", used: 5, total: 25 },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">
                        {stat.label}
                      </span>
                      <span className="text-muted">
                        {stat.used} / {stat.total}
                      </span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          stat.used / stat.total > 0.8
                            ? "bg-warning"
                            : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min((stat.used / stat.total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade Prompt */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Need more capacity?
                </h3>
                <p className="text-sm text-muted">
                  Upgrade to Enterprise for unlimited clients, entities,
                  dedicated support, and custom document templates.
                </p>
              </div>
              <button className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium whitespace-nowrap cursor-pointer">
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  API Key Management
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  Manage your API keys for programmatic access
                </p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Live API Key
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        readOnly
                        className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-foreground font-mono text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={copyApiKey}
                      className="px-3 py-2.5 bg-surface-alt border border-border rounded-lg hover:bg-border/50 transition-colors cursor-pointer"
                      title="Copy API key"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted" />
                      )}
                    </button>
                    <button
                      onClick={regenerateApiKey}
                      className="px-3 py-2.5 bg-surface-alt border border-border rounded-lg hover:bg-border/50 transition-colors cursor-pointer"
                      title="Regenerate API key"
                    >
                      <RefreshCw className="w-4 h-4 text-muted" />
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Use this key to authenticate API requests. Keep it secure
                    and never expose it in client-side code.
                  </p>
                </div>

                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    API Endpoints
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        method: "GET",
                        path: "/api/clients",
                        desc: "List all clients",
                      },
                      {
                        method: "POST",
                        path: "/api/clients",
                        desc: "Create a client",
                      },
                      {
                        method: "GET",
                        path: "/api/entities",
                        desc: "List all entities",
                      },
                      {
                        method: "POST",
                        path: "/api/entities",
                        desc: "Create an entity",
                      },
                      {
                        method: "GET",
                        path: "/api/analysis",
                        desc: "List analyses",
                      },
                      {
                        method: "POST",
                        path: "/api/documents",
                        desc: "Generate a document",
                      },
                    ].map((endpoint) => (
                      <div
                        key={endpoint.path + endpoint.method}
                        className="flex items-center gap-3 p-3 bg-surface-alt rounded-lg"
                      >
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            endpoint.method === "GET"
                              ? "bg-success/10 text-success"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <code className="text-sm text-foreground font-mono flex-1">
                          {endpoint.path}
                        </code>
                        <span className="text-xs text-muted hidden sm:block">
                          {endpoint.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <div className="flex items-start gap-3 p-4 bg-surface-alt rounded-lg">
                    <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">
                        Rate Limiting
                      </h4>
                      <p className="text-xs text-muted">
                        API requests are rate limited to 100 requests per minute
                        on the Professional plan. Contact support for higher
                        limits.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
