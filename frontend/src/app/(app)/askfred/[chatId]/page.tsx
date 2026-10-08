import { notFound } from "next/navigation";

import { AskFredView } from "@/features/chat";

export const metadata = { title: "AskFred · Fireflies.ai Clone" };

export default async function AskFredChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const id = Number(chatId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return <AskFredView chatId={id} />;
}
