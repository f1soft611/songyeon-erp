import { useState } from 'react';

type UsePaginationArgs = {
  initialPage?: number;
  initialPageSize?: number;
};

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
}: UsePaginationArgs = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  return { page, pageSize, setPage, setPageSize };
}
