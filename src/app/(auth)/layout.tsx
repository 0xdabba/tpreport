export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-xl font-bold text-white">TP</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary">TP Report</h1>
          <p className="mt-1 text-sm text-muted">
            Transfer Pricing Compliance for Indian CAs
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
