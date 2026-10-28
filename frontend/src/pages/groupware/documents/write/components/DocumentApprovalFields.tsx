import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { UserSelectEditor } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type { F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';
import type { DocumentApprovalStage } from '../types/documentWrite.types';
import { ApprovalSequenceBadge } from './ApprovalSequenceBadge';
import { DocumentReferenceField } from './DocumentReferenceField';

const MIN_APPROVAL_SLOT_WIDTH = 88;
const APPROVAL_SLOT_GAP = 4;
const participantRemoveActionSx = {
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 120ms ease-in-out',
} as const;
const participantHoverSx = {
  '&:hover .participant-remove-action, &:focus-within .participant-remove-action':
    {
      opacity: 1,
      pointerEvents: 'auto',
    },
  '@media (hover: none)': {
    '& .participant-remove-action': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  },
} as const;

// oxlint-disable-next-line react/only-export-components
export function calculateApprovalSlotCapacity(contentWidth: number): number {
  return Math.max(
    1,
    Math.floor(
      (contentWidth + APPROVAL_SLOT_GAP) /
        (MIN_APPROVAL_SLOT_WIDTH + APPROVAL_SLOT_GAP),
    ),
  );
}

type DocumentApprovalFieldsProps = {
  userOptions: F1GridUserOption[];
  selectedApprovalUserIds: string[];
  referenceUserIds: string[];
  approvalStages: DocumentApprovalStage[];
  approvalSettingsDisabled?: boolean;
  onApprovalUserChange: (value: F1GridUserValue) => void;
  onReferenceUserChange: (value: F1GridUserValue) => void;
  onAddApproval: () => void;
  onAddAgreement: () => void;
  onOpenApprovalSettings: () => void;
  onRemoveApprovalUser: (stageId: number, userId: string) => void;
};

function PlaceholderSealSlot() {
  return (
    <Box
      aria-label="결재 도장 자리"
      sx={{
        display: 'grid',
        placeItems: 'center',
        color: 'text.disabled',
        fontSize: '0.75rem',
      }}
    />
  );
}

export function DocumentApprovalFields({
  userOptions,
  selectedApprovalUserIds,
  referenceUserIds,
  approvalStages,
  approvalSettingsDisabled = false,
  onApprovalUserChange,
  onReferenceUserChange,
  onAddApproval,
  onAddAgreement,
  onOpenApprovalSettings,
  onRemoveApprovalUser,
}: DocumentApprovalFieldsProps) {
  const assignedApprovalUserIds = new Set(
    approvalStages.flatMap((stage) =>
      stage.users.map((user) => String(user.value)),
    ),
  );
  const approvalOptions = userOptions.filter(
    (user) =>
      !assignedApprovalUserIds.has(String(user.value)) &&
      !referenceUserIds.includes(String(user.value)),
  );
  const referenceOptions = userOptions.filter(
    (user) =>
      !assignedApprovalUserIds.has(String(user.value)) &&
      (!selectedApprovalUserIds.includes(String(user.value)) ||
        referenceUserIds.includes(String(user.value))),
  );
  const participants = approvalStages.flatMap((stage, stageIndex) =>
    stage.users.map((user) => ({
      stageId: stage.id,
      kind: stage.kind,
      user,
      sequence: stageIndex + 1,
      isFixed: stage.isFixed ?? false,
    })),
  );
  const approvalParticipants = participants.filter(
    (participant) => participant.kind === 'approval',
  );
  const agreementParticipants = participants.filter(
    (participant) => participant.kind === 'agreement',
  );
  const approvalGridRef = useRef<HTMLDivElement | null>(null);
  const [slotCapacity, setSlotCapacity] = useState(1);
  const nextApprovalNumber = approvalStages.length + 1;
  const labeledRowSx = {
    display: 'grid',
    gridTemplateColumns: {
      xs: '64px minmax(0, 1fr)',
      sm: '80px minmax(0, 1fr)',
    },
    alignItems: 'start',
    gap: { xs: 1, sm: 1.5 },
    minWidth: 0,
  } as const;

  useEffect(() => {
    const grid = approvalGridRef.current;
    if (!grid) return;

    const updateSlotCapacity = () => {
      setSlotCapacity(calculateApprovalSlotCapacity(grid.clientWidth));
    };
    updateSlotCapacity();
    window.addEventListener('resize', updateSlotCapacity);
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateSlotCapacity);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries.find((item) => item.target === grid);
      if (entry) {
        setSlotCapacity(calculateApprovalSlotCapacity(entry.contentRect.width));
      }
    });
    observer.observe(grid);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSlotCapacity);
    };
  }, []);

  return (
    <Box
      data-testid="document-approval-fields"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <Box
        data-testid="document-approval-input-row"
        sx={{
          ...labeledRowSx,
          alignItems: 'center',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          결재선
        </Typography>
        <Box
          data-testid="document-approval-active-field"
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.75,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              flex: '1 1 180px',
              minWidth: 0,
              '& .MuiInputBase-root': {
                height: 40,
                boxSizing: 'border-box',
              },
            }}
          >
            <UserSelectEditor
              value={selectedApprovalUserIds}
              options={approvalOptions}
              multiple
              hideSelectedOptions
              preserveSelectionOrder
              label={`결재선 ${nextApprovalNumber} 사용자 선택`}
              onChange={onApprovalUserChange}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              flex: '0 1 auto',
              flexWrap: 'wrap',
              maxWidth: '100%',
            }}
          >
            <Button
              variant="outlined"
              size="small"
              disabled={selectedApprovalUserIds.length === 0}
              onClick={onAddApproval}
              sx={{ whiteSpace: 'nowrap', height: 40, minHeight: 40 }}
            >
              결재 추가
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={selectedApprovalUserIds.length === 0}
              onClick={onAddAgreement}
              sx={{ whiteSpace: 'nowrap', height: 40, minHeight: 40 }}
            >
              합의 추가
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={approvalSettingsDisabled}
              onClick={onOpenApprovalSettings}
              sx={{ whiteSpace: 'nowrap', height: 40, minHeight: 40 }}
            >
              결재선 설정
            </Button>
          </Box>
        </Box>
      </Box>

      <Box data-testid="document-approval-display-row" sx={labeledRowSx}>
        <Typography variant="body2" sx={{ fontWeight: 700, pt: 0.5 }}>
          결재
        </Typography>
        <Box
          ref={approvalGridRef}
          data-testid="document-approval-grid"
          data-slot-capacity={slotCapacity}
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${slotCapacity}, minmax(${MIN_APPROVAL_SLOT_WIDTH}px, 1fr))`,
            gap: `${APPROVAL_SLOT_GAP}px`,
            minWidth: 0,
          }}
        >
          {Array.from({
            length: Math.max(slotCapacity, approvalParticipants.length),
          }).map((_, index) => {
            const participant = approvalParticipants[index];
            if (!participant) {
              return (
                <Box
                  key={`empty-approval-slot-${index}`}
                  data-testid="document-empty-approval-slot"
                  role="group"
                  aria-label={`빈 결재 칸 ${index + 1}`}
                  sx={{
                    display: 'grid',
                    gridTemplateRows: '32px 64px 32px',
                    minWidth: 0,
                    border: '1px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    aria-label="직위/직함 자리"
                    variant="caption"
                    color="text.disabled"
                    sx={{ alignContent: 'center', textAlign: 'center' }}
                  ></Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      borderBlock: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <PlaceholderSealSlot />
                  </Box>
                  <Typography
                    aria-label="결재자 이름 자리"
                    variant="body2"
                    color="text.disabled"
                    sx={{ alignContent: 'center', textAlign: 'center' }}
                  />
                </Box>
              );
            }

            const { stageId, user, sequence: order, isFixed } = participant;
            return (
              <Box
                key={`${stageId}-${String(user.value)}`}
                role="group"
                aria-label={`결재 ${order} ${user.label}`}
                data-testid="document-approval-person"
                sx={{
                  display: 'grid',
                  gridTemplateRows: '32px 64px 32px',
                  minWidth: MIN_APPROVAL_SLOT_WIDTH,
                  border: '1px solid',
                  borderColor: 'divider',
                  ...participantHoverSx,
                }}
              >
                <Box
                  data-testid="document-approval-position-row"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: isFixed
                      ? 'minmax(0, 1fr)'
                      : 'minmax(0, 1fr) 24px',
                    alignItems: 'center',
                    minWidth: 0,
                    px: 0.25,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ minWidth: 0, px: 0.25, textAlign: 'center' }}
                  >
                    {user.positionName ?? ''}
                  </Typography>
                  {!isFixed && (
                    <IconButton
                      className="participant-remove-action"
                      size="small"
                      aria-label={`결재 참여자 ${order} ${user.label} 삭제`}
                      onClick={() =>
                        onRemoveApprovalUser(stageId, String(user.value))
                      }
                      sx={{ ...participantRemoveActionSx, p: 0.25 }}
                    >
                      <CloseIcon
                        data-testid="approval-remove-icon"
                        fontSize="small"
                      />
                    </IconButton>
                  )}
                </Box>
                <Box
                  aria-label="결재 도장 자리"
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    borderBlock: '1px solid',
                    borderColor: 'divider',
                    color: 'text.disabled',
                    fontSize: '0.75rem',
                  }}
                ></Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 0.5,
                    minWidth: 0,
                    px: 0.25,
                  }}
                >
                  <ApprovalSequenceBadge
                    order={order}
                    aria-label={`참여 순번 ${order}`}
                  />
                  <Typography
                    variant="body2"
                    title={user.label}
                    noWrap
                    sx={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {agreementParticipants.length > 0 && (
        <>
          <Box
            data-testid="document-agreement-display-row"
            sx={{ ...labeledRowSx, alignItems: 'center' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              합의
            </Typography>
            <Box
              data-testid="document-agreement-list"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              {agreementParticipants.map(
                ({ stageId, user, sequence: order }) => (
                  <Box
                    key={`${stageId}-${String(user.value)}`}
                    role="group"
                    aria-label={`합의 ${order} ${user.label}`}
                    data-testid="document-agreement-chip"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      flex: '0 0 auto',
                      height: 40,
                      px: 0.75,
                      border: '1px solid',
                      borderColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'divider' : 'grey.300',
                      borderRadius: 1,
                      color: 'text.primary',
                      ...participantHoverSx,
                    }}
                  >
                    <ApprovalSequenceBadge
                      order={order}
                      aria-label={`참여 순번 ${order}`}
                    />
                    <Typography
                      variant="body2"
                      title={user.label}
                      noWrap
                      sx={{
                        minWidth: 0,
                        maxWidth: '4em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.label}
                    </Typography>
                    <IconButton
                      className="participant-remove-action"
                      size="small"
                      aria-label={`합의 참여자 ${order} ${user.label} 삭제`}
                      onClick={() =>
                        onRemoveApprovalUser(stageId, String(user.value))
                      }
                      sx={{ ...participantRemoveActionSx, p: 0.25 }}
                    >
                      <CloseIcon
                        data-testid="agreement-remove-icon"
                        fontSize="small"
                      />
                    </IconButton>
                  </Box>
                ),
              )}
            </Box>
          </Box>
        </>
      )}

      <DocumentReferenceField
        userOptions={referenceOptions}
        referenceUserIds={referenceUserIds}
        onChange={onReferenceUserChange}
      />
    </Box>
  );
}
