import { FeedLinkPreviews, type InternalContentPreview } from '../../../../../shared/components/feed/FeedLinkPreviews';
import type { DocumentShareReference } from '../data/documentShareLink';
import { getDocumentKindPresentation } from '../data/documentPresentation';
import {
  getExternalLinkPreview,
  getSharedDocumentPreview,
  listDocumentApprovals,
} from '../services/documentApproval.service';
import type { DocumentApprovalRecord } from '../types/documentWrite.types';
import { resolveNoticeLinkPreview } from '../../../community/notice/services/noticeLinkPreview.service';

export type DocumentLinkPreviewsProps = {
  html: string;
  onOpenDocument?: (documentId: number) => void;
  testId?: string;
};

function mapDocumentPreview(record: DocumentApprovalRecord): InternalContentPreview {
  return {
    id: record.electronicApprovalId,
    title: record.title,
    subtitle: `${getDocumentKindPresentation(record.documentType).label ?? record.documentType} · ${record.drafterName}`,
    description: record.summary,
  };
}

async function resolveDocumentPreview(
  reference: DocumentShareReference,
): Promise<InternalContentPreview | null> {
  const record = typeof reference === 'number'
    ? (await listDocumentApprovals('ALL', undefined, reference))
      .find((item) => item.electronicApprovalId === reference) ?? null
    : await getSharedDocumentPreview(reference);
  return record ? mapDocumentPreview(record) : null;
}

export function DocumentLinkPreviews({
  html,
  onOpenDocument,
  testId = 'document-link-previews',
}: DocumentLinkPreviewsProps) {
  return (
    <FeedLinkPreviews
      html={html}
      testId={testId}
      resolveDocument={resolveDocumentPreview}
      resolveNotice={resolveNoticeLinkPreview}
      resolveExternal={getExternalLinkPreview}
      onOpenDocument={onOpenDocument}
    />
  );
}
