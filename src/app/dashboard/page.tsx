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

async function getDashboardStats(userId: string) {
  const [clientCount, entityCount, pendingDocCount, alertCount] =
    await Promise.all([
      prisma.client.count({ where: { userId } }),
      prisma.entity.count({
        where: { client: { userId } },
      }),
      prisma.document.count({
        where: { client: { userId }, status: "draft" },
      }),
      prisma.complianceAlert.count({
        where: { client: { userId }, status: "active" },
      }),
    ]);

  return {
    clients: clientCount,
    entities: entityCount,
    pendingDocs: pendingDocCount,
    alerts: alertCount,
  };
}

const recentActivity = [
  {
    id: 1,
    action: "Created new client",
    detail: "Tata Consultancy Services Ltd",
    time: "2 hours ago",
    type: "client",
  },
  {
    id: 2,
    action: "Generated Form 3CEB",
    detail: "Infosys BPO Limited",
    time: "5 hours ago",
    type: "document",
  },
  {
    id: 3,
    action: "Completed functional analysis",
    detail: "Wipro Technologies",
    time: "1 day ago",
    type: "analysis",
  },
  {
    id: 4,
    action: "New compliance alert",
    detail: "Due date approaching for FY 2024-25",
    time: "2 days ago",
    type: "alert",
  },
  {
    id: 5,
    action: "Added entity",
    detail: "Reliance Industries - Singapore Branch",
    time: "3 days ago",
    type: "entity",
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const stats = userId
    ? await getDashboardStats(userId)
    : { clients: 0, entities: 0, pendingDocs: 0, alerts: 0 };

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
      label: "Compliance Alerts",
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

  const activityIcons: Record<string, typeof Users> = {
    client: Users,
    document: FileText,
    analysis: BarChart3,
    alert: AlertTriangle,
    entity: Building2,
  };

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
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-secondary">
              Recent Activity
            </h2>
            <span className="text-xs text-muted">Last 7 days</span>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((activity) => {
              const Icon = activityIcons[activity.type] || Clock;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 px-6 py-4"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                    <Icon className="h-4 w-4 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary">
                      {activity.action}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {activity.detail}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-muted">
                    {activity.time}
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
                  Form 3CEB due by November 30, 2026. Ensure all TP
                  documentation is up to date.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
