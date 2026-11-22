import { useEffect, useState } from 'react';

export function useMapListPagination(itemCount: number) {
  const pageSize = 4;
  const [requestedPage, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  useEffect(() => {
    if (requestedPage > totalPages) setPage(totalPages);
  }, [requestedPage, totalPages]);
  const start = (page - 1) * pageSize;
  return { page, setPage, totalPages, start, end: Math.min(start + pageSize, itemCount) };
}
