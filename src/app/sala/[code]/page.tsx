import { ChatView } from "@/components/chat-view";
import { normalizeCode } from "@/lib/format";
import type { Metadata } from "next";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const normalized = normalizeCode(code);
  return {
    title: `VELA · ${normalized || "sala"}`,
    description: "Sala temporal. Los mensajes se apagan en 24 horas.",
  };
}

export default async function SalaPage({ params }: Props) {
  const { code } = await params;
  return <ChatView code={code} />;
}
