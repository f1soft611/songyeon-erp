export type CommonCodeGroupRow = {
  id: string;
  groupCode: string;
  groupNm: string;
  parentGroupId: string | null;
  groupDc: string;
  sortOrder: number;
  useAt: 'Y' | 'N';
};

export type CommonCodeItemRow = {
  id: string;
  groupId: string;
  itemCode: string;
  itemNm: string;
  parentItemId: string | null;
  parentItemNm: string;
  sortOrder: number;
  useAt: 'Y' | 'N';
  itemDc: string;
};
