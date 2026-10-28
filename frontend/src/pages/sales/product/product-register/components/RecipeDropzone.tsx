import { useRef, useState, type DragEvent } from 'react';
import { Box } from '@mui/material';
import { readExcelValues } from '../../../../shared/utils/excelFile';
import type { BomEditRow, MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import { newBomRowId } from './BomEditGrid';
import { materialNamePatch } from '../../../co/master/item-master/utils/productBom';
import { parseRecipeRows, RECIPE_NOT_FOUND_MESSAGE, recipeLoadedMessage } from '../utils/recipeExcel';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 송연 bom-dropzone(handleBomFile): 레시피 엑셀을 끌어다 놓거나 눌러서 골라 배합비 표를 채운다.
// 등록된 원재료명이면 단가·코드도 채운다. 제품등록과 견적(가견적 창)이 같이 쓴다.
export function RecipeDropzone({
  materials,
  onLoaded,
  onError,
}: {
  materials: MaterialOption[];
  onLoaded: (rows: BomEditRow[], message: string) => void;
  onError: (message: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const materialsRef = useRef(materials);
  materialsRef.current = materials;

  const importRecipe = async (file: File) => {
    try {
      const lines = parseRecipeRows(await readExcelValues(file));
      if (lines.length === 0) {
        onError(RECIPE_NOT_FOUND_MESSAGE);
        return;
      }
      const rows: BomEditRow[] = lines.map((line) => ({
        id: newBomRowId(),
        materialName: line.materialName,
        ratioPercent: line.ratioPercent,
        unitPrice: null,
        autoPrice: false,
        materialCode: null,
        ...materialNamePatch({ autoPrice: false }, line.materialName, materialsRef.current),
      }));
      onLoaded(rows, recipeLoadedMessage(lines.length));
    } catch (readError) {
      onError(errorText(readError, '엑셀 파일을 읽지 못했어요. .xlsx 파일인지 확인해주세요.'));
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void importRecipe(file);
  };

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-label="레시피 엑셀 불러오기"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragEnter={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
        onDrop={onDrop}
        sx={{
          mb: 1.5,
          py: 2,
          px: 2,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 1,
          bgcolor: dragOver ? 'action.selected' : 'action.hover',
          color: 'text.secondary',
          fontSize: 13,
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}
      >
        📄 여기로 레시피 엑셀 파일을 끌어다 놓으세요 (또는 클릭해서 선택) — &quot;품목&quot; 표가 있는 양식 자동 인식
      </Box>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        hidden
        aria-label="레시피 엑셀 파일"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importRecipe(file);
        }}
      />
    </>
  );
}
