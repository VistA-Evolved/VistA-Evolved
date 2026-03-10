'use client';

/**
 * Debounce hook -- Phase 15E.
 *
 * Returns a debounced version of the input value that only updates
 * after the specified delay. Useful for search inputs.
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
