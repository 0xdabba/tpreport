import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
        userFirm={(session.user as { firm?: string | null }).firm}
      />
      <main className="lg:pl-64 transition-all duration-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
