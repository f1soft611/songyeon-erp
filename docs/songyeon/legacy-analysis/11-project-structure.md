# 송연 MES 프로젝트 구조

- 기준일: 2026-09-22
- 구성: 화면(React) · 서버(Spring Boot + MyBatis) · 업무 DB(PostgreSQL `songyeon`)
- 기존 프로그램(Python Flask + SQLite)은 같은 폴더에 두고, 화면 문구·동작을 대조하는 기준으로만 쓴다

## 1. 전체 구성

```
브라우저 ──▶ React 화면 (frontend, 개발 포트 5173)
                 │  /api 요청
                 ▼
            Spring Boot 서버 (backend, 포트 8081)
                 │  MyBatis(SQL 은 XML 파일)
                 ▼
            PostgreSQL 업무 DB (songyeon) ─ 업무 자료 + 로그인 계정
```

| 구분 | 사용 기술 |
|---|---|
| 화면 | React 19, TypeScript, Vite. 표는 기존 방식(HTML 표)과 F1-Grid(s-erp 공용 그리드, MUI 기반 — 생산현황에 시범 적용)가 함께 있다 |
| 서버 | Java 17, Spring Boot 3.5, Spring Security(세션 로그인), MyBatis |
| DB | PostgreSQL 18 (`songyeon`) |
| 테스트 | 서버: JUnit + H2 메모리 DB / 화면: Playwright |

## 2. 최상위 폴더

```
송연/
├─ backend/                  Spring Boot 서버
├─ frontend/                 React 화면
├─ docs/                     분석·설계·진행 문서
├─ MES_프로토타입_20260916/   기존 프로그램(Python) — 대조용, 수정하지 않음
└─ .tools/                   Java 17 실행 환경(PC 설정을 바꾸지 않고 이 프로젝트만 사용)
```

## 3. 코드 체계

업무마다 두 글자 **업무코드**, 화면마다 **화면코드**(업무코드 + 4자리 번호)를 붙인다. 폴더·파일·API 주소·테스트 이름에 모두 이 코드를 쓴다.

| 업무코드 | 업무 | 화면코드 (전환 완료) |
|---|---|---|
| SA | 영업관리 | SA0001 제품등록 · SA0002 단가관리 · SA0003 견적 · SA0004 수주등록 · SA0005 출하등록 · SA0006 생산가능확인 |
| CM | 공통관리 | CM0001 기초정보 · CM0002 생산스케줄 · CM0003 물류스케줄 |
| PD | 생산관리 | PD0001 생산확정 · PD0002 생산입고 · PD0003 생산현황 · PD0004 라벨출력 |
| LG | 물류관리 | LG0001 제품재고관리 · LG0002 출하확정 · LG0003 출하현황 |
| SL · PU · QM · RD · HA | 판매 · 구매 · 품질 · 상품개발 · 인사회계 | 미착수 |

화면 하나(예: SA0001 제품등록)에 대응하는 파일:

| 구분 | 위치 |
|---|---|
| 화면 | `frontend/src/pages/sa/SA0001/SA0001Page.tsx` |
| 서버 API 주소 | `/api/sa/sa0001` |
| 서버 클래스 | `SA0001Controller` · `SA0001Service` · `SA0001DAO` · `SA0001DTO` |
| SQL | `backend/src/main/resources/mapper/sa/SA0001.xml` |
| 화면 테스트 | `frontend/tests/SA0001.spec.ts` |

## 4. 서버(backend)

계층별 폴더를 위에 두고, 그 아래를 업무코드로 나눈다.

```
backend/src/main/java/kr/co/songyeon/mes/
├─ controller/   요청을 받아 서비스로 넘기고 결과를 돌려준다(권한 검사는 여기서 표시만)
│   ├─ sa/  SA0001Controller … SA0006Controller
│   ├─ cm/  CM0001Controller … CM0003Controller
│   ├─ pd/  PD0001Controller … PD0004Controller
│   ├─ lg/  LG0001Controller … LG0003Controller
│   ├─ label/  라벨 조회(여러 화면 공용)
│   └─ tv/     현장 TV 화면(로그인 없이)
├─ service/      업무 규칙(재고 차감, 로트, 발번 등). 화면마다 하나
│   ├─ sa/ cm/ pd/ lg/
│   ├─ inventory/  재고 원장 — 생산입고·출하확정 등 여러 화면이 함께 쓰는 규칙
│   └─ label/      라벨 조회 — 라벨출력·생산확정이 함께 씀
├─ dao/          SQL 호출 창구(MyBatis). 화면마다 하나
├─ dto/          주고받는 값. 화면마다 하나(SA0001DTO …)
├─ auth/         로그인·세션·비밀번호 확인
└─ common/       공통
    ├─ security/  권한 검사, 외부 API 키 암호화
    ├─ web/       응답 형식 {success, message, data}
    ├─ config/    JSON 설정, SQL 로그
    ├─ exception/ 업무 오류(400·404 문구)
    └─ util/      사업자번호 검산, 수량 읽기 등

backend/src/main/resources/
├─ application.yml   설정(DB 접속 정보는 파일에 적지 않고 환경변수로만)
└─ mapper/           SQL — 업무코드 폴더 아래 화면코드 파일(sa/SA0001.xml …)
```

