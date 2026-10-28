import { useEffect, useState } from 'react';
import { Box, Button, Collapse, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { BomLog, ProductBomRow } from '../types/itemMaster.types';
import { fetchBomLog } from '../services/itemMaster.service';
import { diffBom } from '../utils/productBom';

// 제품 [이력] 창(2026-10-27, 원재료마스터 이력 칸과 같음): 예전 제품BOM 창의 변경로그 탭. 배합비를 바꾼 때와 바뀐 원재료를 보여 준다
export function ProductBomHistoryDialog({ product, onClose }: { product: Pick<ProductBomRow, 'code' | 'name'>; onClose: () => void }) {
  const [logs, setLogs] = useState<BomLog[]>([]);
  const [openLog, setOpenLog] = useState<number | null>(null);

  useEffect(() => {
    fetchBomLog(product.code).then(setLogs).catch(() => undefined);
  }, [product.code]);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="product-bom-history-title">
      <DialogTitle id="product-bom-history-title" sx={{ pr: 6 }}>
        배합비 이력 — {product.name} ({product.code})
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack divider={<Divider flexItem />}>
          {logs.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>변경 이력이 없습니다</Typography>
          )}
          {logs.map((log, index) => {
            const lines = diffBom(log.oldBom, log.newBom);
            return (
              <Box key={log.logId} sx={{ py: 1 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{log.changedAt.replace('T', ' ')}</Typography>
                  <Button size="small" onClick={() => setOpenLog(openLog === index ? null : index)}>
                    {openLog === index ? '접기' : '상세보기'}
                  </Button>
                </Stack>
                <Collapse in={openLog === index}>
                  <Box sx={{ pl: 1.5, py: 1 }}>
                    {lines.length === 0 && <Typography variant="body2" color="text.secondary">변경된 원재료가 없습니다</Typography>}
                    {lines.map((line, i) => (
                      <Typography
                        key={i}
                        variant="body2"
                        sx={{ color: line.kind === 'add' ? 'success.main' : line.kind === 'remove' ? 'error.main' : 'text.primary' }}
                      >
                        {line.text}
                      </Typography>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
