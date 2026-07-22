"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/dashboard/ChatWindow";

export default function DirectMessageChatPage() {
  const params = useParams();
  const roomId = params?.userId as string; // userId dynamic parameter holds the DM room ID

  if (!roomId) return null;

  return <ChatWindow roomId={roomId} />;
}
