import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Box, Button, Typography } from '@mui/material';

export function EmptyDocumentList({ onCreate }: { onCreate: () => void }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        조건에 맞는 문서가 없습니다.
      </Typography>
      <Button sx={{ mt: 1 }} onClick={onCreate} startIcon={<AddOutlinedIcon />}>
        문서 작성
      </Button>
    </Box>
  );
}
