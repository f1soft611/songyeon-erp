import { Stack, TextField, Typography } from '@mui/material';
import { useId } from 'react';
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
  const fieldId = useId();

  return (
    <Stack spacing={0.5}>
      <Typography
        component="label"
        htmlFor={fieldId}
        sx={{
          color: 'text.secondary',
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
      <TextField
        {...props}
        id={fieldId}
        margin="none"
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
                minHeight: 56,
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
                  fontSize: 18,
                  paddingTop: '15px',
                  paddingBottom: '15px',
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
        sx={{
          '& .MuiInputBase-root': {
            minHeight: 56,
          },
        }}
        aria-invalid={Boolean(error)}
      />
    </Stack>
  );
}

export default LoginFormField;
