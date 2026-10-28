import {
  Box,
  ListItemButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import type { ModuleItem } from '../types/dashboard';

type DashboardModuleSectionProps = {
  moduleItems: ModuleItem[];
  selectedModuleId: string;
  onModuleChange: (moduleId: string) => void;
};

export function DashboardModuleSection({
  moduleItems,
  selectedModuleId,
  onModuleChange,
}: DashboardModuleSectionProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const railBg = isDark ? '#0b1220' : '#edf3ff';

  return (
    <Box
      sx={{
        width: 92,
        bgcolor: railBg,
        borderRight: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        px: 1,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: isDark ? '#cbd5e1' : '#475569',
          mb: 2,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        SONGYEON
      </Typography>

      <Stack spacing={1} sx={{ width: '100%' }}>
        {moduleItems.map(({ id, name, icon }) => (
          <ListItemButton
            key={id}
            selected={selectedModuleId === id}
            onClick={() => onModuleChange(id)}
            aria-label={name}
            sx={{
              borderRadius: 1.5,
              minHeight: 56,
              px: 0.5,
              py: 0.5,
              color:
                selectedModuleId === id
                  ? isDark
                    ? '#ffffff'
                    : '#1d4ed8'
                  : isDark
                    ? '#cbd5e1'
                    : '#475569',
              background:
                selectedModuleId === id
                  ? isDark
                    ? 'linear-gradient(180deg, rgba(59,130,246,0.30), rgba(30,64,175,0.18))'
                    : 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)'
                  : 'transparent',
              border:
                selectedModuleId === id
                  ? isDark
                    ? '1px solid rgba(96,165,250,0.6)'
                    : '1px solid rgba(37,99,235,0.75)'
                  : '1px solid transparent',
              boxShadow:
                selectedModuleId === id && !isDark
                  ? '0 8px 18px rgba(37, 99, 235, 0.16)'
                  : 'none',
              '&:hover': {
                bgcolor: isDark
                  ? 'rgba(148, 163, 184, 0.08)'
                  : 'rgba(96, 165, 250, 0.06)',
              },
              '&.Mui-selected': {
                bgcolor: isDark
                  ? 'linear-gradient(180deg, rgba(59,130,246,0.30), rgba(30,64,175,0.18))'
                  : 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.4,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  lineHeight: 1,
                  color: 'currentColor',
                }}
              >
                {icon}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  textAlign: 'center',
                }}
              >
                {name}
              </Typography>
            </Box>
          </ListItemButton>
        ))}
      </Stack>
    </Box>
  );
}
