// 제품 라벨(표시사항). 라벨출력·생산확정(🏷️ 라벨)·라벨등록이 함께 쓰는 라벨 창의 자료(서버 /api/v1/qm/label).
// 서버 응답은 camelCase 이고, DB 에 JSON 글자로 든 양식(layout)·항목(extra) 안의 키는 송연 그대로(snake_case)다.

// 라벨 양식 한 칸(송연 07-label.js LABEL_FORMAT_BASIC 의 cells)
export interface LabelCell {
  type: 'title' | 'label' | 'field' | 'date' | 'expiry' | 'html' | 'company' | 'notice' | 'barcode' | 'blank';
  span?: number;
  rowspan?: number;
  cls?: string;
  text?: string;
  field?: string;
  key?: string;
  recycle?: boolean;
  size?: number;
  align?: string;
}
// 양식: 세로 칸 폭(mm)과 줄마다 붙은 칸
export interface LabelFormat {
  name?: string;
  paper: { w: number; h: number };
  cols: number[];
  rows: { cells: LabelCell[]; h?: number }[];
}

export interface LabelRecycle {
  mark_id?: number;
  width_mm?: number;
}
export interface LabelLayout {
  size?: string;
  format_id?: number | null;
  recycle?: LabelRecycle | null;
}

// 라벨 한 장의 내용(버전)
export interface LabelInfo {
  id?: number;
  productCode?: string;
  versionLabel?: string;
  isCurrent?: number;
  foodType?: string | null;
  netWeight?: string | null;
  ingredientsText?: string | null;
  allergens?: string | null;
  manufactureReportNo?: string | null;
  packagingMaterial?: string | null;
  shelfLifeMonths?: number | string | null;
  shelfLifeUnit?: string | null;
  storage?: string | null;
  layout?: LabelLayout;
  extra?: Record<string, string>;
}

export interface LabelVersion {
  id: number;
  versionLabel: string;
  note?: string | null;
  isCurrent?: number;
  createdAt?: string | null;
  createdBy?: string | null;
}
export interface LabelVersionList {
  versions: LabelVersion[];
  currentId?: number | null;
}

export interface LabelTemplate {
  id: number;
  name: string;
  size?: string | null;
  layout?: LabelFormat | null;
}
export interface LabelMark {
  id: number;
  name: string;
  dataUrl: string;
  widthMm?: number | null;
}

export interface LabelCompanyInfo {
  returnExchangeLocation?: string | null;
  customerServicePhone?: string | null;
  businessName?: string | null;
  businessAddress?: string | null;
  noticeText?: string | null;
}

export interface LabelBomRow {
  materialCode?: string | null;
  materialName: string | null;
  ratioPercent: number | null;
}
export interface LabelBomAllergens {
  allergens: string[];
  text: string;
  sources: { materialName: string; allergens: string[] }[];
}
