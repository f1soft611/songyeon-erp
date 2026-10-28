import { useState } from 'react';
import { IconButton, ListItemText, Menu, MenuItem } from '@mui/material';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';

type NoticeFilterMenuProps = {
  filters: Array<{ code: string; name: string; isImportant?: boolean }>;
  selectedCode: string;
  onChange: (code: string) => void;
  ariaLabel?: string;
};

export function NoticeFilterMenu({
  filters,
  selectedCode,
  onChange,
  ariaLabel = '공지사항 필터',
}: NoticeFilterMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const options = [{ code: '', name: '전체' }, ...filters];

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        title="필터"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        color={selectedCode ? 'primary' : 'default'}
      >
        <FilterListOutlined fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {options.map((filter) => (
          <MenuItem
            key={filter.code || 'all'}
            selected={filter.code === selectedCode}
            sx={
              filter.isImportant
                ? {
                    bgcolor: 'rgba(251, 191, 36, 0.16)',
                    color: 'warning.dark',
                    '&:hover': {
                      bgcolor: 'rgba(251, 191, 36, 0.24)',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(251, 191, 36, 0.28)',
                      color: 'warning.dark',
                    },
                    '&.Mui-selected:hover': {
                      bgcolor: 'rgba(251, 191, 36, 0.34)',
                    },
                  }
                : undefined
            }
            onClick={() => {
              onChange(filter.code);
              setAnchorEl(null);
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ListItemText
                primary={filter.name}
                sx={{ fontWeight: filter.isImportant ? 700 : undefined }}
              />
            </span>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
