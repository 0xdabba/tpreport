import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Plus,
  BarChart3,
  FileOutput,
  ArrowRight,
  Clock,
} from "lucide-react";
import Link from "next/link";

async function getDashboardStats(firmId: string) {
  const now = new Date();
  const [clientCount, entityCount, pendingDocCount, deadlineCount, upcomingDeadlines] =
    await Promise.all([
      prisma.client.count({ where: { firmId } }),
      prisma.entity.count({
        where: { client: { firmId } },
      }),
      prisma.document.count({
        where: { client: { firmId }, status: { in: ["draft", "in_review"] } },
      }),
      prisma.deadline.count({
        where: {
          client: { firmId },
          status: { in: ["upcoming", "overdue"] },
          dueDate: { lte: new Date(now.getTime() + 60 * 86400000) },
        },
      }),
      prisma.deadline.findMany({
        where: { client: { firmId }, status: { in: ["upcoming", "overdue"] } },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 6,
      }),
    ]);

  return {
    clients: clientCount,
    entities: entityCount,
    pendingDocs: pendingDocCount,
    alerts: deadlineCount,
    upcomingDeadlines,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firmId = (session?.user as { firmId?: string })?.firmId;

  const stats = firmId
    ? await getDashboardStats(firmId)
    : { clients: 0, entities: 0, pendingDocs: 0, alerts: 0, upcomingDeadlines: [] };

  const statCards = [
    {
      label: "Total Clients",
      value: stats.clients,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/dashboard/clients",
    },
    {
      label: "Active Entities",
      value: stats.entities,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/entities",
    },
    {
      label: "Pending Documents",
      value: stats.pendingDocs,
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/dashboard/documents",
    },
    {
      label: "Deadlines (60 days)",
      value: stats.alerts,
      icon: AlertTriangle,
      color: "text-danger",
      bg: "bg-red-50",
      href: "/dashboard/compliance",
    },
  ];

  const quickActions = [
    {
      label: "Add Client",
      description: "Register a new client for TP documentation",
      icon: Plus,
      href: "/dashboard/clients",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "New Analysis",
      description: "Start a functional & economic analysis",
      icon: BarChart3,
      href: "/dashboard/analysis",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Generate Document",
      description: "Create Form 3CEB, TP Study, or Master File",
      icon: FileOutput,
      href: "/dashboard/documents",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const daysLeft = (d: Date) =>
    Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-secondary">
          Welcome back, {session?.user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Here&apos;s an overview of your transfer pricing practice
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/20 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-semibold text-secondary">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-sm text-muted">{stat.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming deadlines */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-secondary">
              Upcoming statutory deadlines
            </h2>
            <Link href="/dashboard/compliance" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.upcomingDeadlines.length === 0 && (
              <div className="px-6 py-8 text-sm text-muted">
                No tracked deadlines yet — open{" "}
                <Link href="/dashboard/compliance" className="text-primary hover:underline">
                  Compliance
                </Link>{" "}
                and generate them from client data.
              </div>
            )}
            {stats.upcomingDeadlines.map((d) => {
              const left = daysLeft(d.dueDate);
              return (
                <div key={d.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                    <Clock className="h-4 w-4 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary">{d.label}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {d.client.name} · FY {d.financialYear}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-medium ${
                      left < 0 ? "text-danger" : left <= 30 ? "text-warning" : "text-muted"
                    }`}
                  >
                    {fmtDate(d.dueDate)}
                    {left < 0 ? " · overdue" : ` · ${left}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-secondary">
              Quick Actions
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface-alt"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${action.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">
                      {action.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>

          {/* Compliance reminder */}
          <div className="mx-4 mb-4 rounded-lg border border-warning/20 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-secondary">
                  FY 2025-26 Deadlines
                </p>
                <p className="mt-1 text-xs text-muted">
                  Form 3CEB due 31 October 2026; TP-case ITR and Form 3CEAA due
                  30 November 2026. Generate per-client deadlines under
                  Compliance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
