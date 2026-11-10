import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ProfileAvatar } from '../../../../shared/components/ProfileAvatar';
import type { MessageUserOption } from '../types/message.types';

/** Matches name or department; name-prefix matches come first. */
function filterRecipientOptions(options: MessageUserOption[], query: string): MessageUserOption[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return options;
  const rank = (user: MessageUserOption) => {
    const name = user.userNm.toLowerCase();
    if (name.startsWith(keyword)) return 0;
    if (name.includes(keyword)) return 1;
    return user.departmentNm.toLowerCase().includes(keyword) ? 2 : -1;
  };
  return options
    .map((user, index) => ({ user, index, score: rank(user) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.user);
}

function RecipientAvatar({ user, testId }: { user: MessageUserOption; testId?: string }) {
  return (
    <ProfileAvatar
      data-testid={testId}
      name={user.userNm}
      imageUrl={user.profileImage}
      fallback={user.userNm.trim().charAt(0)}
      sx={{
        width: 28,
        height: 28,
        flexShrink: 0,
        fontSize: '0.8rem',
        fontWeight: 700,
        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.4 : 0.16),
        color: (theme) => (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main),
      }}
    />
  );
}

interface MessageRecipientSelectProps {
  users: MessageUserOption[];
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
}

export function MessageRecipientSelect({ users, value, onChange, disabled }: MessageRecipientSelectProps) {
  const selected = users.find((user) => user.userId === value) ?? null;
  return (
    <Autocomplete
      options={users}
      value={selected}
      disabled={disabled}
      onChange={(_, user) => onChange(user?.userId ?? '')}
      filterOptions={(options, state) => filterRecipientOptions(options, state.inputValue)}
      getOptionLabel={(user) => user.userNm}
      isOptionEqualToValue={(option, current) => option.userId === current.userId}
      noOptionsText="검색 결과가 없습니다."
      renderOption={({ key, ...optionProps }, user) => (
        <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <RecipientAvatar user={user} testId="recipient-option-avatar" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{user.userNm}</Typography>
            {user.departmentNm && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {user.departmentNm}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="받는 사람"
          placeholder="이름 또는 부서 검색"
          required
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: selected
                ? <Box sx={{ display: 'flex', ml: 0.5, mr: 0.5 }}><RecipientAvatar user={selected} /></Box>
                : params.slotProps.input.startAdornment,
            },
          }}
        />
      )}
    />
  );
}
