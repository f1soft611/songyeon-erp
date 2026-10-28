import { apiDelete, apiGet, apiPost, apiPut } from '../../../../shared/services/apiClient';
import { recipeExcelFileName, recipeExcelRows, type RecipeBom, type RecipeClient, type RecipeDraft, type RecipeSalesRep, type RecipeStageLog, type RecipeVersion } from '../utils/recipe';

// 상품개발 > 레시피 작성 (송연 /api/recipe-clients · recipe-sales-reps · recipe-drafts · recipe-versions)
const PATH = '/api/v1/rd/recipe';

export async function fetchRecipeClients(): Promise<RecipeClient[]> {
  return (await apiGet<{ resultList: RecipeClient[] }>(`${PATH}/clients`)).resultList ?? [];
}
export const saveRecipeClient = (clientName: string, salesEmpId: string | null) => apiPost(`${PATH}/clients`, { clientName, salesEmpId });
export async function fetchSalesReps(): Promise<RecipeSalesRep[]> {
  return (await apiGet<{ resultList: RecipeSalesRep[] }>(`${PATH}/sales-reps`)).resultList ?? [];
}

export async function fetchDrafts(filter: Record<string, string>): Promise<RecipeDraft[]> {
  const qs = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
  return (await apiGet<{ resultList: RecipeDraft[] }>(`${PATH}/drafts${qs ? `?${qs}` : ''}`)).resultList ?? [];
}
export async function fetchDraft(id: number): Promise<{ draft: RecipeDraft; versions: RecipeVersion[] }> {
  return (await apiGet<{ item: { draft: RecipeDraft; versions: RecipeVersion[] } }>(`${PATH}/drafts/${id}`)).item;
}
export async function fetchVersion(id: number): Promise<{ version: RecipeVersion; bom: RecipeBom[] }> {
  return (await apiGet<{ item: { version: RecipeVersion; bom: RecipeBom[] } }>(`${PATH}/versions/${id}`)).item;
}

export type RecipeHeader = { clientName: string; name: string; spec: string; note: string; category: string; saleType: string; remark: string };
export type RecipeBomSave = { materialName: string; materialCode: string | null; weight: string; ratioPercent: number | null; unitPrice: string };

export async function createDraft(body: RecipeHeader & { bom: RecipeBomSave[] }): Promise<{ id: number; versionId: number }> {
  return (await apiPost<{ item: { id: number; versionId: number } }>(`${PATH}/drafts`, body)).item;
}
export const updateDraft = (id: number, body: Omit<RecipeHeader, 'clientName'>) => apiPut(`${PATH}/drafts/${id}`, body);
export const saveVersionBom = (versionId: number, bom: RecipeBomSave[]) => apiPut(`${PATH}/versions/${versionId}`, { bom });
export async function addTestVersion(draftId: number): Promise<{ versionId: number; versionLabel: string }> {
  return (await apiPost<{ item: { versionId: number; versionLabel: string } }>(`${PATH}/drafts/${draftId}/versions`, {})).item;
}
export const deleteDraft = (id: number) => apiDelete(`${PATH}/drafts/${id}`);
export async function fetchStageLogs(draftId: number): Promise<RecipeStageLog[]> {
  return (await apiGet<{ resultList: RecipeStageLog[] }>(`${PATH}/drafts/${draftId}/stage-logs`)).resultList ?? [];
}

// 저장된 버전 그대로 엑셀로(송연 export-excel). 엑셀을 누를 때만 exceljs 를 불러온다
export async function downloadVersionExcel(draft: RecipeDraft, versionId: number): Promise<void> {
  const { version, bom } = await fetchVersion(versionId);
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('레시피');
  recipeExcelRows(draft, version.versionLabel, bom).forEach((row) => ws.addRow(row));
  ws.getColumn(1).width = 26;
  [2, 3, 4].forEach((c) => { ws.getColumn(c).width = 13; });
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = recipeExcelFileName(draft.name, version.versionLabel);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
