# 송연 이관 가이드 — 변환본 → SONGYEON_ERP

- 작성일: 2026-10-02
- 대상: 이 저장소에서 송연 업무 화면을 옮기는 개발자

## 1. 배경

| 구분 | 위치 | 설명 |
|---|---|---|
| 기존 송연 프로그램 | `C:\Users\USER\Documents\업무\송연\MES_프로토타입_20260916` | 업체가 만든 Python Flask + SQLite + 순수 JS. 화면 문구·동작의 기준 |
| 송연 변환본 | `C:\Users\USER\Documents\업무\송연\backend`, `frontend` | Flask 일부를 Spring Boot 3.5 + React로 옮긴 1차 작업본. 화면 18개 전환 |
| 기준 프로젝트 | `D:\workspace\S_ERP` | 사내 ERP 공통 껍데기. **수정하지 않음** |
| 이 프로젝트 | `D:\workspace\SONGYEON_ERP` | S_ERP 내부 구조를 그대로 복사한 뒤 송연 업무 화면을 올리는 곳 |

방향: **내부 구조·환경설정·공통 기능은 S_ERP와 같게 유지**하고, 송연 변환본의 업무 로직·화면을 S_ERP 규칙에 맞춰 다시 배치한다. 메뉴 구성만 송연에 맞게 바뀐다.

## 2. 참고 자료

[legacy-analysis/](legacy-analysis/README.md)는 송연 변환본의 `docs` 폴더를 그대로 복사한 것이다(2026-10-02 기준, 수정하지 않음). 내부 링크와 경로는 변환본 기준이다.

| 보고 싶은 것 | 문서 |
|---|---|
| 업무 규칙(계산식, 상태 전이, 결함) | [03-business-rules.md](legacy-analysis/03-business-rules.md) |
| 메뉴 43개 ↔ 기존 JS ↔ API ↔ 권한 ↔ 전환 상태 | [04-screen-map.md](legacy-analysis/04-screen-map.md) |
| 변환본의 패키지·응답·권한 설계 | [05-target-architecture.md](legacy-analysis/05-target-architecture.md), [06-new-system.md](legacy-analysis/06-new-system.md) |
| 진행 현황, 남은 이슈 | [07-migration-status.md](legacy-analysis/07-migration-status.md) |
| S_ERP와의 비교 | [09-s-erp-reference.md](legacy-analysis/09-s-erp-reference.md) |
| 레거시 API 290개 / 테이블 60개 | [reference/api-inventory.md](legacy-analysis/reference/api-inventory.md), [reference/database-schema.md](legacy-analysis/reference/database-schema.md) |

## 3. 두 코드베이스의 차이 — 옮길 때 바꿔야 하는 것

| 항목 | 송연 변환본 | SONGYEON_ERP (S_ERP 구조) |
|---|---|---|
| 서버 프레임워크 | Spring Boot 3.5.16, `jakarta.*` | eGovFrame Boot 4.3.0(Spring Boot 2.7), `javax.*` |
| Java 문법 | Java 17 | 컴파일 `source/target 1.8`. `var`, `record`, 텍스트 블록, switch 식 사용 불가 |
| 패키지 | `kr.co.songyeon.mes.{controller,service,dao,dto}.<업무코드>` 계층 우선 | `egovframework.let.<영역>.<기능>.{controller,domain/model,domain/repository,service,service/impl}` 기능 우선 |
| 클래스 이름 | `SA0001Controller`, `SA0001Service`, `SA0001DAO`, `SA0001DTO` | `XxxApiController`, `XxxService` + `XxxServiceImpl`, `XxxDAO`, `XxxVO` |
| SQL 위치 | `resources/mapper/sa/SA0001.xml` | `resources/egovframework/mapper/let/<영역>/<기능>/*_SQL_postgresql.xml` |
| 응답 형식 | `{success, message, data}` | `ResultVO {resultCode, resultMessage, result}` |
| 인증 | Spring Security 세션 쿠키 + CSRF, 계정은 `employees` | JWT(`egovframework.com.jwt`). **계정·로그인 화면은 송연 그대로**(아래 4장 D4) |
| 권한 | 메서드에 `@RequirePermission("권한키")`, 직원별 권한 키로 메뉴 필터 | **권한 개념 없음**(2026-10-02 결정): 로그인한 모든 사용자가 모든 메뉴·기능 사용. 권한관리 화면은 S_ERP 그대로 남김 |
| 메뉴 | 프론트 `shared/config/navigation.ts` + `routes/pageRegistry.tsx` 정적 등록 | DB `tb_module`·`tb_menu`(송연 메뉴 구성을 `20261002_002`로 등록, 메뉴관리 화면에서 수정) + `DashboardContent.tsx`에서 `모듈 id + 메뉴 id`로 화면 연결 |
| 화면 위치 | `pages/<업무코드>/<화면코드>/<화면코드>Page.tsx` | `pages/<영역>/<기능>/XxxPage.tsx` (frontend/AGENTS.md) |
| UI | 업무별 CSS + HTML 표, F1-Grid 일부 | MUI + F1-Grid, `PageHeader`·`PageSearchArea` 공통 컴포넌트 |
| 프론트 테스트 | Playwright | Vitest(jsdom) + Playwright 캡처 스크립트 |
| 포트 | 프론트 5173 / 서버 8081 | 프론트 4173 / 서버 8080 |

## 4. 결정이 필요한 것

