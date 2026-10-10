export interface ConversationDTO {
  id: string;
  request: { id: string; title: string; status: string } | null;
  others: { id: string; name: string; avatarUrl: string | null; role: string }[];
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unread: number;
}

export interface MessageDTO {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
  attachments: { id: string; url: string; mimeType: string }[];
  pending?: boolean;
  failed?: boolean;
}

export interface MessagesPage {
  messages: MessageDTO[];
  typing: string[];
  readBy: { userId: string; lastReadAt: string | null }[];
  hasMore: boolean;
}
