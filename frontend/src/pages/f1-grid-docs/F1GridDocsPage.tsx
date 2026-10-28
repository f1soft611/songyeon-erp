import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useOptionalAppSettings } from '../../shared/context/AppSettingsContext';
import {
  f1GridDocGroups,
  getF1GridDoc,
  f1GridDocs,
} from './data/f1GridDocs';
import {
  DocContent,
  getDocApiRowId,
  getDocSectionId,
} from './components/DocContent';
import { F1GridPlayground } from './components/F1GridPlayground';
import './F1GridDocsPage.css';

const docSearchAliases: Record<string, string[]> = {
  'F1-Grid': ['f1-grid', 'f1 grid', '그리드'],
  'Getting Started': ['getting started', '시작하기', '초기 설정'],
  'Core Grid': ['core grid', '핵심 그리드', '기본 그리드'],
  'Cell Editing': ['cell editing', '셀 편집', '편집'],
  'Row Form Modal': ['row form modal', '행 폼', '폼 모달'],
  'Selection & Clipboard': ['selection clipboard', '선택', '클립보드'],
  'Filtering & Sorting': ['filtering sorting', '필터', '정렬'],
  'Column Layout': ['column layout', '컬럼 레이아웃', '레이아웃'],
  'Row Height': ['row height', '행 높이', '높이'],
  'Large Dataset': ['large dataset', '대용량', '대량 데이터'],
  'Row Merge': ['row merge', '행 병합', '병합'],
  'Context Menu': ['context menu', '컨텍스트 메뉴', '메뉴'],
  'Tree Grid': ['tree grid', '트리 그리드', '트리'],
  'API 참조': ['api reference', 'api', '참조', '옵션'],
};

function getSearchDisplayTitle(title: string, searchTerm: string) {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized || !/[가-힣]/.test(normalized)) {
    return title;
  }

  const aliases = docSearchAliases[title] ?? [];
  const koreanMatch = aliases
    .filter((alias) => /[가-힣]/.test(alias))
    .find((alias) => alias.toLowerCase().includes(normalized));

  return koreanMatch ?? title;
}

type F1GridDocsPageProps = { initialDocumentId?: string };

