// 송연: 사람 ID(senderUserId · recipientUserId · otherUserId)는 사번 문자열이다(2026-11-04)
export type MessageFolder = 'ALL' | 'INBOX' | 'SENT';

export interface DirectMessage {
  threadId: number;
  messageId: number;
  senderUserId: string;
  senderUserName: string;
  recipientUserId: string;
  recipientUserName: string;
  subject: string | null;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface MessageReceipt {
  threadId: number;
  messageId: number;
  senderUserId: string;
  recipientUserId: string;
  subject: string | null;
  content: string;
}

export interface MessageThread {
  threadId: number;
  subject: string | null;
  updatedAt: string;
  otherUserId: string;
  otherUserName: string;
  otherUserProfileImage?: string | null;
  latestContent: string;
  latestMessageAt: string;
  unreadCount: number;
}

export interface MessagePage {
  resultList: MessageThread[];
  hasNext: boolean;
  nextBeforeUpdatedAt: string | null;
  nextBeforeThreadId: number | null;
}

export interface MessageDayPage {
  resultList: DirectMessage[];
  messageDate: string | null;
  hasPrevious: boolean;
}

export interface MessageUserOption {
  userId: string;
  userNm: string;
  departmentNm: string;
  profileImage?: string | null;
}
