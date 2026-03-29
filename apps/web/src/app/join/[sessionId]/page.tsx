import { JoinClient } from "./JoinClient";

type Props = { params: Promise<{ sessionId: string }> };

export default async function JoinPage({ params }: Props) {
  const { sessionId } = await params;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <JoinClient sessionId={sessionId} />
    </main>
  );
}