| 번호 | 항목 | 선택지 / 메모 |
|---|---|---|
| D1 | 화면 코드·모양 | **결정됨(2026-10-02)**: S_ERP 방식. 서버 `egovframework.let.<업무코드 소문자>.<기능>` (예: `let.cm.basicinfo`), 화면 `pages/<업무코드 소문자>/<기능>/XxxPage.tsx` (예: `pages/cm/basic-info`), API `/api/v1/<업무코드>/<기능>/...`, 화면 모양은 S_ERP(제목줄 버튼 + F1-Grid). 문구·칸 이름·계산 규칙은 송연 그대로. 송연 화면코드(CM0001 등)는 문서·주석에 남긴다 |
| D2 | 메뉴 구성 | **결정됨(2026-10-02)**: 메뉴 구성은 송연 그대로(분류 11개·메뉴 42개, `20261002_002`). S_ERP 환경설정 메뉴는 똑같이 옮김(`20261002_001`, 맨 뒤) |
| D3 | 업무 DB | **결정됨(2026-10-02)**: 송연 PostgreSQL `songyeon` DB를 쓴다. 접속 정보는 송연 변환본과 같은 환경변수(`SONGYEON_DB_URL`·`SONGYEON_DB_USERNAME`·`SONGYEON_DB_PASSWORD`)로 받는다. 이 DB에는 S_ERP 공통 테이블(`tb_*`)이 이미 있으나 `tb_board_file`은 없다(공지 첨부 기능 사용 전 `backend/DATABASE/20260918/20260918_007_*` 적용 여부 확인 필요) |
| D4 | 계정·로그인·권한 | **결정됨(2026-10-02)**: 로그인 화면·계정은 기존 송연과 동일(`employees`, 회사코드 없음, 시도 제한 같음). 역할·권한 없음 — 모두에게 전체 메뉴. 테넌트 `SONGYEON`은 메뉴 표 때문에 둔 내부 값 |
| D5 | 겹치는 기준정보 | 송연 창고(`warehouses`)와 S_ERP 창고관리(`tb_warehouse`), 송연 기초정보와 S_ERP 공통코드의 역할 분담 |

## 5. 메뉴 구성 초안 (송연 기준)

`04-screen-map.md` 기준. 상태는 변환본 기준(✅ 완료 · 🟡 화면은 있으나 일부 미연결 · ⬜ 미착수).

| 모듈 | 메뉴 | 변환본 화면코드 | 변환본 상태 |
|---|---|---|---|
| 대시보드 | 대시보드 | dashboard | 🟡 |
| 영업관리 | 제품등록 · 단가관리 · 견적 · 수주등록 · 출하등록 · 생산가능확인 | SA0001~SA0006 | 🟡 |
| 공통관리 | 기초정보(탭 10개) · 생산스케줄 · 물류스케줄 | CM0001~CM0003 | ✅ |
| 생산관리 | 생산확정 · 생산입고 · 생산현황 · 라벨출력 | PD0001~PD0004 | 🟡 / ✅ |
| 물류관리 | 제품재고관리 · 출하확정 · 출하현황 | LG0001~LG0003 | ✅ |
| 판매관리 | 판매등록 · 판매현황 · 토탈집계 | — | ⬜ |
| 구매관리 | 발주 · 입고 · 재료치환 · 수불대장 · 재고조정 · 재고현황 · 문서함 | — | ⬜ |
| 품질관리 | 라벨등록 · 실시간 온도 | — | ⬜ |
| 상품개발 | 레시피 작성 · 검색·공유 · 공유 로그 | — | ⬜ |
| 인사·회계 | 인사 · 기초회계 · 회계거래 · 입출금 · 매출매입 · 거래처별대장 · 세금계산서 · 거래명세표 | — | ⬜ |
| 시스템 설정 (S_ERP 공통) | 모듈 · 메뉴 · 역할 · 창고 관리 | — | S_ERP에 있음 |

## 6. 화면 하나를 옮기는 순서

1. `docs/directions/YYYYMMDD`에 작업지시서를 쓰고 [AGENTS.md](../../AGENTS.md)의 순서(계획서 → 사양서 → 구현 → 결과)를 따른다.
2. `04-screen-map.md`에서 해당 메뉴 행, `03-business-rules.md`에서 해당 업무 규칙을 확인한다.
3. 변환본의 Controller/Service/DAO/Mapper를 S_ERP 패키지 구조로 옮긴다. `jakarta` → `javax`, Java 8 문법, `ResultVO` 응답, JWT 사용자(`@AuthenticationPrincipal LoginVO`)로 바꾼다.
4. 테이블이 새로 필요하면 `backend/DATABASE/YYYYMMDD`와 `docs/database/YYYYMMDD`에 SQL·변경 이력·롤백을 남기고 `docs/database/db-schema.md`를 갱신한다.
5. 메뉴는 `tb_module`·`tb_menu` 시드 SQL로 등록하고, `DashboardContent.tsx`에 `moduleId + pageKey` 분기를 추가한다.
6. 화면은 `frontend/AGENTS.md`의 폴더 규칙(components/hooks/services/types)과 MUI·F1-Grid 공통 컴포넌트로 다시 구성한다. **그리드 첫 칸은 순번(필수)**. 문구·칸 이름·계산 규칙은 기존 송연 화면을 따른다.
7. `npm run build`, `npm run test`, `mvn test`로 검증하고 결과 문서와 스크린샷을 `docs/result/YYYYMMDD/<work-slug>`에 남긴다.
