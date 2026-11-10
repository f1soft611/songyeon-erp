import { Drawer } from '@mui/material';
import { ContentDetailContext, type ContentDetailTarget } from '../../../../shared/components/feed/ContentDetailContext';
import { DocumentApprovalDetailFeed } from '../../documents/write/components/DocumentApprovalDetailFeed';
import { NoticeLinkedDetailPanel } from '../../community/notice/components/NoticeLinkedDetailPanel';

type SharedContentDetailPanelProps = {
  target: ContentDetailTarget;
  onOpen: (target: ContentDetailTarget) => void;
  onClose: () => void;
};

export default function SharedContentDetailPanel({
  target,
  onOpen,
  onClose,
}: SharedContentDetailPanelProps) {
  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          'aria-label': '공유 콘텐츠 상세',
          sx: {
            width: 'min(975px, 72vw)', maxWidth: '100%', overflow: 'hidden',
            '@media (max-width: 767px)': { width: '100%' },
          },
        },
      }}
    >
      <ContentDetailContext.Provider value={onOpen}>
        {target.kind === 'document' ? (
          <DocumentApprovalDetailFeed
            key={`document:${target.id}`}
            open
            electronicApprovalId={target.id}
            onClose={onClose}
            onOpenDocument={(id) => onOpen({ kind: 'document', id })}
            allowDocumentChanges={false}
            onActionComplete={() => {}}
            onEditDocument={() => {}}
            detailRefreshToken={0}
          />
        ) : (
          <NoticeLinkedDetailPanel
            key={`notice:${target.id}`}
            noticeId={target.id}
            onClose={onClose}
            onOpenNotice={(id) => onOpen({ kind: 'notice', id })}
          />
        )}
      </ContentDetailContext.Provider>
    </Drawer>
  );
}
