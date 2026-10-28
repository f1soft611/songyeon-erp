import { createTheme } from '@mui/material/styles';

export type AppThemeMode = 'light' | 'dark';

const basePalette = {
  primary: {
    main: '#1d4ed8',
    dark: '#1e3a8a',
    light: '#93c5fd',
  },
  secondary: {
    main: '#0f172a',
  },
  shape: {
    borderRadius: 6,
  },
};

export function createAppTheme(mode: AppThemeMode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#60a5fa' : '#1d4ed8',
        dark: isDark ? '#3b82f6' : '#1e3a8a',
        light: isDark ? '#bfdbfe' : '#93c5fd',
      },
      secondary: {
        main: isDark ? '#e2e8f0' : '#0f172a',
      },
      background: {
        default: isDark ? '#0f172a' : '#f4f7fb',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e2e8f0' : '#0f172a',
        secondary: isDark ? '#cbd5e1' : '#475569',
      },
    },
    shape: {
      borderRadius: basePalette.shape.borderRadius,
    },
    typography: {
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.03em',
      },
      button: {
        fontWeight: 700,
      },
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: basePalette.shape.borderRadius,
            textTransform: 'none',
            boxShadow: 'none',
            minHeight: 32,
            padding: '6px 12px',
            fontSize: '0.8125rem',
            lineHeight: 1.4,
            letterSpacing: '0.01em',
            transition: 'all 0.2s ease',
          },
          sizeSmall: {
            minHeight: 28,
            padding: '4px 10px',
            fontSize: '0.75rem',
          },
          sizeLarge: {
            minHeight: 40,
            padding: '10px 18px',
            fontSize: '0.9375rem',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
          margin: 'normal',
        },
      },
    },
  });
}

export default createAppTheme();
