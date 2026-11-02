import { Button, type ButtonProps } from '@mui/material';
import { AppLoadingSpinner } from './AppLoadingSpinner';

type AppSaveButtonProps = Omit<ButtonProps, 'loading' | 'loadingIndicator' | 'loadingPosition'> & {
  saving?: boolean;
  savingLabel?: ButtonProps['children'];
  progressLabel?: string;
};

export function AppSaveButton({
  saving = false,
  savingLabel,
  progressLabel = '저장 중',
  children = '저장',
  startIcon,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: AppSaveButtonProps) {
  const label = saving ? savingLabel ?? children : children;
  return (
    <Button
      {...props}
      aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      aria-busy={saving}
      disabled={disabled || saving}
      startIcon={saving
        ? <AppLoadingSpinner size={16} color="inherit" aria-label={progressLabel} />
        : startIcon}
    >
      {label}
    </Button>
  );
}
