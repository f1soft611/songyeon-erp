import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, List, ListItemButton,
  Stack, Typography,
} from '@mui/material';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { UnifiedSearch } from '../../shared/components/search/UnifiedSearch';
import { searchUnified } from '../../shared/services/unifiedSearchService';
import type { SearchResponse, SearchType } from '../../shared/types/unifiedSearch.types';

const labels: Record<SearchType, string> = {
  ALL: '전체', MENU: '메뉴', DOCUMENT: '문서', NOTICE: '공지',
};
const types: SearchType[] = ['ALL', 'MENU', 'DOCUMENT', 'NOTICE'];
type SearchState = { key: string; data?: SearchResponse; error?: string };

function Highlight({ title, keyword }: { title: string; keyword: string }) {
  const start = title.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase());
  if (start < 0) return title;
  return <>
    {title.slice(0, start)}
    <Box component="mark" sx={{ color: 'primary.main', bgcolor: 'action.selected', fontWeight: 'inherit' }}>
      {title.slice(start, start + keyword.length)}
    </Box>
    <Highlight title={title.slice(start + keyword.length)} keyword={keyword} />
  </>;
}

export function UnifiedSearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const keyword = (params.get('keyword') ?? '').trim();
  const typeValue = params.get('type') ?? 'ALL';
  const type = types.find((value) => value === typeValue) ?? 'ALL';
  const pageValue = params.get('page') ?? '1';
  const page = Number(pageValue);
  const valid = keyword.length >= 2 && keyword.length <= 100 && types.includes(typeValue as SearchType)
    && /^[1-9]\d*$/.test(pageValue) && page <= 1001 && (type !== 'ALL' || page === 1);
  const [retry, setRetry] = useState(0);
  const [summary, setSummary] = useState<SearchState | null>(null);
  const [detail, setDetail] = useState<SearchState | null>(null);
  const [navigationError, setNavigationError] = useState<{ key: string; message: string } | null>(null);
  const submittedRequest = typeof location.state?.searchRequest === 'string' ? location.state.searchRequest : '';
  const summaryKey = JSON.stringify([keyword, submittedRequest, retry]);
  const detailKey = JSON.stringify([keyword, submittedRequest, type, page, retry]);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    void searchUnified(keyword, 'ALL', 0).then(
      (data) => { if (active) setSummary({ key: summaryKey, data }); },
      (cause: unknown) => {
        if (active) setSummary({ key: summaryKey, error: cause instanceof Error ? cause.message : '검색 결과를 불러오지 못했습니다.' });
      },
    );
    return () => { active = false; };
  }, [keyword, summaryKey, valid]);

  useEffect(() => {
    if (!valid || type === 'ALL') return;
    let active = true;
    void searchUnified(keyword, type, (page - 1) * 10).then(
      (data) => { if (active) setDetail({ key: detailKey, data }); },
      (cause: unknown) => {
        if (active) setDetail({ key: detailKey, error: cause instanceof Error ? cause.message : '검색 결과를 불러오지 못했습니다.' });
      },
    );
    return () => { active = false; };
  }, [keyword, type, page, detailKey, valid]);

  const currentSummary = summary?.key === summaryKey ? summary : null;
  const currentDetail = type === 'ALL' ? currentSummary : detail?.key === detailKey ? detail : null;
  const error = currentSummary?.error || currentDetail?.error;
  const loading = valid && !error && (!currentSummary?.data || !currentDetail?.data);
  const totalCount = currentSummary?.data?.groups.reduce((sum, group) => sum + group.totalCount, 0);
  const groups = currentDetail?.data?.groups ?? [];
  const change = (nextType: SearchType, nextPage = 1) => {
    navigate(`/search?${new URLSearchParams({ keyword, type: nextType, page: String(nextPage) })}`, {
      state: location.state,
    });
  };

  return (
    <Box
      component="section"
      aria-label="통합검색"
      sx={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', p: { xs: 2, md: 3 } }}
    >
      <Box sx={{ width: '100%', maxWidth: 1120, mx: 'auto' }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography component="h2" variant="h5" sx={{ fontWeight: 800, mb: 1 }}>통합검색 결과</Typography>
            <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              메뉴, 전자결재 문서, 공지사항을 한곳에서 찾아보세요.
            </Typography>
          </Box>
          <UnifiedSearch variant="page" />
          {!keyword ? (
            <Alert severity="info">검색어를 2자 이상 입력해 주세요.</Alert>
          ) : !valid ? (
            <Alert severity="warning">검색 조건이 올바르지 않습니다. 검색어는 2~100자로 입력하고 유형과 페이지를 확인해 주세요.</Alert>
          ) : (
            <>
              <Box>
                <Typography component="p" variant="body1" sx={{ overflowWrap: 'anywhere', mb: 2 }}>
                  <Box component="strong" sx={{ color: 'primary.main' }}>“{keyword}”</Box> 검색 결과
                  {totalCount !== undefined && <> 총 <strong>{totalCount.toLocaleString()}</strong>건</>}
                </Typography>
                <Box role="tablist" aria-label="검색 유형" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {types.map((value) => {
                    const count = value === 'ALL' ? totalCount
                      : currentSummary?.data?.groups.find((group) => group.type === value)?.totalCount;
                    return (
                      <Button
                        key={value}
                        role="tab"
                        id={`search-tab-${value}`}
                        aria-controls="search-results-panel"
                        aria-selected={type === value}
                        tabIndex={type === value ? 0 : -1}
                        variant={type === value ? 'contained' : 'outlined'}
                        onClick={() => change(value)}
                        onKeyDown={(event) => {
                          const index = types.indexOf(value);
                          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? types.length - 1
                            : event.key === 'ArrowRight' ? (index + 1) % types.length
                              : event.key === 'ArrowLeft' ? (index + types.length - 1) % types.length : null;
                          if (nextIndex === null) return;
                          event.preventDefault();
                          const next = types[nextIndex];
                          document.getElementById(`search-tab-${next}`)?.focus();
                          change(next);
                        }}
                        sx={{ gap: 1, minWidth: 80 }}
                      >
                        {labels[value]} {count !== undefined ? count.toLocaleString() : '—'}
                      </Button>
                    );
                  })}
                </Box>
              </Box>
              {loading && (
                <Box role="status" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, py: 6 }}>
                  <CircularProgress size={24} />검색 중입니다.
                </Box>
              )}
              {error && (
                <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry((value) => value + 1)}>재시도</Button>}>
                  {error}
                </Alert>
              )}
              {navigationError?.key === detailKey && <Alert severity="error">{navigationError.message}</Alert>}
              {!loading && !error && (
                <Box role="tabpanel" id="search-results-panel" aria-labelledby={`search-tab-${type}`}>
                  {groups.map((group) => (
                    <Box component="section" aria-label={`${labels[group.type]} 검색 결과`} key={group.type} sx={{ mb: 4 }}>
                      <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                        flexWrap: 'wrap', pb: 1, borderBottom: 2, borderColor: 'primary.main',
                      }}>
                        <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
                          {labels[group.type]} <Box component="span" sx={{ color: 'primary.main' }}>({group.totalCount.toLocaleString()}건)</Box>
                        </Typography>
                        {type === 'ALL' && group.totalCount > group.items.length && (
                          <Button size="small" endIcon={<ArrowForwardOutlined />} onClick={() => change(group.type)}>
                            {labels[group.type]} 더보기
                          </Button>
                        )}
                      </Box>
                      {group.items.length === 0 ? (
                        <Typography color="text.secondary" sx={{ py: 3 }}>검색 결과가 없습니다.</Typography>
                      ) : (
                        <List disablePadding>
                          {group.items.map((item) => (
                            <ListItemButton
                              key={`${item.type}-${item.id}`}
                              onClick={() => {
                                if (!item.path.startsWith('/') || item.path.startsWith('//')
                                  || item.path.includes('\\')
                                  || Array.from(item.path).some((character) => character.charCodeAt(0) < 32)) {
                                  setNavigationError({ key: detailKey, message: '검색 결과의 이동 경로를 확인할 수 없습니다.' });
                                  return;
                                }
                                navigate(item.path);
                              }}
                              sx={{ py: 2, px: { xs: 0.5, sm: 1.5 }, gap: 1.5, borderBottom: 1, borderColor: 'divider', alignItems: 'flex-start' }}
                            >
                              <Chip label={labels[item.type]} size="small" color="primary" variant="outlined" sx={{ mt: 0.25, flexShrink: 0 }} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                                  <Highlight title={item.title} keyword={keyword} />
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                                  <Highlight
                                    title={item.description}
                                    keyword={keyword}
                                  />
                                </Typography>
                              </Box>
                            </ListItemButton>
                          ))}
                        </List>
                      )}
                      {type !== 'ALL' && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                          <Button disabled={page === 1} onClick={() => change(type, page - 1)}>이전</Button>
                          <Typography variant="body2">{page}페이지</Typography>
                          <Button disabled={page * 10 >= group.totalCount || page >= 1001} onClick={() => change(type, page + 1)}>다음</Button>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
