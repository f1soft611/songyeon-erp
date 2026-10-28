import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { PageHeader } from '../../shared/components/PageHeader';
import type { ModuleItem, PageContent } from '../dashboard/types/dashboard';

type DocumentsPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

export function DocumentsPage({
  selectedModule,
  currentMenuName,
  content,
}: DocumentsPageProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
      />

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 2,
            }}
          >
            {content.cards.map((card) => (
              <Card
                key={card.label}
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(148,163,184,0.18)',
                  boxShadow: 'none',
                  bgcolor: 'background.paper',
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {card.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, color: 'primary.main' }}
                    >
                      {card.value}
                    </Typography>
                    <Chip
                      label="상세 보기"
                      size="small"
                      sx={{
                        width: 'fit-content',
                        bgcolor: isDark
                          ? 'rgba(96, 165, 250, 0.18)'
                          : '#dbeafe',
                        color: isDark ? '#dbeafe' : '#1d4ed8',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box
            sx={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 2 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(148,163,184,0.18)',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {currentMenuName} 현황
                  </Typography>
                  <Chip label="최근" size="small" color="primary" />
                </Box>
                <Stack spacing={1.5}>
                  {content.items.map((item) => (
                    <Box
                      key={item.title}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        border: '1px solid rgba(148,163,184,0.18)',
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.meta}
                      </Typography>
                      {item.status ? (
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            alignSelf: 'flex-start',
                            mt: 0.5,
                            bgcolor: 'rgba(45, 212, 191, 0.14)',
                            color: 'success.main',
                            fontWeight: 700,
                          }}
                        />
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(148,163,184,0.18)',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    문서 요약
                  </Typography>
                  <Chip label="업데이트" size="small" color="secondary" />
                </Box>
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      전체 문서
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {content.cards[0]?.value ?? '0'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      기안 대기
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {content.cards[1]?.value ?? '0'}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="문서" size="small" />
                    <Chip label="결재" size="small" />
                    <Chip label="보관" size="small" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
