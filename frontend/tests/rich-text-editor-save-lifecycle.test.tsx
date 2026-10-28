import { act, renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { describe, expect, it, vi } from 'vitest';
import { useRichTextEditorSaveLifecycle } from '../src/shared/components/rich-text-editor/useRichTextEditorSaveLifecycle';

type TestImageNode = {
  type: { name: string };
  attrs: Record<string, unknown>;
};

function createEditor(imageNodes: TestImageNode[]) {
  return {
    getHTML: vi.fn(() => '<p>본문</p>'),
    getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    state: {
      doc: {
        descendants: (visit: (node: TestImageNode) => void) => {
          imageNodes.forEach(visit);
        },
      },
    },
  } as unknown as Editor;
}

describe('useRichTextEditorSaveLifecycle', () => {
  it('separates current image references from the complete temporary upload session', async () => {
    const imageNodes: TestImageNode[] = [];
    const editor = createEditor(imageNodes);
    const uploadImage = vi.fn(async (file: File) => ({
      src: `preview:${file.name}`,
      alt: file.name,
      uploadToken: `token-${file.name}`,
    }));
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useRichTextEditorSaveLifecycle({
        editor,
        uploadImage,
        deleteTemporaryImage,
      }),
    );

    await act(async () => {
      await result.current.uploadImage(new File(['a'], 'used.png'));
      await result.current.uploadImage(new File(['b'], 'removed.png'));
    });
    imageNodes.push({
      type: { name: 'image' },
      attrs: {
        src: 'preview:used.png',
        alt: 'used.png',
        'data-upload-token': 'token-used.png',
      },
    });

    const snapshot = result.current.getSnapshot();

    expect(snapshot.html).toBe('<p>본문</p>');
    expect(snapshot.json).toEqual({ type: 'doc', content: [] });
    expect(snapshot.referencedImages).toEqual([
      expect.objectContaining({
        uploadToken: 'token-used.png',
        fileName: 'used.png',
      }),
    ]);
    expect(snapshot.temporaryImages).toEqual([
      { uploadToken: 'token-used.png', fileName: 'used.png' },
      { uploadToken: 'token-removed.png', fileName: 'removed.png' },
    ]);
  });

  it('deletes orphaned uploads and removes them from the session', async () => {
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useRichTextEditorSaveLifecycle({
        editor: createEditor([]),
        uploadImage: vi.fn(async (file: File) => ({
          src: `preview:${file.name}`,
          alt: file.name,
          uploadToken: 'orphan-token',
        })),
        deleteTemporaryImage,
      }),
    );

    await act(async () => {
      await result.current.uploadImage(new File(['x'], 'orphan.png'));
      await result.current.onOrphanedImageUpload({
        uploadToken: 'orphan-token',
        alt: 'orphan.png',
      });
    });

    expect(deleteTemporaryImage).toHaveBeenCalledWith({
      uploadToken: 'orphan-token',
      fileName: 'orphan.png',
    });
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
  });

  it('cleans all pending uploads on cancel and clears them after successful save without deleting again', async () => {
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const uploadImage = vi.fn(async (file: File) => ({
      src: `preview:${file.name}`,
      alt: file.name,
      uploadToken: `token-${file.name}`,
    }));
    const { result } = renderHook(() =>
      useRichTextEditorSaveLifecycle({
        editor: createEditor([]),
        uploadImage,
        deleteTemporaryImage,
      }),
    );

    await act(async () => {
      await result.current.uploadImage(new File(['a'], 'first.png'));
      await result.current.uploadImage(new File(['b'], 'second.png'));
      await result.current.cleanupTemporaryImages();
    });

    expect(deleteTemporaryImage).toHaveBeenCalledTimes(2);
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);

    await act(async () => {
      await result.current.uploadImage(new File(['c'], 'saved.png'));
      result.current.completeSave();
    });

    expect(deleteTemporaryImage).toHaveBeenCalledTimes(2);
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
  });
});
