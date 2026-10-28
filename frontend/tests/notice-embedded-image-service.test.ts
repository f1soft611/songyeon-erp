import { createElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeNoticeEmbeddedImage } from '../src/pages/groupware/community/notice/services/noticeBoardService';
import {
  AuthenticatedNoticeImage,
  extractNoticeEmbeddedImagePreviews,
  normalizeNoticeEmbeddedImageSources,
  NoticeFeedList,
  removeNoticeEmbeddedImages,
} from '../src/pages/groupware/community/notice/components/NoticeFeedList';
import { noticeFeed } from '../src/pages/groupware/community/notice/data/noticeData';

const { apiGetBlob } = vi.hoisted(() => ({ apiGetBlob: vi.fn() }));

vi.mock('../src/shared/services/apiClient', () => ({ apiGetBlob }));

function stubDecodedImage(
  width: number,
  height: number,
  decode = vi.fn().mockResolvedValue(undefined),
) {
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = width;
      naturalHeight = height;
      src = '';

      decode() {
        return decode();
      }
    },
  );
  return decode;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('notice embedded image upload response', () => {
  it('normalizes the upload item for editor image metadata', () => {
    expect(
      normalizeNoticeEmbeddedImage({
        uploadToken: 'token-1',
        fileId: 12,
        fileName: 'pasted.png',
        fileSize: '128',
        mimeType: 'image/png',
        objectKey: 'tenant/1/notice-temp/token-1/pasted.png',
        bucketName: 'document-attachments',
        imageUrl:
          'https://cdn.example.com/document-attachments/tenant/1/pasted.png',
      }),
    ).toEqual({
      uploadToken: 'token-1',
      fileId: 12,
      fileName: 'pasted.png',
      fileSize: 128,
      mimeType: 'image/png',
      objectKey: 'tenant/1/notice-temp/token-1/pasted.png',
      bucketName: 'document-attachments',
      imageUrl:
        'https://cdn.example.com/document-attachments/tenant/1/pasted.png',
    });
  });

  it('extracts collapsed previews and removes images from the collapsed body', () => {
    const html =
      '<p>앞 문장</p><p><img src="https://cdn.test/a.png" alt="안내" /></p><p>뒤 문장</p>';

    expect(extractNoticeEmbeddedImagePreviews(html)).toEqual([
      { src: 'https://cdn.test/a.png', alt: '안내' },
    ]);
    expect(removeNoticeEmbeddedImages(html)).not.toContain('<img');
    expect(removeNoticeEmbeddedImages(html)).toContain('앞 문장');
    expect(removeNoticeEmbeddedImages(html)).toContain('뒤 문장');
  });

  it('removes stale upload tokens when hydrating a saved notice image', () => {
    const html =
      '<p><img src="blob:old-preview" data-upload-token="old-token" data-object-key="tenant/1/notice-temp/old-token/image.png"></p>';

    const normalized = normalizeNoticeEmbeddedImageSources(html, 42);

    expect(normalized).toContain(
      '/api/v1/groupware/boards/notice/posts/42/embedded-images',
    );
    expect(normalized).not.toContain('data-upload-token');
  });

  it('loads stable notice images through the authenticated blob API', async () => {
    apiGetBlob.mockResolvedValue(new Blob(['image']));
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:notice-preview'),
        revokeObjectURL: vi.fn(),
      }),
    );
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';

    render(
      createElement(AuthenticatedNoticeImage, {
        src: source,
        alt: '본문 이미지',
      }),
    );

    const image = screen.getByRole('img', { name: '본문 이미지' });
    await waitFor(() =>
      expect(image).toHaveAttribute('src', 'blob:notice-preview'),
    );
    expect(apiGetBlob).toHaveBeenCalledWith(source);
  });

  it('keeps an expanded body image loaded after an unrelated rerender', async () => {
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';
    const objectUrl = 'blob:expanded-notice-image';
    apiGetBlob.mockResolvedValue(new Blob(['image']));
    stubDecodedImage(360, 80);
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => objectUrl),
        revokeObjectURL: vi.fn(),
      }),
    );
    const item = {
      ...noticeFeed[0],
      id: 42,
      body: '이미지를 포함한 공지 전체 내용',
      summary: '이미지를 포함한 공지',
      bodyHtml: `<p><img src="${source}" alt="본문 이미지"></p>`,
    };
    const items = [item];
    const renderFeed = (isDark: boolean) =>
      createElement(NoticeFeedList, {
        items,
        isDark,
        expandedNoticeId: item.id,
      });
    const { rerender } = render(renderFeed(false));
    const body = screen.getByTestId('notice-preview-42');

    await waitFor(() =>
      expect(body.querySelector('img')).toHaveAttribute('src', objectUrl),
    );
    expect(apiGetBlob).toHaveBeenCalledWith(source);

    rerender(renderFeed(true));

    expect(body.querySelector('img')).toHaveAttribute('src', objectUrl);
  });

  it('shows an image-sized placeholder while a declared-size body image loads', async () => {
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';
    const objectUrl = 'blob:expanded-declared-size-image';
    let resolveImageRequest!: (blob: Blob) => void;
    apiGetBlob.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImageRequest = resolve;
        }),
    );
    stubDecodedImage(300, 100);
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => objectUrl),
        revokeObjectURL: vi.fn(),
      }),
    );
    const item = {
      ...noticeFeed[0],
      id: 42,
      body: '이미지 앞 문장 이미지 뒤 문장',
      summary: '이미지를 포함한 공지',
      bodyHtml: `<p>이미지 앞 문장</p><table><tbody><tr><td>표 내용</td></tr></tbody></table><p><img src="${source}" alt="본문 이미지" width="300px" height="100px"></p><p>이미지 뒤 문장</p>`,
    };

    render(
      createElement(NoticeFeedList, {
        items: [item],
        isDark: false,
        expandedNoticeId: item.id,
      }),
    );

    const body = screen.getByTestId('notice-preview-42');
    await waitFor(() => expect(apiGetBlob).toHaveBeenCalledWith(source));

    const skeleton = screen.getByTestId(
      'notice-expanded-image-skeleton-42-0',
    );
    expect(skeleton.style.width).toBe('300px');
    expect(skeleton.style.aspectRatio).toBe('300 / 100');
    expect(skeleton.style.maxWidth).toBe('100%');
    expect(body).toHaveTextContent('이미지 앞 문장');
    expect(body).toHaveTextContent('이미지 뒤 문장');
    expect(body).toHaveTextContent('표 내용');
    expect(body.querySelector('table')).not.toBeNull();
    expect(body.querySelector('img')).toBeNull();

    await act(async () => {
      resolveImageRequest(new Blob(['image']));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(body.querySelector('img')).toHaveAttribute('src', objectUrl);
    });
    expect(skeleton).not.toBeInTheDocument();
    expect(body.querySelector('img')?.style.maxWidth).toBe('100%');
    expect(body.querySelector('img')?.style.height).toBe('auto');
  });

  it('shows a naturally sized placeholder after decoding an image without markup dimensions', async () => {
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';
    const objectUrl = 'blob:expanded-natural-size-image';
    const resolveImageRequests: Array<(blob: Blob) => void> = [];
    const scheduledFrames: FrameRequestCallback[] = [];
    let resolveDecode!: () => void;
    const decodeImage = stubDecodedImage(
      1200,
      400,
      vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDecode = resolve;
          }),
      ),
    );
    apiGetBlob.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImageRequests.push(resolve);
        }),
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => objectUrl),
        revokeObjectURL: vi.fn(),
      }),
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        scheduledFrames.push(callback);
        return scheduledFrames.length;
      }),
    );
    const item = {
      ...noticeFeed[0],
      id: 42,
      body: '치수 정보가 없는 이미지 본문',
      summary: '이미지를 포함한 공지',
      bodyHtml: `<p>이미지 내용</p><p><img src="${source}" alt="본문 이미지"></p>`,
    };

    render(
      createElement(NoticeFeedList, {
        items: [item],
        isDark: false,
        expandedNoticeId: item.id,
      }),
    );

    const body = screen.getByTestId('notice-preview-42');
    await waitFor(() => expect(apiGetBlob).toHaveBeenCalledWith(source));
    expect(body.querySelector('img')).toBeNull();
    expect(
      screen.queryByTestId('notice-expanded-image-skeleton-42-0'),
    ).toBeNull();

    await act(async () => {
      resolveImageRequests[0](new Blob(['image']));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(decodeImage).toHaveBeenCalledOnce();
    expect(body.querySelector('img')).toBeNull();
    expect(
      screen.queryByTestId('notice-expanded-image-skeleton-42-0'),
    ).toBeNull();

    await act(async () => {
      resolveDecode();
      await Promise.resolve();
      await Promise.resolve();
    });

    const skeleton = await screen.findByTestId(
      'notice-expanded-image-skeleton-42-0',
    );
    expect(skeleton.style.width).toBe('1200px');
    expect(skeleton.style.aspectRatio).toBe('1200 / 400');
    expect(skeleton.style.maxWidth).toBe('100%');
    expect(body.querySelector('img')).toBeNull();

    await act(async () => {
      scheduledFrames.shift()?.(0);
      await Promise.resolve();
    });

    expect(skeleton).toBeInTheDocument();
    await act(async () => {
      scheduledFrames.shift()?.(0);
    });
    const image = await waitFor(() => {
      const loadedImage = body.querySelector('img');
      expect(loadedImage).toHaveAttribute('src', objectUrl);
      return loadedImage;
    });
    expect(image).toHaveAttribute('alt', '본문 이미지');
    expect(image).toHaveStyle({ maxWidth: '100%', height: 'auto' });
  });

  it('shows an accessible message when an expanded body image fails to load', async () => {
    apiGetBlob.mockRejectedValue(new Error('image request failed'));
    const item = {
      ...noticeFeed[0],
      id: 42,
      body: '이미지를 포함한 공지 전체 내용',
      summary: '이미지를 포함한 공지',
      bodyHtml:
        '<p><img src="/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png" alt="본문 이미지"></p>',
    };

    render(
      createElement(NoticeFeedList, {
        items: [item],
        isDark: false,
        expandedNoticeId: item.id,
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '본문 이미지를 불러오지 못했습니다.',
    );
  });

  it('revokes an expanded body image URL when the notice is collapsed', async () => {
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';
    const objectUrl = 'blob:expanded-notice-image';
    const revokeObjectURL = vi.fn();
    apiGetBlob.mockResolvedValue(new Blob(['image']));
    stubDecodedImage(360, 80);
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => objectUrl),
        revokeObjectURL,
      }),
    );
    const item = {
      ...noticeFeed[0],
      id: 42,
      body: '이미지를 포함한 공지 전체 내용',
      summary: '이미지를 포함한 공지',
      bodyHtml: `<p><img src="${source}" alt="본문 이미지"></p>`,
    };
    const items = [item];
    const renderFeed = (expandedNoticeId: number | null) =>
      createElement(NoticeFeedList, {
        items,
        isDark: false,
        expandedNoticeId,
      });
    const { rerender } = render(renderFeed(item.id));

    await waitFor(() => {
      expect(
        screen.getByTestId('notice-preview-42').querySelector('img'),
      ).toHaveAttribute('src', objectUrl);
    });

    rerender(renderFeed(null));
    await act(async () => {
      await Promise.resolve();
    });

    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
  });

  it('revokes an image URL returned after its expanded notice was collapsed', async () => {
    const source =
      '/api/v1/groupware/boards/notice/posts/42/embedded-images?objectKey=tenant%2F1%2Fimage.png';
    const objectUrl = 'blob:late-expanded-notice-image';
    const revokeObjectURL = vi.fn();
    const resolveImageRequests: Array<(blob: Blob) => void> = [];
    apiGetBlob.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImageRequests.push(resolve);
        }),
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => objectUrl),
        revokeObjectURL,
      }),
    );
    const item = {
      ...noticeFeed[0],
      id: 42,
      body: '이미지를 포함한 공지 전체 내용',
      summary: '이미지를 포함한 공지',
      bodyHtml: `<p><img src="${source}" alt="본문 이미지"></p>`,
    };
    const items = [item];
    const renderFeed = (expandedNoticeId: number | null) =>
      createElement(NoticeFeedList, {
        items,
        isDark: false,
        expandedNoticeId,
      });
    const { rerender } = render(renderFeed(item.id));

    await waitFor(() => expect(apiGetBlob).toHaveBeenCalledWith(source));
    rerender(renderFeed(null));
    await waitFor(() => expect(resolveImageRequests).toHaveLength(2));

    await act(async () => {
      resolveImageRequests[0](new Blob(['image']));
    });

    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl),
    );
    expect(
      screen.getByTestId('notice-preview-42').querySelector('img'),
    ).toBeNull();
  });
});
