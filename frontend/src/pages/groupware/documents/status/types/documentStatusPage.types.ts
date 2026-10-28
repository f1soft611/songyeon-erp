import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../../dashboard/types/dashboard';

export type DocumentStatusPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
};
