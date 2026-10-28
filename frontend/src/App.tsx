import { Box } from '@mui/material';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { NoticeLoginPopupHost } from './pages/groupware/community/notice/components/NoticeLoginPopupHost';
import { AppSettingsProvider } from './shared/context/AppSettingsContext';
import { NotificationProvider } from './shared/context/NotificationContext';

function App() {
  const Router = import.meta.env.MODE === 'test' ? MemoryRouter : BrowserRouter;

  return (
    <AppSettingsProvider>
      <NotificationProvider>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          <Router initialEntries={[window.location.pathname || '/login']}>
            <AppRouter />
            <NoticeLoginPopupHost />
          </Router>
        </Box>
      </NotificationProvider>
    </AppSettingsProvider>
  );
}

export default App;