| 공통 규칙 | 내용 |
|---|---|
| 권한 | 메서드에 `@RequirePermission("화면권한")` 을 붙이면 한곳에서 검사한다. 권한 키는 기존 프로그램과 같다 |
| 응답 | 모든 업무 API 는 `{success, message, data}` 형식. 오류 문구는 기존 프로그램 문구를 그대로 쓴다 |
| SQL | XML 에 둔다. 키워드 대문자, 컬럼 한 줄에 하나, 앞쉼표 형식으로 통일 |
| 트랜잭션 | 재고를 움직이는 작업은 하나의 트랜잭션으로 처리해, 중간에 실패하면 모두 되돌린다 |

## 5. 화면(frontend)

```
frontend/src/
├─ pages/               화면. 업무코드 폴더 아래 화면코드 폴더
│   ├─ auth/            로그인
│   ├─ dashboard/       대시보드
│   └─ sa/ cm/ pd/ lg/
│       └─ SA0001/
│           ├─ SA0001Page.tsx       화면 본체
│           ├─ components/          화면 안의 부품(SA0001ProductForm …)
│           ├─ services/            서버 호출(SA0001Service.ts)
│           ├─ types/               자료 모양(SA0001.types.ts)
│           └─ hooks/ store/ utils/ 필요한 화면만
├─ shared/              여러 화면이 함께 쓰는 것
│   ├─ components/      창(Modal)·알림·자동완성·BOM 표·라벨 창·TV 화면 등, f1-grid(s-erp 에서 복사, 원본 그대로 — 고치지 않음)
│   ├─ services/        서버 호출 공통(apiClient — 로그인 보안 토큰, 응답 형식 처리)
│   ├─ config/          메뉴 구성(navigation.ts)·화면 설명 문구
│   └─ utils/ state/ types/ hooks/
├─ routes/              메뉴 → 화면 연결표(pageRegistry.tsx)
└─ styles/              스타일(공통 · 부품 · 업무별 sa.css / cm.css / lg.css · 인쇄 · TV)
```

| 공통 규칙 | 내용 |
|---|---|
| 파일 이름 | 화면 폴더 안의 파일은 모두 화면코드로 시작한다(`SA0001Page`, `CM0001Tab01`, `SA0001Service`) |
| 공용 승격 | 두 화면 이상이 실제로 같이 쓸 때만 `shared/` 로 옮긴다 |
| 스타일 | 공통 모양을 먼저 쓰고, 그 화면에만 있는 모양만 업무별 CSS 에 둔다 |
| 문구 | 기존 화면의 문구·배치를 그대로 쓴다. 새 안내 문구를 만들지 않는다 |

## 6. 문서(docs)

| 파일 | 내용 |
|---|---|
| 00 ~ 03 | 전환 검토, 전체 개요, 기존 프로그램 구조, 업무 규칙 |
| 04-screen-map | 화면별 전환 상태 |
| 05-target-architecture | 새 시스템 설계 규칙 |
| 06-new-system · 07-migration-status | 새 시스템 설명, 작업 기록·남은 과제 |
| 08-run-guide | 실행·테스트 방법 |
| 09-s-erp-reference | 참고한 사내 프로젝트 비교 |
| 10-change-history | 전환 작업 내역(보고용) |
| 11-project-structure | 이 문서 |
| 12-f1-grid-review | F1-Grid 도입 검토·문제점 |
| reference/ | API·DB·화면 목록(기존 프로그램에서 자동 추출) |

## 7. 규모 (2026-09-22)

| 구분 | 수량 |
|---|---|
| 전환 완료 화면 | 18개(로그인·대시보드 제외) + 현장 TV 화면 2개 |
| 서버 Java 파일 | 100개 |
| SQL(XML) 파일 | 19개 |
| 화면 TypeScript 파일 | 139개 |
| 자동 테스트 | 서버 74건 · 화면 85건 |
