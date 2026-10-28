export type CommonViewMode = 'feed' | 'list' | 'file';

export type CommonFileViewItem = {
  id: string | number;
  name: string;
  ownerLabel: string;
  dateLabel: string;
  sizeLabel: string;
  description?: string;
};
export type CommonViewCategoryColor = 'primary' | 'info' | 'warning' | 'secondary';

export type CommonViewItem = {
  id: string | number;
  title: string;
  authorLabel: string;
  dateLabel: string;
  isPinned?: boolean;
  categoryLabel?: string;
  categoryColor?: CommonViewCategoryColor;
  badgeBorderRadius?: string;
  statusLabel?: string;
  statusColor?: 'default' | 'error' | 'info' | 'success' | 'warning';
  statusVariant?: 'filled' | 'outlined';
  metaLabel?: string;
  summary?: string;
};

export type CommonViewItemRenderer<T> = (
  item: T,
  index: number,
) => React.ReactNode;
