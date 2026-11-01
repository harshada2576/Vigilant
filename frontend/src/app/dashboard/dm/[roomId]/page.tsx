"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/dashboard/ChatWindow";

export default function DirectMessageChatPage() {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) return null;

  return <ChatWindow roomId={roomId} />;
}
