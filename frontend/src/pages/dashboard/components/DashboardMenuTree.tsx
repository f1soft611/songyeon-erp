import { Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import type { MenuTreeNode, ModuleItem } from '../types/dashboard';

type RecentMenuEntry = {
  menuId: string;
  moduleId: string;
  moduleName?: string;
  breadcrumbPath?: string;
  label: string;
  path: string;
  visitedAt: number;
};

type DashboardMenuTreeProps = {
  selectedModule: ModuleItem;
  expandedItemIds: string[];
  selectedMenuId: string;
  recentMenuItems?: RecentMenuEntry[];
  onMenuSelect: (menuId: string) => void;
  onRecentMenuSelect?: (path: string) => void;
  onToggleMenu?: () => void;
};

const formatRecentMenuTime = (visitedAt: number) => {
  const diffMs = Date.now() - visitedAt;

  if (diffMs < 60 * 1000) {
    return '방금';
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return `${days}일 전`;
};

export function DashboardMenuTree({
  selectedModule,
  expandedItemIds,
  selectedMenuId,
  recentMenuItems = [],
  onMenuSelect,
  onRecentMenuSelect,
  onToggleMenu,
}: DashboardMenuTreeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const panelBg = isDark ? '#111827' : '#f7f9fc';
  const softBg = isDark ? '#0f172a' : '#f1f5f9';
  const expandedItemKey = expandedItemIds.join(',');
  const treeStateKey = `${selectedModule.id}:${expandedItemKey}:${selectedMenuId}`;

  const renderMenuNode = (node: MenuTreeNode) => {
    const hasChildren = Boolean(node.children?.length);
    const isSelected = selectedMenuId === node.id;

    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={node.name}
        onClick={
          hasChildren
            ? undefined
            : () => {
                onMenuSelect(node.id);
              }
        }
        sx={{
          '& > .MuiTreeItem-content': {
            minHeight: 36,
            mb: 0.25,
            borderRadius: 1,
            color: hasChildren
              ? isDark
                ? '#cbd5e1'
                : '#475569'
              : isDark
                ? '#dbeafe'
                : '#475569',
            fontWeight: hasChildren ? 800 : isSelected ? 800 : 600,
            fontSize: hasChildren ? '0.72rem' : '0.875rem',
            letterSpacing: hasChildren ? '0.06em' : 0,
            textTransform: hasChildren ? 'uppercase' : 'none',
            borderLeft: isSelected
              ? '3px solid #60a5fa'
              : '3px solid transparent',
            bgcolor: isSelected
              ? isDark
                ? 'rgba(96,165,250,0.18)'
                : '#dfeeff'
              : 'transparent',
            '&:hover': {
              bgcolor: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
            },
          },
          '& > .MuiTreeItem-groupTransition': {
            ml: 1.25,
            pl: 0.75,
            borderLeft: `1px solid ${isDark ? 'rgba(148,163,184,0.2)' : '#dbe3ef'}`,
          },
        }}
      >
        {node.children?.map(renderMenuNode)}
      </TreeItem>
    );
  };

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: panelBg,
        color: isDark ? '#e2e8f0' : '#0f172a',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 2,
          height: 'var(--dashboard-header-height)',
          boxSizing: 'border-box',
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: softBg,
        }}
      >
        <Typography
          component="h2"
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: isDark ? '#cbd5e1' : '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          모듈 선택
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            component="h3"
            variant="caption"
            sx={{
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: 700,
            }}
          >
            {selectedModule.name}
          </Typography>
          {onToggleMenu && (
            <IconButton
              size="small"
              aria-label="메뉴 닫기"
              onClick={onToggleMenu}
              sx={{ color: isDark ? '#cbd5e1' : '#475569' }}
            >
              <CloseOutlined fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          px: 1.5,
          py: 1.5,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          overflowY: 'auto',
        }}
      >
        <SimpleTreeView
          key={treeStateKey}
          defaultExpandedItems={expandedItemIds}
          defaultSelectedItems={selectedMenuId}
          expansionTrigger="content"
          sx={{ flex: 1, overflow: 'auto' }}
        >
          {selectedModule.tree.map(renderMenuNode)}
        </SimpleTreeView>
      </Box>
      <Box
        sx={{
          px: 1.5,
          pt: 1.25,
          pb: 1.25,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.62)' : 'rgba(255,255,255,0.62)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.75,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <HistoryOutlined sx={{ fontSize: 16, color: '#60a5fa' }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: isDark ? '#cbd5e1' : '#475569',
                letterSpacing: '0.06em',
              }}
            >
              최근 사용
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              minWidth: 22,
              px: 0.6,
              py: 0.15,
              borderRadius: 10,
              bgcolor: isDark ? 'rgba(96,165,250,0.18)' : '#dbeafe',
              color: isDark ? '#bfdbfe' : '#2563eb',
              fontWeight: 800,
              textAlign: 'center',
            }}
          >
            {recentMenuItems.length}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {recentMenuItems.length === 0 ? (
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#94a3b8' : '#64748b',
                lineHeight: 1.5,
              }}
            >
              최근 방문한 메뉴가 없습니다.
            </Typography>
          ) : (
            recentMenuItems.map((item) => (
              <Button
                key={`${item.moduleId}:${item.menuId}`}
                variant="text"
                onClick={() => onRecentMenuSelect?.(item.path)}
                sx={{
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  px: 1,
                  py: 0.7,
                  minHeight: 46,
                  borderRadius: 1.5,
                  color: isDark ? '#dbeafe' : '#1e293b',
                  bgcolor: isDark
                    ? 'rgba(96,165,250,0.08)'
                    : 'rgba(37,99,235,0.04)',
                  textTransform: 'none',
                  fontWeight: 600,
                  textAlign: 'left',
                  '&:focus-visible': {
                    outline: `2px solid ${isDark ? '#93c5fd' : '#2563eb'}`,
                    outlineOffset: 1,
                  },
                  '&:hover': {
                    bgcolor: isDark
                      ? 'rgba(96,165,250,0.12)'
                      : 'rgba(37,99,235,0.08)',
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: '#60a5fa',
                    mr: 1,
                    mt: 0.6,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, display: 'block', flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        flexShrink: 0,
                        color: isDark ? '#93c5fd' : '#2563eb',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {formatRecentMenuTime(item.visitedAt)}
                    </Typography>
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      display: 'block',
                      mt: 0.2,
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontSize: '0.68rem',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.breadcrumbPath ||
                      [item.moduleName || item.moduleId, item.label].join(
                        ' > ',
                      )}
                  </Typography>
                </Box>
              </Button>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
