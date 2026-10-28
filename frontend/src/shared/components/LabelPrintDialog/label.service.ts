import { apiGet } from '../../services/apiClient';
import type {
  LabelBomAllergens, LabelBomRow, LabelCompanyInfo, LabelInfo, LabelMark, LabelTemplate, LabelVersionList,
} from './label.types';

// 제품 라벨 조회 서버 API(/api/v1/qm/label, 송연 /api/qm/label). 조회만 한다.
const PATH = '/api/v1/qm/label';
const product = (code: string) => `${PATH}/products/${encodeURIComponent(code)}`;
const item = async <T,>(path: string) => (await apiGet<{ item: T }>(path)).item;
const list = async <T,>(path: string) => (await apiGet<{ resultList: T[] }>(path)).resultList ?? [];

export const listLabelVersions = (code: string) => item<LabelVersionList>(`${product(code)}/versions`);
export const getLabelVersion = (id: number) => item<LabelInfo>(`${PATH}/versions/${id}`);
export const listLabelTemplates = () => list<LabelTemplate>(`${PATH}/templates`);
export const getLabelTemplate = (id: number | string) => item<LabelTemplate>(`${PATH}/templates/${id}`);
export const listLabelMarks = () => list<LabelMark>(`${PATH}/marks`);
export const getLabelCompanyInfo = () => item<LabelCompanyInfo>(`${PATH}/company-info`);
export const getLabelBom = (code: string) => list<LabelBomRow>(`${product(code)}/bom`);
export const getLabelBomAllergens = (code: string) => item<LabelBomAllergens>(`${product(code)}/bom-allergens`);
