import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type {
  DocumentApprovalScope,
  DocumentApprovalSummary,
} from '../types/documentWrite.types';
import { getDocumentApprovalScopeLabel } from '../data/documentPresentation';

type ApprovalSummaryPanelProps = {
  summary: DocumentApprovalSummary | null;
  onSelectScope: (scope: DocumentApprovalScope) => void;
};

export function ApprovalSummaryPanel({
  summary,
  onSelectScope,
}: ApprovalSummaryPanelProps) {
  const scopes: Array<{ scope: DocumentApprovalScope; count: number; label: string }> = [
    {
      scope: 'MY_PENDING',
      count: summary?.actionRequiredCount ?? 0,
      label: getDocumentApprovalScopeLabel('MY_PENDING'),
    },
    {
      scope: 'IN_PROGRESS',
      count: summary?.inProgressCount ?? 0,
      label: getDocumentApprovalScopeLabel('IN_PROGRESS'),
    },
    {
      scope: 'DRAFT',
      count: summary?.draftCount ?? 0,
      label: getDocumentApprovalScopeLabel('DRAFT'),
    },
    {
      scope: 'MY_REFERENCE_PENDING',
      count: summary?.referenceConfirmationRequiredCount ?? 0,
      label: '내가 확인할 문서',
    },
    {
      scope: 'MY_FINAL_CONFIRMATION_PENDING',
      count: summary?.finalConfirmationRequiredCount ?? 0,
      label: getDocumentApprovalScopeLabel('MY_FINAL_CONFIRMATION_PENDING'),
    },
  ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          결재 요약
        </Typography>
        <Stack spacing={1}>
          {scopes.map(({ scope, count, label }) => (
            <Button
              key={scope}
              variant="text"
              onClick={() => onSelectScope(scope)}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                py: 1,
                px: 1,
                borderBottom: '1px solid rgba(148,163,184,0.16)',
                borderRadius: 1,
                color: 'text.primary',
                textTransform: 'none',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {count}건
              </Typography>
            </Button>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
