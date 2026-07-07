"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const doSignIn = async (mail: string, pass: string) => {
    setError("");
    try {
      const result = await signIn("credentials", {
        email: mail,
        password: pass,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await doSignIn(email, password);
    setLoading(false);
  };

  const handleDemoLogin = async (mail: string) => {
    setDemoLoading(mail);
    await doSignIn(mail, "demo1234");
    setDemoLoading(null);
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-secondary">
        Welcome back
      </h2>
      <p className="mb-6 text-sm text-muted">
        Sign in to your account to continue
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-secondary"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-secondary placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-secondary placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Demo one-click logins */}
      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted">
              or try the demo
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleDemoLogin("partner@demo.test")}
            disabled={demoLoading !== null}
            className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {demoLoading === "partner@demo.test"
              ? "Signing in..."
              : "Demo as Partner"}
          </button>
          <button
            type="button"
            onClick={() => handleDemoLogin("staff@demo.test")}
            disabled={demoLoading !== null}
            className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
          >
            {demoLoading === "staff@demo.test"
              ? "Signing in..."
              : "Demo as Staff"}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted/70">
          Demo firm with seeded clients, benchmarking set, and deadlines
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-dark transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
