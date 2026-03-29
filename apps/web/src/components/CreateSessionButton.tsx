"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiBaseUrl } from "@/lib/config";

export function CreateSessionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/sessions`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { sessionId: string; joinPath: string };
      router.push(`/join/${data.sessionId}`);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Could not create session. Is the API running on " + apiBaseUrl + "?",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void create()}
        disabled={loading}
        className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {loading ? "Creating…" : "Start a session"}
      </button>
      {err ? (
        <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">
          {err}
        </p>
      ) : null}
    </div>
  );
}
