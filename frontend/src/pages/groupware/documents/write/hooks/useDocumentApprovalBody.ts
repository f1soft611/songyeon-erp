import { useEffect, useMemo, useState } from 'react';
import type { FeedBodyImage } from '../../../../../shared/components/feed/FeedBodyContent';
import { fetchApprovalEmbeddedImageBlob } from '../services/documentApproval.service';

type ApprovalBodyImage = FeedBodyImage & { fileId: number };

export function useDocumentApprovalBody(
  electronicApprovalId: number | null,
  contentsHtml: string,
) {
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyImages, setBodyImages] = useState<ApprovalBodyImage[]>([]);
  const [bodyImageError, setBodyImageError] = useState('');

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    if (electronicApprovalId === null || !contentsHtml) {
      setBodyHtml('');
      setBodyImages([]);
      setBodyImageError('');
      return () => {
        active = false;
      };
    }

    const parsed = new DOMParser().parseFromString(contentsHtml, 'text/html');
    const imageElements = Array.from(parsed.querySelectorAll('img'));
    const imageRequests: Array<{ alt: string; fileId: number }> = [];
    imageElements.forEach((image) => {
      const source = image.getAttribute('src') ?? '';
      if (!source.startsWith('/api/v1/groupware/approvals/')) return;
      const match = source.match(
        /^\/api\/v1\/groupware\/approvals\/(\d+)\/embedded-images\/(\d+)$/,
      );
      image.removeAttribute('src');
      if (match && Number(match[1]) === electronicApprovalId) {
        const alt = image.getAttribute('alt')?.trim() || '본문 이미지';
        const fileId = Number(match[2]);
        imageRequests.push({ alt, fileId });
        image.setAttribute(
          'data-approval-embedded-image-file-id',
          String(fileId),
        );
      }
    });

    setBodyImageError('');
    setBodyImages([]);
    setBodyHtml(parsed.body.innerHTML);
    if (imageRequests.length === 0) {
      return () => {
        active = false;
      };
    }

    void Promise.allSettled(
      imageRequests.map(async ({ alt, fileId }) => ({
        alt,
        fileId,
        blob: await fetchApprovalEmbeddedImageBlob(electronicApprovalId, fileId),
      })),
    ).then((results) => {
      if (!active) return;
      let failed = false;
      const loadedImages: ApprovalBodyImage[] = [];
      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          failed = true;
          return;
        }
        const src = URL.createObjectURL(result.value.blob);
        objectUrls.push(src);
        loadedImages.push({
          fileId: result.value.fileId,
          src,
          alt: result.value.alt,
        });
      });
      setBodyImages(loadedImages);
      if (failed) setBodyImageError('일부 본문 이미지를 불러오지 못했습니다.');
    });

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [contentsHtml, electronicApprovalId]);

  const expandedBodyHtml = useMemo(() => {
    if (!bodyHtml || typeof DOMParser === 'undefined') return bodyHtml;
    const parsed = new DOMParser().parseFromString(bodyHtml, 'text/html');
    const loadedImages = new Map(
      bodyImages.map((image) => [image.fileId, image.src]),
    );
    parsed
      .querySelectorAll<HTMLImageElement>('img[data-approval-embedded-image-file-id]')
      .forEach((image) => {
        const fileId = Number(
          image.getAttribute('data-approval-embedded-image-file-id'),
        );
        const src = loadedImages.get(fileId);
        if (src) image.setAttribute('src', src);
        else image.remove();
        image.removeAttribute('data-approval-embedded-image-file-id');
      });
    return parsed.body.innerHTML;
  }, [bodyHtml, bodyImages]);

  const collapsedBodyHtml = useMemo(() => {
    if (!bodyHtml || typeof DOMParser === 'undefined') return bodyHtml;
    const parsed = new DOMParser().parseFromString(bodyHtml, 'text/html');
    parsed.querySelectorAll('img').forEach((image) => image.remove());
    return parsed.body.innerHTML;
  }, [bodyHtml]);

  return {
    bodyHtml,
    bodyImages,
    bodyImageError,
    expandedBodyHtml,
    collapsedBodyHtml,
  };
}
