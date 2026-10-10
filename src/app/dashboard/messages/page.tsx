import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesView } from "@/features/messages/messages-view";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("messages.title") };
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  );
}
