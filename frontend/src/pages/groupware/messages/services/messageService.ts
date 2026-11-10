import { apiDelete, apiGet, apiPost } from '../../../../shared/services/apiClient';
import type {
  DirectMessage,
  MessageDayPage,
  MessageFolder,
  MessagePage,
  MessageReceipt,
  MessageThread,
} from '../types/message.types';

const API_PATH = '/api/v1/groupware/messages';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMessage(value: unknown): value is DirectMessage {
  return isObject(value)
    && Number.isSafeInteger(value.threadId) && Number(value.threadId) > 0
    && Number.isSafeInteger(value.messageId) && Number(value.messageId) > 0
    && typeof value.senderUserId === 'string' && value.senderUserId.trim() !== ''
    && typeof value.recipientUserId === 'string' && value.recipientUserId.trim() !== ''
    && typeof value.senderUserName === 'string'
    && typeof value.recipientUserName === 'string'
    && (value.subject === null || typeof value.subject === 'string')
    && typeof value.content === 'string'
    && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
    && (value.readAt === null
      || (typeof value.readAt === 'string' && Number.isFinite(Date.parse(value.readAt))));
}

function isMessageReceipt(value: unknown): value is MessageReceipt {
  return isObject(value)
    && Number.isSafeInteger(value.threadId) && Number(value.threadId) > 0
    && Number.isSafeInteger(value.messageId) && Number(value.messageId) > 0
    && typeof value.senderUserId === 'string' && value.senderUserId.trim() !== ''
    && typeof value.recipientUserId === 'string' && value.recipientUserId.trim() !== ''
    && (value.subject === null || typeof value.subject === 'string')
    && typeof value.content === 'string';
}

function isThread(value: unknown): value is MessageThread {
  return isObject(value)
    && Number.isSafeInteger(value.threadId) && Number(value.threadId) > 0
    && (value.subject === null || typeof value.subject === 'string')
    && typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))
    && typeof value.otherUserId === 'string' && value.otherUserId.trim() !== ''
    && typeof value.otherUserName === 'string'
    && typeof value.latestContent === 'string'
    && typeof value.latestMessageAt === 'string' && Number.isFinite(Date.parse(value.latestMessageAt))
    && Number.isSafeInteger(value.unreadCount) && Number(value.unreadCount) >= 0;
}

export async function getMessageSummary(): Promise<number> {
  const response = await apiGet<unknown>(`${API_PATH}/summary`);
  if (!isObject(response) || !Number.isSafeInteger(response.unreadCount)
    || Number(response.unreadCount) < 0) {
    throw new Error('쪽지 요약 응답을 확인할 수 없습니다.');
  }
  return Number(response.unreadCount);
}

export async function listMessageThreads(folder: MessageFolder = 'ALL'): Promise<MessagePage> {
  const response = await apiGet<unknown>(`${API_PATH}/threads?folder=${folder}&limit=20`);
  if (!isObject(response) || !Array.isArray(response.resultList)
    || !response.resultList.every(isThread)
    || typeof response.hasNext !== 'boolean'
    || (response.nextBeforeUpdatedAt !== null && typeof response.nextBeforeUpdatedAt !== 'string')
    || (response.nextBeforeThreadId !== null
      && (!Number.isSafeInteger(response.nextBeforeThreadId) || Number(response.nextBeforeThreadId) <= 0))) {
    throw new Error('쪽지 목록 응답을 확인할 수 없습니다.');
  }
  return response as unknown as MessagePage;
}

const MESSAGE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function getThreadMessages(threadId: number, beforeDate?: string): Promise<MessageDayPage> {
  if (!Number.isSafeInteger(threadId) || threadId <= 0) throw new Error('대화 ID가 올바르지 않습니다.');
  if (beforeDate !== undefined && !MESSAGE_DATE_PATTERN.test(beforeDate)) {
    throw new Error('이전 대화 기준일이 올바르지 않습니다.');
  }
  const query = beforeDate ? `?beforeDate=${beforeDate}` : '';
  const response = await apiGet<unknown>(`${API_PATH}/threads/${threadId}${query}`);
  if (!isObject(response) || !Array.isArray(response.resultList)
    || !response.resultList.every(isMessage)
    || typeof response.hasPrevious !== 'boolean'
    || (response.messageDate !== null
      && (typeof response.messageDate !== 'string' || !MESSAGE_DATE_PATTERN.test(response.messageDate)))) {
    throw new Error('쪽지 대화 응답을 확인할 수 없습니다.');
  }
  return {
    resultList: response.resultList,
    messageDate: response.messageDate as string | null,
    hasPrevious: response.hasPrevious,
  };
}

export async function createThread(input: {
  recipientUserId: string;
  subject?: string;
  content: string;
}): Promise<MessageReceipt> {
  validateMessage(input.content, input.subject);
  if (typeof input.recipientUserId !== 'string' || !input.recipientUserId.trim()) {
    throw new Error('쪽지 수신자를 선택해 주세요.');
  }
  const response = await apiPost<unknown>(`${API_PATH}/threads`, input);
  if (!isObject(response) || !isMessageReceipt(response.item)) {
    throw new Error('쪽지 발송 응답을 확인할 수 없습니다.');
  }
  return response.item;
}

export async function resolveMessageThread(messageId: number): Promise<number> {
  if (!Number.isSafeInteger(messageId) || messageId <= 0) throw new Error('쪽지 ID가 올바르지 않습니다.');
  const response = await apiGet<unknown>(`${API_PATH}/${messageId}/thread`);
  if (!isObject(response) || !Number.isSafeInteger(response.threadId) || Number(response.threadId) <= 0) {
    throw new Error('쪽지 대화 응답을 확인할 수 없습니다.');
  }
  return Number(response.threadId);
}

export async function replyToThread(threadId: number, content: string): Promise<MessageReceipt> {
  validateMessage(content);
  if (!Number.isSafeInteger(threadId) || threadId <= 0) throw new Error('대화 ID가 올바르지 않습니다.');
  const response = await apiPost<unknown>(`${API_PATH}/threads/${threadId}/messages`, { content });
  if (!isObject(response) || !isMessageReceipt(response.item)) {
    throw new Error('쪽지 답장 응답을 확인할 수 없습니다.');
  }
  return response.item;
}

export async function markThreadRead(threadId: number): Promise<void> {
  if (!Number.isSafeInteger(threadId) || threadId <= 0) throw new Error('대화 ID가 올바르지 않습니다.');
  await apiPost<unknown>(`${API_PATH}/threads/${threadId}/read`, {});
}

/** Hides the conversation for the current user only; a newer message makes it visible again. */
export async function deleteThread(threadId: number): Promise<void> {
  if (!Number.isSafeInteger(threadId) || threadId <= 0) throw new Error('대화 ID가 올바르지 않습니다.');
  await apiDelete<unknown>(`${API_PATH}/threads/${threadId}`);
}

function validateMessage(content: string, subject?: string): void {
  if (!content.trim() || content.trim().length > 5000) {
    throw new Error('쪽지 본문은 1자 이상 5,000자 이하여야 합니다.');
  }
  if ((subject?.trim().length ?? 0) > 120) {
    throw new Error('쪽지 제목은 120자 이하여야 합니다.');
  }
}
