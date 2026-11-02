import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../../dashboard/types/dashboard';
import type { DocumentApprovalScope } from '../../write/types/documentWrite.types';

export type DocumentStatusPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
  dashboardScope?: DocumentApprovalScope | null;
  onDashboardScopeChange?: (scope: DocumentApprovalScope | null) => void;
};
