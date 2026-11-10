import { useState, type FormEvent } from 'react';
import { Box, Button, IconButton, TextField, Tooltip } from '@mui/material';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import { useLocation, useNavigate } from 'react-router-dom';

type UnifiedSearchProps = { variant?: 'header' | 'page' };

function SearchForm({ variant, initialKeyword }: UnifiedSearchProps & { initialKeyword: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [error, setError] = useState('');
  const isPage = variant === 'page';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = keyword.trim();
    if (text.length < 2 || text.length > 100) {
      setError('검색어는 2~100자로 입력해 주세요.');
      return;
    }
    setError('');
    navigate(`/search?${new URLSearchParams({ keyword: text, type: 'ALL', page: '1' })}`, {
      state: { searchRequest: location.key },
    });
  };

  return (
    <Box
      component="form"
      role="search"
      aria-label={isPage ? '결과 다시 검색' : '상단 통합검색'}
      onSubmit={submit}
      sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0,
        width: isPage ? '100%' : { xs: '100%', sm: 220, lg: 280 },
      }}
    >
      <TextField
        fullWidth
        margin="none"
        size="small"
        placeholder="메뉴, 문서, 공지 검색"
        value={keyword}
        error={Boolean(error)}
        helperText={isPage ? error : undefined}
        onChange={(event) => {
          setKeyword(event.target.value);
          if (error) setError('');
        }}
        slotProps={{ htmlInput: {
          maxLength: 100, 'aria-label': isPage ? '결과 검색어' : '통합검색 검색어',
        } }}
        sx={{ minWidth: 0 }}
      />
      {isPage ? (
        <Button type="submit" variant="contained" sx={{ minHeight: 40, flexShrink: 0 }}>다시 검색</Button>
      ) : (
        <Tooltip title="통합검색">
          <IconButton
            type="submit"
            aria-label="통합검색 실행"
            sx={{ color: 'primary.main', flexShrink: 0 }}
          >
            <SearchOutlined />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

export function UnifiedSearch({ variant = 'header' }: UnifiedSearchProps) {
  const location = useLocation();
  const keyword = location.pathname.replace(/\/+$/, '') === '/search'
    ? new URLSearchParams(location.search).get('keyword') ?? '' : '';
  return <SearchForm key={location.key} variant={variant} initialKeyword={keyword} />;
}
