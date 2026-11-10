import { useState } from 'react';
import { PageMessageArea } from './PageMessageArea';

type SearchResultMessageProps = {
  resultCount: number;
};

export function SearchResultMessage({ resultCount }: SearchResultMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const message =
    resultCount === 0
      ? '조회 결과가 없습니다. 조회 기간을 넓히거나 검색 조건을 변경해 주세요.'
      : `조회 결과 총 ${resultCount.toLocaleString()}건입니다.`;

  return (
    <PageMessageArea
      message={message}
      severity="info"
      role="status"
      compact
      onClose={() => setDismissed(true)}
    />
  );
}