export function F1GridDocsPage({
  initialDocumentId = 'overview',
}: F1GridDocsPageProps) {
  const [selectedId, setSelectedId] = useState(
    getF1GridDoc(initialDocumentId).id,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingApiAnchor, setPendingApiAnchor] = useState<string>();
  const [tocOpen, setTocOpen] = useState(true);
  const settings = useOptionalAppSettings();
  const themeMode = settings?.themeMode ?? 'light';
  const setThemeMode = settings?.setThemeMode ?? (() => undefined);
  const isDark = themeMode === 'dark';

  const filteredDocs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return f1GridDocs;
    }

    return f1GridDocs.filter((item) => {
      const aliases = docSearchAliases[item.title] ?? [];
      const matchSource = [
        item.title,
        item.description,
        f1GridDocGroups.find((group) => group.id === item.group)?.label ?? '',
        ...aliases,
        ...item.sections.flatMap((section) => {
          if (section.type === 'api') {
            return [
              section.heading,
              ...section.rows.flatMap((row) => row.filter(Boolean)),
            ];
          }

          return section.type === 'prose'
            ? [section.heading, section.body]
            : [section.heading];
        }),
      ]
        .join(' ')
        .toLowerCase();

      return matchSource.includes(normalized);
    });
  }, [searchTerm]);

  const apiSearchMatches = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const apiDoc = getF1GridDoc('api-reference');
    return apiDoc.sections.flatMap((section) => {
      if (section.type !== 'api') {
        return [];
      }

      return section.rows
        .filter((row) =>
          row
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalized),
        )
        .map(([name]) => ({
          name,
          heading: section.heading,
          id: getDocApiRowId(section.heading, name),
        }));
    });
  }, [searchTerm]);

  useEffect(() => {
    if (filteredDocs.length === 0) {
      return;
    }

    if (!filteredDocs.some((item) => item.id === selectedId)) {
      setSelectedId(filteredDocs[0].id);
    }
  }, [filteredDocs, selectedId]);

  const doc = getF1GridDoc(selectedId);
  const normalizedSearch = searchTerm.trim();

  useEffect(() => {
    if (!pendingApiAnchor || selectedId !== 'api-reference') {
      return;
    }

    const target = document.getElementById(pendingApiAnchor);
    if (!target) {
      return;
    }

    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    setPendingApiAnchor(undefined);
  }, [pendingApiAnchor, selectedId]);

  function selectDocument(id: string) {
    setPendingApiAnchor(undefined);
    setSelectedId(id);
    setMenuOpen(false);
  }

  function selectApiResult(anchorId: string) {
    setSelectedId('api-reference');
    setPendingApiAnchor(anchorId);
    setMenuOpen(false);
  }

  return (
    <Box
      className={`f1-docs-shell ${isDark ? 'f1-docs-shell-dark' : 'f1-docs-shell-light'}`}
    >
      <Box component="header" className="f1-docs-header">
        <Box className="f1-docs-brand">
          <Typography
            variant="overline"
            className="f1-docs-kicker"
            style={{ letterSpacing: '0.14em' }}
          >
            Developer docs
          </Typography>
          <Typography
            component="h1"
            variant="h5"
            className="f1-docs-title"
            style={{ letterSpacing: '-0.04em' }}
          >
            F1-Grid
          </Typography>
        </Box>

        <Box className="f1-docs-header-actions">
          <TextField
            className="f1-docs-search"
            size="small"
            label="문서 검색"
            placeholder="문서 검색"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '문서 검색' },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <IconButton
            aria-label={isDark ? '라이트 테마로 전환' : '다크 테마로 전환'}
            onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
          >
            {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
          </IconButton>
          <IconButton
            aria-label="문서 메뉴 열기"
            aria-expanded={menuOpen}
            className="f1-docs-mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>
      </Box>

      <Box className={`f1-docs-layout${menuOpen ? ' menu-open' : ''}`}>
        <Box
          component="nav"
          aria-label="F1-Grid 문서 네비게이션"
          className="f1-docs-sidebar"
        >
          <Typography
            className="f1-docs-nav-label"
            style={{ letterSpacing: '0.04em' }}
          >
            DOCUMENTATION
          </Typography>
          {normalizedSearch && (
            <Box className="f1-docs-search-status">
              <Typography variant="caption">검색 결과</Typography>
              <Typography variant="caption">
                문서 {filteredDocs.length}개 · API {apiSearchMatches.length}개
              </Typography>
            </Box>
          )}

          {normalizedSearch ? (
            <Stack spacing={1.5}>
              {f1GridDocGroups.map((group) => {
                const groupDocs = filteredDocs.filter(
                  (item) => item.group === group.id,
                );
                if (groupDocs.length === 0) {
                  return null;
                }

                return (
                  <Box className="f1-doc-nav-group" key={group.id}>
                    <Typography className="f1-doc-nav-group-title">
                      {group.label}
                    </Typography>
                    <Stack spacing={0.25}>
                      {groupDocs.map((item) => (
                        <Button
                          key={item.id}
                          className={item.id === doc.id ? 'active' : ''}
                          onClick={() => selectDocument(item.id)}
                        >
                          {getSearchDisplayTitle(item.title, searchTerm) ||
                            item.title}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
              {apiSearchMatches.length > 0 && (
                <Box className="f1-doc-nav-group">
                  <Typography className="f1-doc-nav-group-title">
                    API 항목
                  </Typography>
                  <Stack spacing={0.25}>
                    {apiSearchMatches.map((match) => (
                      <Button
                        key={match.id}
                        className={
                          doc.id === 'api-reference' &&
                          pendingApiAnchor === match.id
                            ? 'active'
                            : ''
                        }
                        onClick={() => selectApiResult(match.id)}
                      >
                        {match.name}
                        <span className="f1-doc-api-result-group">
                          {match.heading}
                        </span>
                      </Button>
                    ))}
                  </Stack>
                </Box>
              )}
              {filteredDocs.length === 0 && apiSearchMatches.length === 0 && (
                <Typography className="f1-docs-empty-state">
                  검색 결과가 없습니다.
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {f1GridDocGroups.map((group) => {
                const groupDocs = f1GridDocs.filter(
                  (item) => item.group === group.id,
                );
                if (groupDocs.length === 0) {
                  return null;
                }

                return (
                  <Box className="f1-doc-nav-group" key={group.id}>
                    <Button
                      className={`f1-doc-nav-group-title f1-doc-nav-group-toggle${group.id === doc.group ? ' expanded' : ''}`}
                      aria-expanded={group.id === doc.group}
                      onClick={() => selectDocument(groupDocs[0].id)}
                    >
                      {group.label}
                      <ExpandMoreRoundedIcon
                        className="f1-doc-nav-group-chevron"
                        aria-hidden="true"
                        fontSize="small"
                      />
                    </Button>
                    {group.id === doc.group && (
                      <Stack spacing={0.25}>
                        {groupDocs.map((item) => (
                          <Button
                            key={item.id}
                            className={item.id === doc.id ? 'active' : ''}
                            onClick={() => selectDocument(item.id)}
                          >
                            {item.title}
                          </Button>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        <Box component="main" className="f1-docs-main">
          <Typography className="f1-docs-breadcrumb">
            F1-Grid /{' '}
            {f1GridDocGroups.find((group) => group.id === doc.group)?.label} /{' '}
            {doc.title}
          </Typography>
          <Box className="f1-doc-reader">
            <DocContent doc={doc} onRelatedSelect={selectDocument} />
            {doc.playground && <F1GridPlayground kind={doc.playground} />}
          </Box>
          <Box component="aside" className="f1-docs-toc">
            <Button
              className="f1-docs-toc-toggle"
              aria-expanded={tocOpen}
              onClick={() => setTocOpen((open) => !open)}
            >
              이 페이지 목차
            </Button>
            {tocOpen && (
              <Box component="nav" aria-label="문서 목차">
                <Stack spacing={0.5}>
                  {doc.sections.map((section) => (
                    <a
                      key={section.heading}
                      href={`#${getDocSectionId(doc.id, section.heading)}`}
                    >
                      {section.heading}
                    </a>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
