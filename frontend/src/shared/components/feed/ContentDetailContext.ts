import { createContext } from 'react';

export type ContentDetailTarget = {
  kind: 'document' | 'notice';
  id: number;
};

export const ContentDetailContext = createContext<((target: ContentDetailTarget) => void) | null>(null);
