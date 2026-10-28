import { Box, Typography } from '@mui/material';
import { formatKg, scheduleSummary } from '../utils/schedule';

type ScheduleSummaryProps = {
  rows: { orderQty?: string | null }[];
  countLabel: string; // '생산품목수량' | '출고품목수량'
  totalLabel: string; // '총생산량' | '총출고량'
};

// 표 아래 합계: 건수 · 수량 합(송연 생산스케줄 · 물류스케줄과 같음)
export function ScheduleSummary({ rows, countLabel, totalLabel }: ScheduleSummaryProps) {
  const summary = scheduleSummary(rows);
  return (
    <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
      {countLabel}: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{summary.count}건</Box>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      {totalLabel}: <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatKg(summary.total)}</Box>
    </Typography>
  );
}
