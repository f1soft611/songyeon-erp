import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import type { AvatarProps } from '@mui/material/Avatar';

export type ProfileAvatarProps = Omit<AvatarProps, 'alt' | 'children' | 'src'> & {
  name: string;
  imageUrl?: string | null;
  fallback: ReactNode;
};

export function ProfileAvatar({
  name,
  imageUrl,
  fallback,
  onError,
  ...avatarProps
}: ProfileAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setFailedImageUrl(null);
  }, [imageUrl]);

  return (
    <Avatar
      alt={name}
      src={imageUrl && failedImageUrl !== imageUrl ? imageUrl : undefined}
      onError={(event) => {
        onError?.(event);
        setFailedImageUrl(imageUrl ?? null);
      }}
      {...avatarProps}
    >
      {fallback}
    </Avatar>
  );
}
