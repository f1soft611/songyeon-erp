export type SearchCategory = 'MENU' | 'DOCUMENT' | 'NOTICE';
export type SearchType = 'ALL' | SearchCategory;

export type SearchItem = {
  id: number;
  type: SearchCategory;
  title: string;
  description: string;
  path: string;
};

export type SearchGroup = {
  type: SearchCategory;
  items: SearchItem[];
  totalCount: number;
  offset: number;
  limit: number;
};

export type SearchResponse = {
  groups: SearchGroup[];
};
