import { Box, Button, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';

type NoticeEmptyStateProps = {
  onCreate?: () => void;
};

export function NoticeEmptyState({ onCreate }: NoticeEmptyStateProps) {
  return (
    <Box
      data-testid="notice-empty-state"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minHeight: 360,
        px: 2,
        py: 5,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'relative',
          width: 148,
          height: 112,
          color: 'primary.main',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 20,
            top: 18,
            width: 76,
            height: 70,
            borderRadius: 1.5,
            border: '2px solid',
            borderColor: 'text.primary',
            bgcolor: 'background.paper',
            boxShadow: 2,
          }}
        >
          <Box sx={{ p: 1.25, display: 'grid', gap: 0.75 }}>
            <Box
              sx={{
                height: 6,
                width: '58%',
                borderRadius: 1,
                bgcolor: 'primary.main',
              }}
            />
            <Box
              sx={{
                height: 5,
                width: '82%',
                borderRadius: 1,
                bgcolor: 'divider',
              }}
            />
            <Box
              sx={{
                height: 5,
                width: '70%',
                borderRadius: 1,
                bgcolor: 'divider',
              }}
            />
            <Box
              sx={{
                height: 5,
                width: '88%',
                borderRadius: 1,
                bgcolor: 'divider',
              }}
            />
          </Box>
        </Box>
        <StickyNote2OutlinedIcon
          sx={{
            position: 'absolute',
            right: 14,
            top: 6,
            fontSize: 42,
            color: 'primary.main',
          }}
        />
        <GroupsOutlinedIcon
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 4,
            fontSize: 42,
            color: 'secondary.main',
          }}
        />
      </Box>
      <Box>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          아직 등록된 공지가 없습니다.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          오늘의 소식을 첫 번째로 공유해보세요!
        </Typography>
      </Box>
      {onCreate && (
        <Button
          variant="outlined"
          startIcon={<EditOutlinedIcon />}
          onClick={onCreate}
          sx={{ minWidth: 168, borderRadius: 999, fontWeight: 700 }}
        >
          글쓰기
        </Button>
      )}
    </Box>
  );
}
