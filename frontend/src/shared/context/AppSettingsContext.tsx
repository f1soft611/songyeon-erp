import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppThemeMode } from '../../theme/theme';
import { createAppTheme } from '../../theme/theme';
import { CssBaseline, ThemeProvider } from '@mui/material';

const THEME_STORAGE_KEY = 'erp-theme';
const DISPLAY_SCALE_STORAGE_KEY = 'erp-display-scale';
const DEFAULT_DISPLAY_SCALE = 1;

type AppSettingsContextValue = {
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => void;
  displayScale: number;
  setDisplayScale: (scale: number) => void;
};

export const AppSettingsContext = createContext<AppSettingsContextValue | null>(
  null,
);

function getStoredThemeMode(): AppThemeMode {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

function getStoredDisplayScale() {
  const value = Number(window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DISPLAY_SCALE;
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<AppThemeMode>(() =>
    getStoredThemeMode(),
  );
  const [displayScale, setDisplayScaleState] = useState<number>(() =>
    getStoredDisplayScale(),
  );

  const setThemeMode = (mode: AppThemeMode) => {
    setThemeModeState(mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    window.dispatchEvent(new Event('erp-settings-change'));
  };

  const setDisplayScale = (scale: number) => {
    const nextScale =
      Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_DISPLAY_SCALE;
    setDisplayScaleState(nextScale);
    window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, String(nextScale));
    window.dispatchEvent(new Event('erp-settings-change'));
  };

  useEffect(() => {
    const handlePreferenceChange = () => {
      setThemeModeState(getStoredThemeMode());
      setDisplayScaleState(getStoredDisplayScale());
    };

    window.addEventListener('erp-settings-change', handlePreferenceChange);
    return () => {
      window.removeEventListener('erp-settings-change', handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${displayScale * 16}px`;
    document.documentElement.style.colorScheme = themeMode;
    document.body.style.backgroundColor =
      themeMode === 'dark' ? '#0f172a' : '#f4f7fb';
    document.body.style.color = themeMode === 'dark' ? '#e2e8f0' : '#0f172a';
    return () => {
      document.documentElement.style.fontSize = '16px';
      document.documentElement.style.colorScheme = 'light';
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, [displayScale, themeMode]);

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  return (
    <AppSettingsContext.Provider
      value={{ themeMode, setThemeMode, displayScale, setDisplayScale }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppSettingsContext.Provider>
  );
}

export function useOptionalAppSettings() {
  return useContext(AppSettingsContext);
}

export function useAppSettings() {
  const context = useOptionalAppSettings();
  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }
  return context;
}

export function useOptionalDisplayScale(): number {
  const context = useOptionalAppSettings();
  return context?.displayScale ?? DEFAULT_DISPLAY_SCALE;
}
