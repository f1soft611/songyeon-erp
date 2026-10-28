import type { MouseEvent, ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { richTextContentStyles } from '../rich-text-editor/contentStyles';

export type FeedBodyImage = {
  src: string;
  alt: string;
};

type FeedBodyContentProps = {
  hasMore: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  contentTestId?: string;
  imagePreviewTestId?: string;
  contentSx?: SxProps<Theme>;
  onContentClick?: (event: MouseEvent<HTMLElement>) => void;
  richText?: {
    collapsedHtml: string;
    expandedHtml: string;
    images?: FeedBodyImage[];
    imageError?: string;
    onOpenImage: (image: FeedBodyImage) => void;
    renderImagePreview?: (
      image: FeedBodyImage,
      index: number,
      onOpenImage: (image: FeedBodyImage) => void,
    ) => ReactNode;
  };
  text?: {
    collapsed: string;
    expanded: string;
  };
};

const IMAGE_PREVIEW_WIDTH = 112;
const IMAGE_PREVIEW_HEIGHT = 76;

export function FeedBodyContent({
  hasMore,
  isExpanded,
  onToggleExpand,
  contentTestId = 'feed-body-rich-content',
  imagePreviewTestId = 'feed-body-image-previews',
  contentSx,
  onContentClick,
  richText,
  text,
}: FeedBodyContentProps) {
  const images = richText?.images ?? [];

  return (
    <Box data-testid="feed-body-content" data-expanded={isExpanded}>
      {richText ? (
        <Box
          data-testid={contentTestId}
          data-expanded={isExpanded}
          sx={{
            ...richTextContentStyles,
            color: 'text.primary',
            minWidth: 0,
            overflowWrap: 'anywhere',
            mb: 1.5,
            overflow: isExpanded ? 'visible' : 'hidden',
            maxHeight: isExpanded ? 'none' : 220,
            position: 'relative',
            maskImage: isExpanded
              ? 'none'
              : 'linear-gradient(to bottom, black 72%, transparent 100%)',
            WebkitMaskImage: isExpanded
              ? 'none'
              : 'linear-gradient(to bottom, black 72%, transparent 100%)',
            '& img': { maxWidth: '100%', height: 'auto' },
            '& table': { maxWidth: '100%', overflowX: 'auto', display: 'block' },
            ...contentSx,
          }}
          onClick={onContentClick}
          dangerouslySetInnerHTML={{
            __html: isExpanded ? richText.expandedHtml : richText.collapsedHtml,
          }}
        />
      ) : (
        <Typography
          data-testid={contentTestId}
          data-expanded={isExpanded}
          variant="body1"
          onClick={onContentClick}
          sx={{
            fontSize: '1rem',
            fontWeight: 400,
            color: 'text.primary',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
            display: isExpanded ? 'block' : '-webkit-box',
            WebkitLineClamp: isExpanded ? 'unset' : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1.5,
            cursor: !hasMore ? 'pointer' : 'default',
            ...contentSx,
          }}
        >
          {isExpanded ? text?.expanded : text?.collapsed}
        </Typography>
      )}

      {richText?.imageError && (
        <Typography role="alert" color="error" variant="body2" sx={{ mb: 1.5 }}>
          {richText.imageError}
        </Typography>
      )}

      {hasMore && (
        <Button
          variant="text"
          size="small"
          aria-expanded={isExpanded}
          onClick={onToggleExpand}
          sx={{
            minWidth: 0,
            p: 0,
            fontWeight: 700,
            color: 'primary.main',
            mb: 1.5,
          }}
        >
          {isExpanded ? '접기' : '더보기'}
        </Button>
      )}

      {richText && !isExpanded && images.length > 0 && (
        <Box
          data-testid={imagePreviewTestId}
          sx={{
            width: '100%',
            height: IMAGE_PREVIEW_HEIGHT,
            overflow: 'hidden',
            mb: 1.5,
            maxWidth: '100%',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              height: '100%',
              width: '100%',
              overflow: 'hidden',
              alignItems: 'center',
            }}
          >
            {images.map((image, index) => {
              const openImage = (selected: FeedBodyImage) =>
                richText.onOpenImage(selected);
              const renderImagePreview = richText.renderImagePreview;
              if (renderImagePreview) {
                return (
                  <Box key={`${image.src}-${index}`} sx={{ flexShrink: 0 }}>
                    {renderImagePreview(image, index, openImage)}
                  </Box>
                );
              }
              return (
                <Box
                  key={`${image.src}-${index}`}
                  component="button"
                  type="button"
                  aria-label={`본문 이미지 미리보기 ${index + 1}: ${image.alt}`}
                  onClick={() => openImage(image)}
                  sx={{
                    display: 'block',
                    flexShrink: 0,
                    width: IMAGE_PREVIEW_WIDTH,
                    height: IMAGE_PREVIEW_HEIGHT,
                    p: 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                  }}
                >
                  <Box
                    component="img"
                    src={image.src}
                    alt={image.alt}
                    sx={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
