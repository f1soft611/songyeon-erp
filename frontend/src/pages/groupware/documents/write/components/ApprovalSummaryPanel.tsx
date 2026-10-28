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
  const scopes: Array<{ scope: DocumentApprovalScope; count: number }> = [
    { scope: 'MY_PENDING', count: summary?.actionRequiredCount ?? 0 },
    { scope: 'IN_PROGRESS', count: summary?.inProgressCount ?? 0 },
    { scope: 'DRAFT', count: summary?.draftCount ?? 0 },
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
          {scopes.map(({ scope, count }) => (
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
                {getDocumentApprovalScopeLabel(scope)}
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
