// 공통관리 > 기초정보 > 거래처마스터(BSPartnerMasterView) 화면이 주고받는 값

// 거래처 한 곳(서버 ClientMasterVO). 빈 칸은 ''
export type ClientMasterRow = {
  id: string; // DB id 문자열
  clientId: number;
  clientCode: string; // 거래처코드(서버가 매기는 6자리 숫자, 보기만)
  name: string;
  clientType: string; // 분류 코드(공통코드 CUSTOMER_CATEGORY, 2026-10-23. 예: 001)
  clientTypeNm: string; // 분류 이름(서버가 공통코드와 이어 준다. 예: 매입거래처)
  businessNo: string;
  ceoName: string;
  businessType: string;
  businessItem: string;
  phone: string;
  fax: string;
  mobile: string;
  email: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo: string;
  useYn: 'Y' | 'N'; // 사용여부(2026-10-23). 그리드 체크박스 + [저장]으로만 바꾼다
  // 등록자 · 등록일시(created_at) · 수정자 · 수정일시(2026-10-23, 보기만. 서버가 로그인 사원으로 채운다)
  regUserNm: string;
  regDt: string;
  updUserNm: string;
  updDt: string;
};

// 등록·수정 때 서버로 보내는 칸. 사용여부도 같이 보낸다(2026-10-27, S_ERP 거래처관리와 같음)
export type ClientMasterForm = Omit<
  ClientMasterRow,
  'id' | 'clientId' | 'clientCode' | 'clientTypeNm' | 'regUserNm' | 'regDt' | 'updUserNm' | 'updDt'
>;

// 분류 고르기 항목(공통코드 CUSTOMER_CATEGORY 사용 중 항목)
export type ClientTypeOption = { code: string; name: string };

// 조회 조건 사용여부(2026-10-23): ALL 전체 · Y 사용중 · N 사용안함
export type ClientUseFilter = 'ALL' | 'Y' | 'N';

// 조회 조건(S_ERP 거래처관리 CustomerFilters 와 같은 자리): 거래처명 · 대표자 · 사업자번호 · 업태 · 종목(포함) · 분류(같은 코드, 비우면 전체) · 사용여부
export type ClientMasterFilters = {
  keyword?: string;
  clientType?: string;
  ceoName?: string;
  businessNo?: string;
  businessType?: string;
  businessItem?: string;
  useYn?: ClientUseFilter;
};
