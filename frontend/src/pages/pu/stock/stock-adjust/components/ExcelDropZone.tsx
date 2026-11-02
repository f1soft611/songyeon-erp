import { useRef, useState } from 'react';
import { Box } from '@mui/material';

// 엑셀을 끌어다 놓거나 눌러서 고르는 칸(송연 .dropzone). 같은 파일을 다시 골라도 바로 다시 올라가게 고른 값을 비운다.
export function ExcelDropZone({ label, disabled, onFile }: { label: string; disabled?: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <Box
        role="button" tabIndex={0} aria-label={label}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !disabled) onFile(file);
        }}
        sx={{
          border: '1.5px dashed', borderColor: over ? 'primary.main' : 'divider', borderRadius: 2, p: 2, textAlign: 'center',
          fontSize: 13, color: 'text.secondary', cursor: disabled ? 'default' : 'pointer', bgcolor: over ? 'action.hover' : 'transparent',
        }}
      >
        📄 수량 채운 엑셀 파일을 여기로 끌어다 놓으세요 (또는 눌러서 찾기)
      </Box>
      <input
        ref={inputRef} type="file" accept=".xlsx,.xls" hidden data-testid={`${label}-input`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}
