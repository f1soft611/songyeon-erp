import { TextField } from '@mui/material';
import type { ComponentProps, ReactNode } from 'react';

type LoginFormFieldProps = Omit<
  ComponentProps<typeof TextField>,
  'variant' | 'onChange' | 'error'
> & {
  label: string;
  error?: string;
  onChange?: (value: string) => void;
  endAdornment?: ReactNode;
};

function LoginFormField({
  label,
  error,
  onChange,
  endAdornment,
  ...props
}: LoginFormFieldProps) {
  return (
    <TextField
      {...props}
      label={label}
      variant="outlined"
      error={Boolean(error)}
      helperText={error ?? ' '}
      onChange={(event) => onChange?.(event.target.value)}
      slotProps={{
        input: {
          endAdornment,
          sx: (theme) => {
            const isDark = theme.palette.mode === 'dark';
            return {
              borderRadius: 2,
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              color: isDark ? '#e2e8f0' : '#0f172a',
              minHeight: 52,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? 'rgba(148,163,184,0.5)' : '#cbd5e1',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? '#60a5fa' : '#94a3b8',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: 1.5,
                borderColor: isDark ? '#60a5fa' : '#2563eb',
              },
              '& input': {
                color: isDark ? '#e2e8f0' : '#0f172a',
                WebkitTextFillColor: isDark ? '#e2e8f0' : '#0f172a',
              },
            };
          },
        },
        formHelperText: {
          sx: {
            margin: 0,
            minHeight: '0.75em',
            lineHeight: 1.2,
          },
        },
      }}
      sx={(theme) => ({
        '& .MuiInputBase-root': {
          minHeight: 52,
        },
        '& .MuiInputLabel-root': {
          color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: theme.palette.mode === 'dark' ? '#93c5fd' : '#2563eb',
        },
      })}
      aria-invalid={Boolean(error)}
    />
  );
}

export default LoginFormField;
