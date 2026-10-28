import { useState, type ReactNode } from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import {
  PermissionGroupActionBar,
  type PermissionActionGroupDefinition,
} from './PermissionGroup';

export type PageHeaderProps = {
  breadcrumbItems: string[];
  description: string;
  actionGroups?: PermissionActionGroupDefinition[];
  children?: ReactNode;
};

const PAGE_HEADER_DESCRIPTION_COLLAPSED_KEY =
  'page-header-description-collapsed';

export function PageHeader({
  breadcrumbItems,
  description,
  actionGroups,
  children,
}: PageHeaderProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(
    () =>
      window.localStorage.getItem(PAGE_HEADER_DESCRIPTION_COLLAPSED_KEY) ===
      'true',
  );

  const handleDescriptionToggle = () => {
    setDescriptionCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        PAGE_HEADER_DESCRIPTION_COLLAPSED_KEY,
        String(next),
      );
      return next;
    });
  };

  const breadcrumbText = breadcrumbItems.join(' > ');

  const breadcrumbBlock = (
    <Box
      sx={{
        width: { xs: '100%', sm: 'auto' },
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <Typography
        component="div"
        variant="overline"
        sx={{
          color: '#64748b',
          letterSpacing: 1.4,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          maxWidth: '100%',
          overflowWrap: 'anywhere',
        }}
      >
        <RouteRoundedIcon
          aria-hidden="true"
          sx={{ fontSize: '0.95rem', flexShrink: 0, color: 'text.secondary' }}
        />
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            p: 0,
            m: 0,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            clipPath: 'inset(50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {breadcrumbText}
        </Box>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <Box
              component="span"
              key={`${item}-${index}`}
              sx={
                isLast
                  ? {
                      color: 'text.primary',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }
                  : { color: 'text.secondary' }
              }
            >
              {index > 0 ? ' > ' : ''}
              {item}
              {isLast && (
                <IconButton
                  type="button"
                  size="small"
                  aria-label={
                    descriptionCollapsed
                      ? '페이지 설명 열기'
                      : '페이지 설명 접기'
                  }
                  aria-expanded={!descriptionCollapsed}
                  onClick={handleDescriptionToggle}
                  sx={{
                    width: 20,
                    height: 20,
                    p: 0,
                    color: 'text.secondary',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '50%',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {descriptionCollapsed ? (
                    <KeyboardArrowDownRoundedIcon sx={{ fontSize: '1rem' }} />
                  ) : (
                    <KeyboardArrowUpRoundedIcon sx={{ fontSize: '1rem' }} />
                  )}
                </IconButton>
              )}
            </Box>
          );
        })}
      </Typography>
      {!descriptionCollapsed && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderBottom: '1px solid rgba(148,163,184,0.18)',
        bgcolor: isDark
          ? 'rgba(15, 23, 42, 0.75)'
          : 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {actionGroups ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {breadcrumbBlock}
          <PermissionGroupActionBar groups={actionGroups} />
        </Box>
      ) : (
        breadcrumbBlock
      )}
      {children}
    </Box>
  );
}
