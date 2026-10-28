import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Fragment } from 'react';
import type { DocumentWriteItem } from '../types/documentWrite.types';

type ApprovalNoticePanelProps = {
  items: DocumentWriteItem[];
  onSelect: (electronicApprovalId: number) => void;
};

export function ApprovalNoticePanel({ items, onSelect }: ApprovalNoticePanelProps) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          놓치지 마세요
        </Typography>
        <Stack spacing={1}>
          {items.slice(0, 3).map((item) => (
            <Button
              key={item.id}
              variant="text"
              onClick={() => onSelect(item.id)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                width: '100%',
                minWidth: 0,
                gap: 1,
                p: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'action.hover',
                color: 'text.primary',
                textAlign: 'left',
                textTransform: 'none',
              }}
            >
              <Stack
                component="span"
                direction="row"
                sx={{
                  width: '100%',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 0.75,
                }}
              >
                <Typography component="span" variant="caption" color="text.secondary">
                  {item.status === '보완요청' ? '보완 요청 문서' : '결재 요청 도착'}
                </Typography>
                <Chip
                  component="span"
                  label={item.status}
                  size="small"
                  color={item.statusColor ?? 'default'}
                  variant={item.statusVariant ?? 'outlined'}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    borderRadius: item.badgeBorderRadius ?? '8px',
                  }}
                />
              </Stack>
              <Typography
                component="span"
                variant="body2"
                sx={{
                  width: '100%',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  lineHeight: 1.5,
                  fontWeight: 700,
                }}
              >
                {item.title}
              </Typography>
              <Box
                component="span"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                  columnGap: 1.5,
                  rowGap: 0.5,
                  width: '100%',
                  minWidth: 0,
                  pt: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {[
                  ['업무구분', item.kind],
                  ['기안자', item.author],
                  [item.dateSourceLabel ?? '일자', item.date || '—'],
                ].map(([label, value]) => (
                  <Fragment key={label}>
                    <Typography component="span" variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                    >
                      {value}
                    </Typography>
                  </Fragment>
                ))}
              </Box>
            </Button>
          ))}
          {items.length === 0 && (
            <Box sx={{ py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                새로운 결재 알림이 없습니다.
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
