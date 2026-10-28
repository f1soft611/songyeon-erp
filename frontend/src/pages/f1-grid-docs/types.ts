import type { ReactNode } from 'react';

export type PlaygroundKind =
  | 'row-height'
  | 'editing'
  | 'selection'
  | 'layout'
  | 'large-data'
  | 'row-merge'
  | 'row-form-modal'
  | 'context-menu'
  | 'tree';

export type DocSection =
  | { type: 'prose'; heading: string; body: ReactNode }
  | { type: 'code'; heading: string; code: string }
  | {
      type: 'api';
      heading: string;
      rows: Array<[name: string, type: string, description: string, defaultValue?: string]>;
    }
  | {
      type: 'related';
      heading: string;
      links: Array<{ id: string; label: string }>;
    };

export type F1GridDocGroup =
  | 'getting-started'
  | 'grid-data'
  | 'editing-validation'
  | 'selection-actions'
  | 'filtering-sorting'
  | 'column-layout'
  | 'large-data'
  | 'tree-grid'
  | 'row-merge'
  | 'plugins'
  | 'api-reference'
  | 'testing';

export type F1GridDoc = {
  id: string;
  title: string;
  category: 'guide' | 'feature' | 'reference';
  group: F1GridDocGroup;
  description: string;
  sections: DocSection[];
  playground?: PlaygroundKind;
};
