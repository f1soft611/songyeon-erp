import { useRef } from 'react';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import SaveIcon from '@mui/icons-material/Save';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { formatPrice } from '../../../../shared/utils/numberFormat';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { BomEditGrid, type BomEditGridHandle } from './components/BomEditGrid';
import { MaterialMatchDialog } from './components/MaterialMatchDialog';
import { ProductInfoForm } from './components/ProductInfoForm';
import { RecipeDropzone } from './components/RecipeDropzone';
import { useProductRegisterManagement } from './hooks/useProductRegisterManagement';
import { downloadRecipeTemplate } from './utils/recipeTemplate';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type ProductRegisterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const cardSx = {
  borderRadius: 1,
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: 'none',
};

// 영업관리 > 제품등록 (송연 SA0001)
// 제품 정보와 원재료 배합비를 넣고 [등록]하면 제품코드를 발번하고 배합비·단가표(원재료비)까지 한 번에 만든다.
// 인건비 등 나머지 원가는 단가관리에서 이어서 넣는다.
// 2026-10-28 [신규] · [저장] · [삭제](S_ERP 수주등록과 같음). [저장] 뒤에는 등록한 제품을 보기 전용으로 남긴다.
// 2026-10-28 S_ERP 품목관리와 같은 구조로 나눴다: 화면(이 파일) · 입력 · 등록(hooks/useProductRegisterManagement) · 제품 정보 칸(components/ProductInfoForm)
export function ProductRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProductRegisterManagementPageProps) {
  const bomGridRef = useRef<BomEditGridHandle>(null);
  const management = useProductRegisterManagement(bomGridRef);
  const { quote, savedProduct } = management;
  const saved = savedProduct !== null;

  // 제목줄(2026-10-28 S_ERP 수주등록과 같음): [신규] · [저장] · [삭제]. 삭제는 방금 [저장]한 제품이 있을 때만
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          label: '신규',
          icon: NoteAddOutlinedIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          disabled: management.saving,
          onClick: management.startNew,
        },
        {
          label: '저장',
          icon: SaveIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          disabled: management.saving || saved,
          onClick: () => void management.save(),
        },
      ],
    },
    {
      key: 'delete',
      actions: [
        {
          label: '삭제',
          icon: DeleteForeverOutlinedIcon,
          visible: Boolean(selectedMenuPermissions?.delete),
          disabled: !saved || management.saving,
          onClick: management.requestDelete,
        },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* [저장] 뒤: 등록한 제품을 보기 전용으로 남긴다 */}
        {savedProduct && (
          <Alert severity="success" variant="outlined" sx={{ borderRadius: 1 }}>
            제품코드 <b>{savedProduct.productCode}</b> 로 등록했어요. 고칠 내용은 제품마스터 · 단가관리에서, 다음 제품은 위쪽 <b>[신규]</b>로 입력해주세요.
            잘못 등록했으면 <b>[삭제]</b>로 지울 수 있어요.
          </Alert>
        )}
        {/* 송연 #quote-confirm-banner */}
        {quote && !saved && (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 1 }}>
            견적에서 불러온 내용이에요. 원재료명 등을 확인하고 위쪽 <b>[등록]</b>을 눌러 확정해주세요.
            {quote.costs.currentPrice != null && (
              <Box sx={{ mt: 0.5 }}>
                확정단가 <b>{formatPrice(quote.costs.currentPrice)}원</b> 이 함께 넘어왔어요. 등록하면 이 값이 판매단가가 됩니다 (매출·거래명세표에 쓰여요).
              </Box>
            )}
          </Alert>
        )}
        <Card sx={cardSx}>
          <CardContent>
            <ProductInfoForm
              form={management.form}
              onChange={management.setFormValues}
              packagingTypes={management.packagingTypes}
              storageOptions={management.storageOptions}
              clients={management.clients}
              quoteClientName={quote?.clientName ?? ''}
              productCode={savedProduct?.productCode ?? ''}
              readOnly={saved}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3.5, mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>원재료 배합비 (BOM)</Typography>
              {/* 레시피 엑셀 불러오기가 읽는 "품목" 표 양식 */}
              <Button
                size="small"
                variant="outlined"
                disabled={saved}
                startIcon={<FileDownloadIcon />}
                onClick={() => {
                  downloadRecipeTemplate().catch((downloadError) => management.setError(errorText(downloadError, '양식을 만들지 못했어요')));
                }}
              >
                양식 내려받기
              </Button>
            </Box>
            {/* 송연 bom-dropzone: 레시피 엑셀을 끌어다 놓거나 눌러서 고른다 */}
            {!saved && <RecipeDropzone materials={management.materials} onLoaded={management.loadBomRows} onError={management.setError} />}
            <BomEditGrid
              ref={bomGridRef}
              materials={management.materials}
              sourceRows={management.bomSource.rows}
              sourceKey={management.bomSource.key}
              storageKey="sa-product-register-bom-grid"
              height={320}
              readOnly={saved}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              원재료명을 입력하면 등록된 원재료단가와 자동으로 매칭돼 원재료비가 계산돼요. 목록에 없는 이름이면 단가 없이 배합비만 저장돼요.
            </Typography>
          </CardContent>
        </Card>
      </Box>
      <ConfirmDialog
        open={management.deleteConfirmOpen}
        title="제품 삭제"
        message={`제품코드 ${savedProduct?.productCode ?? ''} 을(를) 삭제할까요? 배합비 · 단가표도 함께 지워지고, 견적에서 만든 제품이면 그 견적은 가견적으로 돌아갑니다.`}
        confirmLabel="삭제"
        danger
        onCancel={() => management.setDeleteConfirmOpen(false)}
        onConfirm={() => void management.confirmDelete()}
      />
      {management.pending && (
        <MaterialMatchDialog
          unmatched={management.pending.unmatched}
          onConfirm={(resolved) => void management.confirmMatch(resolved)}
          onClose={() => management.setPending(null)}
        />
      )}
    </Box>
  );
}
