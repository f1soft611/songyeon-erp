import { Box } from '@mui/material';

type ApprovalSequenceBadgeProps = {
  order: number;
  'aria-label'?: string;
  testId?: string;
};

export function ApprovalSequenceBadge({
  order,
  'aria-label': ariaLabel,
  testId,
}: ApprovalSequenceBadgeProps) {
  return (
    <Box
      component="span"
      aria-label={ariaLabel}
      data-testid={testId}
      sx={{
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 24px',
        width: 24,
        height: 24,
        border: '1px solid',
        borderColor: 'text.secondary',
        borderRadius: '50%',
        fontSize: '1rem',
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {order}
    </Box>
  );
}
