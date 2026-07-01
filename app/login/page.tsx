"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, refresh, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await api.login({ email, password });
      await refresh();
      const next = params.get("next");
      router.replace(next ?? (user.role === "admin" ? "/admin" : "/dashboard"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!authLoading && user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">You&apos;re already signed in</h1>
          <p className="mt-2 text-sm text-slate-600">
            You&apos;re currently signed in as <span className="font-medium text-slate-900">{user.name}</span>.
          </p>
          <div className="mt-5 space-y-2">
            <button
              onClick={() => router.replace(user.role === "admin" ? "/admin" : "/dashboard")}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Continue to dashboard
            </button>
            <button
              onClick={() => logout()}
              className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out and switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back to CourtBook.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-emerald-700 hover:underline">
            Sign up
          </Link>
        </p>

        <div className="mt-8 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Demo accounts</p>
          <p>Client: client@courtbooking.test / Client123!</p>
          <p>Admin: admin@courtbooking.test / Admin123!</p>
        </div>
      </div>
    </div>
  );
}
