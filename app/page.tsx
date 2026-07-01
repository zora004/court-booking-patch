"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/availability");
    } else if (user.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}
