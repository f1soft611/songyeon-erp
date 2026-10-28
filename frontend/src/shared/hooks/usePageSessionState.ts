import { useEffect, useRef, useState } from 'react';

export type PageSessionStateOptions<T> = {
  version?: number;
  validate?: (value: unknown) => value is T;
  persistWhen?: boolean | ((value: T) => boolean);
};

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export function readPageSessionState<T>(
  pageKey: string,
  fallback: T,
  options: PageSessionStateOptions<T> = {},
): T {
  const storage = getSessionStorage();
  const key = (pageKey || 'page-session').trim();

  if (!storage || !key) {
    return fallback;
  }

  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(rawValue) as
      | T
      | {
          version?: number;
          value?: T;
        };
    const hasVersionEnvelope = options.version !== undefined;
    const value = hasVersionEnvelope
      ? (parsedValue as { version?: number; value?: T }).version ===
        options.version
        ? (parsedValue as { value?: T }).value
        : undefined
      : parsedValue;

    if (value === undefined || (options.validate && !options.validate(value))) {
      storage.removeItem(key);
      return fallback;
    }

    return value as T;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}

export function writePageSessionState<T>(
  pageKey: string,
  value: T,
  options: PageSessionStateOptions<T> = {},
): void {
  const storage = getSessionStorage();
  const key = (pageKey || 'page-session').trim();

  if (!storage || !key) {
    return;
  }

  try {
    const nextValue =
      options.version === undefined
        ? value
        : { version: options.version, value };
    storage.setItem(key, JSON.stringify(nextValue));
  } catch {
    // Ignore quota/storage errors and keep the in-memory state usable.
  }
}

export function clearPageSessionState(pageKey: string): void {
  const storage = getSessionStorage();
  const key = (pageKey || 'page-session').trim();

  if (storage && key) {
    storage.removeItem(key);
  }
}

export function usePageSessionState<T>(
  pageKey: string,
  initialState: T,
  options: PageSessionStateOptions<T> = {},
) {
  const key = (pageKey || 'page-session').trim();
  const { version, validate, persistWhen = true } = options;
  const skipNextPersistRef = useRef(false);
  const [state, setState] = useState<T>(() =>
    readPageSessionState<T>(key, initialState, options),
  );

  useEffect(() => {
    const shouldPersist =
      typeof persistWhen === 'function' ? persistWhen(state) : persistWhen;
    if (!shouldPersist) {
      return;
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    writePageSessionState(key, state, { version, validate });
  }, [key, persistWhen, state, validate, version]);

  const resetState = () => {
    skipNextPersistRef.current = true;
    clearPageSessionState(key);
    setState(initialState);
  };

  return { state, setState, resetState };
}
