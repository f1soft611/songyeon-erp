import { useEffect, useState } from 'react';

export function useDebouncedSearch(initialValue: string, delay = 200) {
  const [search, setSearch] = useState(initialValue);
  const [debouncedSearch, setDebouncedSearch] = useState(initialValue);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [search, delay]);

  return { search, setSearch, debouncedSearch };
}
