import { Button } from '@mui/material';
import { PageMessageArea } from './PageMessageArea';

type EmptySearchResultMessageProps = {
  onReset: () => void;
};

export function EmptySearchResultMessage({ onReset }: EmptySearchResultMessageProps) {
  return (
    <PageMessageArea
      message="조회 결과가 없습니다. 조회 기간을 넓히거나 상세검색 조건을 초기화해 주세요."
      severity="info"
      role="status"
      action={
        <Button type="button" size="small" onClick={onReset}>
          검색 조건 초기화
        </Button>
      }
    />
  );
}
