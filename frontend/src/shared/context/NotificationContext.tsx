import { Alert, Snackbar } from '@mui/material';
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

type NotificationContextValue = {
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showError: (message: string) => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  showSuccess: () => undefined,
  showWarning: () => undefined,
  showError: () => undefined,
});

export function NotificationProvider({ children }: PropsWithChildren) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const value = {
    showSuccess: setSuccessMessage,
    showWarning: setWarningMessage,
    showError: setErrorMessage,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(warningMessage)}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setWarningMessage(null)}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setWarningMessage(null)}
        >
          {warningMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setErrorMessage(null)}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  return useContext(NotificationContext);
}
