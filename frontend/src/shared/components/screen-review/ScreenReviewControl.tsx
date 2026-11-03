import { Button } from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import type { ScreenReviewTarget } from './screenReview.types';
import { useScreenReviewDock } from './ScreenReviewDock';
import { ScreenReviewPanel } from './ScreenReviewPanel';
import { useScreenReview } from './useScreenReview';

// 페이지 머리 맨 오른쪽 [화면검수] 단추. 누르면 본문 오른쪽에 검수 패널이 열린다
export function ScreenReviewControl({ target }: { target: ScreenReviewTarget }) {
  const { reviewer } = useScreenReviewDock();
  const review = useScreenReview(target.screenCode, reviewer);

  return (
    <>
      <Button
        size="small"
        variant="contained"
        startIcon={<FactCheckOutlinedIcon fontSize="small" />}
        sx={{ whiteSpace: 'nowrap' }}
        onClick={() => void review.openPanel()}
      >
        화면검수
      </Button>
      <ScreenReviewPanel target={target} review={review} />
    </>
  );
}
