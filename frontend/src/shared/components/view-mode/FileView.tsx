import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { Alert, Box, Button, CircularProgress, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import type { CommonFileViewItem } from './commonViewTypes';

type FileViewProps<T extends CommonFileViewItem> = {
  items: T[];
  isLoading: boolean;
  hasNext: boolean;
  error: string;
  onLoadMore: () => void;
  onRetry: () => void;
  onRefresh?: () => void;
  onDownload: (item: T) => void;
  onOpenSource?: (item: T) => void;
  scrollRoot?: HTMLElement | null;
};

function FileIcon({ name }: { name: string }) {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return <PictureAsPdfOutlinedIcon color="error" />;
  if (['xlsx', 'xls', 'csv'].includes(extension ?? '')) return <TableChartOutlinedIcon color="success" />;
  if (['pptx', 'ppt'].includes(extension ?? '')) return <SlideshowOutlinedIcon color="warning" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension ?? '')) return <ImageOutlinedIcon color="info" />;
  return <DescriptionOutlinedIcon color="primary" />;
}

export function FileView<T extends CommonFileViewItem>({
  items, isLoading, hasNext, error, onLoadMore, onRetry, onRefresh,
  onDownload, onOpenSource, scrollRoot,
}: FileViewProps<T>) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNext || isLoading || error || !sentinel.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { root: scrollRoot ?? null, rootMargin: '160px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasNext, isLoading, error, onLoadMore, scrollRoot, items.length]);

  const columns = { xs: 'minmax(0, 1fr) 36px', md: 'minmax(0, 1fr) 110px 150px 80px 36px' };
  return (
    <Box aria-label="파일형 첨부파일 목록" sx={{
      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.paper' : 'common.white',
    }}>
      <Box sx={{
        display: { xs: 'none', md: 'grid' }, gridTemplateColumns: columns,
        gap: 1.5, px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider',
      }}>
        {['이름', '소유자', '올린 날짜', '크기'].map((label) =>
          <Typography key={label} variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>)}
      </Box>
      {items.map((item) => (
        <Box key={item.id} data-testid="file-view-row" sx={{
          display: 'grid', gridTemplateColumns: columns, alignItems: 'center',
          columnGap: 1.5, rowGap: 0.5, px: 1.5, py: 1.25,
          borderBottom: 1, borderColor: 'divider', minWidth: 0,
          '&:hover': { bgcolor: 'action.hover' },
        }}>
          <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, alignItems: 'center' }}>
            <FileIcon name={item.name} />
            <Box sx={{ minWidth: 0 }}>
              <Button variant="text" aria-label={`${item.name} 다운로드`}
                onClick={() => onDownload(item)}
                sx={{ p: 0, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none',
                  overflowWrap: 'anywhere', fontWeight: 400 }}>
                {item.name}
              </Button>
              {item.description && <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', overflowWrap: 'anywhere' }}>{item.description}</Typography>}
              <Typography variant="caption" color="text.secondary"
                sx={{ display: { xs: 'block', md: 'none' }, overflowWrap: 'anywhere' }}>
                {item.ownerLabel} · {item.dateLabel} · {item.sizeLabel}
              </Typography>
            </Box>
          </Stack>
          {[item.ownerLabel, item.dateLabel, item.sizeLabel].map((label, index) =>
            <Typography key={index} variant="body2" color="text.secondary"
              sx={{ display: { xs: 'none', md: 'block' }, overflowWrap: 'anywhere' }}>{label}</Typography>)}
          {onOpenSource && (
            <Tooltip title="원문 보기">
              <IconButton size="small" aria-label={`${item.name} 원문 보기`} onClick={() => onOpenSource(item)}>
                <OpenInNewOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}
      {error && <Alert severity="error" sx={{ my: 1.5 }} action={
        <Stack direction="row">
          <Button color="inherit" size="small" onClick={onRetry}>다시 시도</Button>
          {onRefresh && <Button color="inherit" size="small" onClick={onRefresh}>목록 새로고침</Button>}
        </Stack>
      }>{error}</Alert>}
      {isLoading && items.length === 0 ? (
        <Stack role="status" aria-label="파일 불러오는 중" data-testid="file-view-skeleton">
          {Array.from({ length: 8 }).map((_, index) => (
            <Box key={index} data-testid="file-view-skeleton-row" sx={{
              display: 'grid', gridTemplateColumns: columns, alignItems: 'center',
              columnGap: 1.5, rowGap: 0.5, px: 1.5, py: 1.25,
              borderBottom: 1, borderColor: 'divider', minWidth: 0,
            }}>
              <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, alignItems: 'center' }}>
                <Skeleton variant="rounded" width={22} height={26} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Skeleton variant="text" width={`${55 + (index % 4) * 10}%`} height={24} />
                  <Skeleton variant="text" width="70%" height={18}
                    sx={{ display: { xs: 'block', md: 'none' } }} />
                </Box>
              </Stack>
              <Skeleton variant="text" width="72px" height={22}
                sx={{ display: { xs: 'none', md: 'block' } }} />
              <Skeleton variant="text" width="104px" height={22}
                sx={{ display: { xs: 'none', md: 'block' } }} />
              <Skeleton variant="text" width="42px" height={22}
                sx={{ display: { xs: 'none', md: 'block' } }} />
              {onOpenSource && <Skeleton variant="circular" width={32} height={32} />}
            </Box>
          ))}
        </Stack>
      ) : isLoading ? (
        <Stack role="status" aria-label="파일 페이지 불러오는 중" direction="row" sx={{
          py: 3, alignItems: 'center', justifyContent: 'center',
        }}>
          <CircularProgress size={24} color="primary" aria-label="로딩 중" />
        </Stack>
      ) : null}
      {!isLoading && !error && items.length === 0 &&
        <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>첨부파일이 없습니다.</Typography>}
      {hasNext && !error && (
        <Box ref={sentinel} data-testid="file-view-sentinel" sx={{ textAlign: 'center', py: 1 }}>
          <Button onClick={onLoadMore} disabled={isLoading} size="small">더 불러오기</Button>
        </Box>
      )}
    </Box>
  );
}
