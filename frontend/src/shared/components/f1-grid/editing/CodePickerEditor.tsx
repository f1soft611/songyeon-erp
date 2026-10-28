import { Button } from '@mui/material';

type CodePickerEditorProps = {
  onPick: () => void;
};

export function CodePickerEditor({ onPick }: CodePickerEditorProps) {
  return (
    <Button
      size="small"
      onClick={onPick}
      fullWidth
      sx={{
        height: '100%',
        minHeight: 0,
        py: 0,
        px: 1,
        flex: 1,
        width: '100%',
        minWidth: 0,
        justifyContent: 'flex-start',
      }}
    >
      코드 선택
    </Button>
  );
}
