"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/dashboard/ChatWindow";

export default function ChannelChatPage() {
  const params = useParams();
  const channelId = params?.channelId as string;

  if (!channelId) return null;

  return <ChatWindow roomId={channelId} />;
}
