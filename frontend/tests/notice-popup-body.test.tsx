import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NoticePopupBody } from '../src/pages/groupware/community/notice/components/NoticePopupBody';

const api = vi.hoisted(() => ({ apiGetBlob: vi.fn() }));
vi.mock('../src/shared/services/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('../src/shared/services/apiClient')>(),
  apiGetBlob: api.apiGetBlob,
}));
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('retries authenticated images and revokes loaded blob URLs when closed', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-image');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  api.apiGetBlob.mockRejectedValueOnce(new Error('synthetic-failure')).mockResolvedValue(new Blob(['image']));
  const view = render(<NoticePopupBody post={{ postId: 42,
    contentsHtml: '<p>본문</p><img data-object-key="synthetic-image" src="/old-image" alt="공지 이미지" />' }} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('이미지');
  fireEvent.click(screen.getByRole('button', { name: '이미지 다시 시도' }));
  await waitFor(() => expect(screen.getByAltText('공지 이미지')).toHaveAttribute('src', 'blob:synthetic-image'));
  expect(api.apiGetBlob).toHaveBeenCalledTimes(2);
  expect(create).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(revoke).toHaveBeenCalledWith('blob:synthetic-image');
});

it('does not attach authentication to an external image whose URL resembles the API', async () => {
  render(<NoticePopupBody post={{ postId: 42,
    contentsHtml: '<img alt="외부 이미지" src="https://untrusted.invalid/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=image" />' }} />);
  await waitFor(() => expect(screen.getByAltText('외부 이미지')).toHaveAttribute('src',
    'https://untrusted.invalid/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=image'));
  expect(api.apiGetBlob).not.toHaveBeenCalled();
});
