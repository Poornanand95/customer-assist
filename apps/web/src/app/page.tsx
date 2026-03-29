import { CreateSessionButton } from "@/components/CreateSessionButton";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-24">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          AssistLink POC
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Share one link. Join with a name.
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Voice (and optional video) use <strong>WebRTC</strong>. The Java API
          exposes <strong>WebSocket</strong> only for signaling — not for media.
        </p>
      </div>
      <CreateSessionButton />
      <p className="max-w-md text-center text-xs text-zinc-500">
        After starting a session, copy the URL from the address bar and open it in
        another browser or device to test together.
      </p>
    </main>
  );
}
