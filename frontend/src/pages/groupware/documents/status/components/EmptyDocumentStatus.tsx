import { Box, Button, Typography } from '@mui/material';

type EmptyDocumentStatusProps = {
  onReset: () => void;
};

export function EmptyDocumentStatus({ onReset }: EmptyDocumentStatusProps) {
  return (
    <Box
      role="status"
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        px: 2,
        py: 1.5,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        조회 결과가 없습니다. 조회 기간을 넓히거나 상세검색 조건을
        초기화해 주세요.
      </Typography>
      <Button type="button" size="small" onClick={onReset}>
        검색 조건 초기화
      </Button>
    </Box>
  );
}
