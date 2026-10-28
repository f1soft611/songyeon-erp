# 09. s-erp-main 분석과 송연 비교

확인일: 2026-09-18 · 대상 `D:\workspace\s-erp-main` (읽기만 함, 서버·빌드 실행 안 함)
설정 파일의 DB·JWT·메일·스토리지 접속 정보는 키가 있다는 사실만 확인했고 값은 기록하지 않았다.

송연 React 구조의 참조 프로젝트다. 이 문서는 s-erp의 **실제 구조·규칙**과 **송연이 무엇을 따르고 무엇을 따르지 않는지**를 기록한다. 결론은 [05. 목표 구조](05-target-architecture.md)에 반영했다.

## 1. 핵심 결론

1. **s-erp 백엔드는 구버전 스택이다.** eGov 실행환경 4.3.0 → Spring Boot **2.7.18**, Spring 5.3.37, `javax.*`, jjwt 0.9.1, 컴파일 source/target **1.8**, war 패키징. 송연은 Boot 3.5.16 / Java 17 / `jakarta.*` / jar이므로 **s-erp 코드를 복사하면 동작하지 않는다.** 가져올 것은 구조·명명·계층·문서 규칙이다.
2. **그대로 가져올 것**: 백엔드 계층과 명명(`controller / service / service.impl / domain.model / domain.repository`, VO 3종, DAO + MyBatis XML), 응답 봉투 `{resultCode, resultMessage, result}`, 프런트 기능 폴더 구성과 `apiGet/apiPost/apiPut/apiDelete` 서비스 계층, 공통 페이지 부품, 날짜별 작업 문서·DB 변경 기록 규칙, 정본 기능 → 생성 스킬 방법론.
3. **가져오지 않을 것**: JWT 인증(아래 결함), 문자열·정수가 섞인 응답 코드, 입력 오류를 HTTP 200으로 보내는 방식, 멀티테넌트(`tenant_id`), DB 메뉴 → URL → if 사다리로 화면을 고르는 방식.
4. 송연의 세션 + CSRF + HttpOnly 쿠키 인증과 Werkzeug 해시 검증은 **유지**한다.
5. 송연의 전역 `SNAKE_CASE` JSON 설정은 s-erp 봉투(camelCase)와 MyBatis `mapUnderscoreToCamelCase` 관례와 충돌한다 → 업무 API 전에 camelCase로 전환한다.

## 2. s-erp 기술 스택

| 영역 | 항목 | 버전·내용 |
|---|---|---|
| 백엔드 | eGov 실행환경 | `org.egovframe.rte.*` 4.3.0 (ptl.mvc, psl.dataaccess, fdl.idgnr/property/string/crypto/security) |
| | Spring Boot / Framework | 2.7.18 / 5.3.37 (eGov boot parent 경유) |
| | Java | 문서상 17+, 실제 compiler 1.8. 워크플로 규칙도 "Java 8 문법만" |
| | 서블릿 | javax.servlet 4.0.1, tomcat-embed 9.0.91 고정, war |
| | DB | **PostgreSQL** (드라이버는 MSSQL·MySQL·HSQL도 포함 — 템플릿 잔재) |
| | 데이터 접근 | MyBatis 3.5.16 (eGov psl.dataaccess, `EgovAbstractMapper` DAO). JPA·QueryDSL 미사용 |
| | 커넥션 | commons-dbcp2 + log4jdbc |
| | 인증 | jjwt 0.9.1, HS512 |
| | 기타 | springdoc-openapi-ui 1.7.0, Lombok, MinIO 8.5.7, mail |
| 프런트 | React / 빌드 | 19.2 / Vite 8.2, TypeScript ~6.0, oxlint |
| | UI | **MUI 9.3**(+icons, date/tree pickers), emotion, dayjs, exceljs |
| | 라우터 | react-router-dom 7.18 |
| | 그리드 | 사내 **F1-Grid** (`shared/components/f1-grid`, 약 9,300줄: 편집·검증·병합·가상화·트리·엑셀·컨텍스트 메뉴) |
| | 상태 | useState + Context 2개(AppSettings, Notification). axios·react-query 없음 |
| | 테스트 | Vitest 4.1 + Testing Library(약 30개), Playwright(스크린샷용) |

## 3. s-erp 백엔드 규칙

### 3-1. 패키지·클래스

```text
egovframework.let.<area>.<plural>.{controller | service | service.impl | domain.model | domain.repository}
egovframework.com.{config, security, jwt, jackson, cmm.*}   ← 공통
```
트랜잭션 AOP pointcut이 `egovframework.let..impl.*Impl.*` 패키지명에 묶여 있다.

| 역할 | 이름 | 예 |
|---|---|---|
| Controller | `<Prefix>ApiController`, `@RequestMapping("/api/v1/<area>/<plural>")` | `SystemWarehouseApiController` |
| Service / Impl | `<Prefix>Service` / `<Prefix>ServiceImpl extends EgovAbstractServiceImpl` (생성자 주입) | 메서드 `list/create/update/delete<Entity>` |
| DAO | `<Prefix>DAO extends EgovAbstractMapper` | `select<Entity>List / ById / insert / update / delete` |
| VO | `<Prefix>VO`, `<Prefix>SaveRequestVO`, `<Prefix>SearchConditionVO` | 모든 필드 `@Schema` |
| 주체 | `@AuthenticationPrincipal LoginVO user` | |

### 3-2. 매퍼 XML

- 위치 `resources/egovframework/mapper/let/<area>/<plural>/EgovSystem<Entity>_SQL_postgresql.xml` — 접미사 `_<DbType>.xml`만 로드된다.
- namespace = DAO 단순 클래스명. resultMap은 모든 컬럼을 명시.
- INSERT는 `<select resultType="long"> INSERT … RETURNING <pk>`.
- 전역 `jdbcTypeForNull=VARCHAR` → nullable bigint는 `jdbcType=BIGINT`를 반드시 명시해야 한다(사고 원인).

### 3-3. 응답·예외

| 상황 | HTTP | 본문 |
|---|---|---|
| 목록 | 200 | `{"resultCode":200,"resultMessage":"성공했습니다.","result":{"resultList":[…]}}` |
| 등록 | 201 | `result.item` + `result.message` |
| 입력 오류(컨트롤러가 IllegalArgumentException을 catch) | **200/201** | `{"resultCode":900,"resultMessage":"입력값 무결성 오류 입니다.","result":{"message":"창고명은 필수입니다."}}` |
| 처리되지 않은 예외 | 400/403/404/500 | `{"resultCode":"FAIL",…}` — **문자열 코드, result 없음** |
| 미인증 | 401 | `resultCode:403` |
| 로그인·refresh | 항상 200 | `resultCode:"200"/"300"/"401"`(문자열) |

`ResponseCode`: 200 성공, 403 인가 오류, 500, 600 업무, 700 삭제, 800 저장, 900 입력.
**결함**: 프런트 apiClient는 `resultMessage`로 오류를 만들기 때문에 900 응답의 구체 메시지(`result.message`)가 화면에 나오지 않는다.

### 3-4. 인증 (JWT)

로그인 `POST /auth/login-jwt {tenantCode, id, password}` → access 15분, refresh 7일. 프런트는 **localStorage `s-erp-auth`**에 저장하고 `Authorization: Bearer`로 보낸다. CSRF 끔, STATELESS, `/api/v1/**` 인증, 나머지 denyAll. 비밀번호는 SHA-256 + ID salt.

**송연이 따르지 않는 이유(결함)**:
1. 필터가 토큰 `type`을 검사하지 않아 **refresh 토큰(7일)이 access 토큰으로 통과**한다.
2. 로그인 응답의 `LoginVO`에 **비밀번호 해시가 포함**된다.
3. localStorage 토큰은 XSS에 노출되고 서버 측 폐기 수단이 없다.
4. 세션에도 LoginVO를 저장해 STATELESS 설정과 모순된다.

### 3-5. 권한·메뉴

- 테이블: `tb_role`, `tb_login_account_role`, `tb_module`(사이드바 최상위), `tb_menu`(트리), `tb_permission`(READ·CREATE·UPDATE·DELETE·EXCEL), `tb_menu_permission`, `tb_role_menu_permission`.
- `GET /api/v1/menus/my` → 역할 기준 모듈·메뉴 트리 + 버튼 권한 5종.
- **서버 강제는 약하다**: 변경 API는 `requireAdmin`(관리자 역할)만 확인하고, 메뉴 단위 권한은 프런트가 메뉴·버튼을 숨기는 방식으로만 적용한다.

### 3-6. DB·기타

- 명명: `tb_<단수>`, `<단수>_id bigint identity`, `_nm/_code/_dc`, `use_at 'Y'/'N'`, `sort_order`, `created_at/updated_at`(+ 일부 `created_by/updated_by`), `tenant_id`.
- 변경 기록: `backend/DATABASE/YYYYMMDD/YYYYMMDD_NNN_{create|add|seed}_…sql` + `_change.md` + `_rollback.sql`, `docs/database/`에 미러, `db-schema.md` 갱신. (미러 폴더명이 `2026-09-09` 형식이라 규칙과 어긋남)
- 페이징 규약 없음(전체 조회 후 프런트 필터).
- 트랜잭션: AOP 선언형(모든 `*Impl`) + `@Transactional` 이중 적용.
- 설정: `application.properties` + `-dev`, eGov `Globals.*` 키, Maven 리소스 필터링.

## 4. s-erp 프런트엔드 규칙

- **폴더**: `pages/<도메인>/<기능>/XxxPage.tsx` + 같은 폴더의 `components/ hooks/ services/ types/ data/ constants/`. 여러 페이지에서 재사용할 때만 `shared`로 승격한다. 과도한 분할 금지.
- **기능 4파일**(생성 스킬 기준): `XxxManagementPage.tsx`, `XxxManagementPanel.tsx`(forwardRef, `saveCurrentChanges/deleteSelectedRows/exportCurrentRows`), `xxxManagement.service.ts`, `xxxManagement.types.ts`(Row / SavePayload / VO).
- **API**: 기능 서비스 → `shared/services/apiClient`(`apiGet/Post/Put/Delete`)만 사용. apiClient는 localStorage 토큰 첨부, 만료 60초 전 선제 갱신, `resultCode !== '200'`이면 예외, 성공 시 `result`만 반환. 타임아웃·비JSON 처리 없음.
- **라우팅**: React Router 라우트는 `/login`, `/`, `/dashboard/*` 정도다. 업무 화면은 DB 메뉴(`menu_url`)를 URL로 바꾸고 `DashboardContent.tsx`의 **if 사다리**로 컴포넌트를 고른다. 딥링크·새로고침을 지원한다.
- **화면 템플릿**: `PageHeader`(breadcrumb·설명·권한별 버튼) → `PageSearchArea`(접이식 검색) → `PageMessageArea`(오류) → Panel(F1-Grid, 변경분 일괄 저장, 저장 후 재조회).
- **공통 부품**: PageHeader, PermissionGroupActionBar, PageSearchArea, PageMessageArea, Page/GridLoadingSkeleton, UnsavedChangesConfirmDialog, F1Grid/F1Tree, AuthLayout, AppSettingsContext(테마·화면 배율), NotificationContext(Snackbar), useDebouncedSearch, usePagination.
- **반응형**: 375 / 768 / 1280px, 가로 스크롤 금지.
- **이름**: 페이지·컴포넌트 PascalCase, 서비스 파일 camelCase, 함수 `fetchXxxRows / createXxx / updateXxx / deleteXxx`, 라벨은 한글 리터럴.

## 5. s-erp 개발 프로세스·자동화

| 구성 | 내용 |
|---|---|
| 문서 순서 | 작업지시서 → 계획서 → 상세 사양서 → 구현 → 결과 문서·스크린샷 → DB 이력 점검 (`docs/{directions,plan,spec,result}/YYYYMMDD/…`) |
| `AGENTS.md` | 루트·backend·frontend 각각 규칙 문서 |
| `/dev:crud-temp1` | 계약(엔드포인트·필드·봉투) 확정 → 백엔드·프런트 에이전트 병렬 실행 → 교차 검증·빌드 |
| skill-impl | 백엔드 Java 7파일(VO 3, DAO, Service, Impl, Controller) |
| skill-orm | 매퍼 XML 1개 + DAO↔statement 대응표 |
| skill-view | 프런트 4파일 + DashboardContent 분기 |
| skill-reg-menu | 메뉴 seed SQL(`INSERT … ON CONFLICT DO NOTHING`, code 조인) + rollback + 변경 문서. 실행은 승인 후 |
| DB MCP | 읽기 전용 PostgreSQL MCP로 테이블 계약을 먼저 확인 |
| f1workflow | 분석 → 설계 승인 → worktree → 계획 → 병렬 실행 → TDD → 검증 → 리뷰 |

핵심 방법론: **정본 기능 1세트를 먼저 완성하고, 그 규칙을 생성 스킬로 문서화한다.** 송연도 첫 기능(제품+BOM) 완성 후 같은 방식으로 스킬을 만든다.

## 6. 송연 현재 코드와의 비교

| 항목 | s-erp-main | 송연 현재 | 판단 |
|---|---|---|---|
| 최상위 구조 | frontend / backend / docs + AGENTS.md + 스킬 | frontend / backend / docs + 레거시 폴더 + `.tools`. AGENTS.md 없음 | 송연용 AGENTS.md 3종 작성 |
| 스택 | eGov 4.3 / Boot 2.7.18 / Spring 5.3 / javax / Java 8 문법 | Boot 3.5.16 / Java 17 / jakarta | **의도적으로 다름.** eGov를 쓰려면 5.0 계열 |
| 백엔드 패키지 | `egovframework.let.<area>.<plural>.{계층}` | `kr.co.songyeon.mes.auth` 한 패키지에 모두 | **계층·명명은 맞추고 루트는 유지** |
| 인증 | JWT, localStorage, CSRF 끔 | 세션 쿠키 + CSRF, IP 시도 제한, 해시 호환, 더미 해시로 타이밍 균등화 | **송연 유지** (보안상 우수) |
| 비밀번호 | SHA-256 + ID salt | Werkzeug scrypt/pbkdf2 | 송연 유지 |
| 응답 | 봉투(코드 타입 혼재, 900 결함) | 원시 객체 + `{error}`, SNAKE_CASE | **봉투 도입(개선판), camelCase 전환** |
| 예외 | GlobalExceptionHandler + 컨트롤러 900 변환 | `ApiErrors` 2개 | GlobalExceptionHandler + BizException, HTTP 상태 사용 |
| DB 접근 | MyBatis + dbcp2 + AOP 트랜잭션 | JDBC `DriverManager`, 트랜잭션 없음 | **MyBatis 도입**, Hikari, `@Transactional`만 |
| DB | PostgreSQL | 레거시 SQLite 읽기 전용 | **PostgreSQL 확정** (s-erp와 같음) |
| DB 변경 기록 | DATABASE/YYYYMMDD + rollback + db-schema.md | 없음(아직 스키마 변경 없음) | 따름 (원본은 한 곳) |
| 메뉴·권한 | DB 메뉴·역할·버튼 권한 5종, 서버 강제 약함 | 하드코딩 navigation + 레거시 권한 키 54개 + 별칭, 서버 검사 없음 | 1단계 서버 권한 검사, 2단계 DB 메뉴 |
| 라우팅 | React Router + DB 메뉴 URL + if 사다리 | pathname 분기 + 탭 작업공간 + pageRegistry | **송연 방식 유지**(레거시 UX), URL 동기화는 미정 |
| UI | MUI 9 + F1-Grid + 공통 페이지 부품 | 순수 CSS + `<dialog>` + `<table>` | 공통 페이지 부품은 도입, F1-Grid는 결정 필요 |
| apiClient | 토큰·갱신·언래핑 | 인증 전용 request, 매번 CSRF 조회 | 같은 공개 API로 신설(세션·CSRF 캐시) |
| 상태 | useState + Context | useState / useReducer(store) | 유지 |
| 테마 | MUI theme + Context(`erp-theme`) | CSS 변수 + useTheme(`songyeon-theme`) | 유지(MUI 도입 시 통합) |
| 테스트 | Vitest + Playwright(캡처) | Playwright E2E 13 + JUnit 12 | Vitest 추가 |
| 문서 | 날짜별 directions/plan/spec/result | 번호 문서 01~09 | 앞으로의 작업은 날짜별 체계, 번호 문서는 기준 자료로 유지 |
| 기타 | CORS 화이트리스트, CSP, HTMLTagFilter, Swagger | Vite 동일 출처 프록시 | springdoc 2.x 검토 |

## 7. s-erp를 Boot 3 / Java 17로 가져올 때 바꿔야 하는 것

| s-erp | Boot 3 / Java 17 |
|---|---|
| `javax.servlet.*`, `javax.annotation.*` | `jakarta.*` |
| eGov boot parent·rte 4.3.0 | eGov 5.0 또는 순수 Boot 3.5 |
| Security 5.7 `antMatchers`, `.cors().and()` | `requestMatchers`, 람다 DSL |
| `ResponseStatusException.getStatus()` | `getStatusCode()` |
| jjwt 0.9.1 | 0.12.x (송연은 세션이라 불필요) |
| springdoc-openapi-ui 1.7.0 | springdoc-openapi-starter-webmvc-ui 2.x |
| tomcat 9 고정, javax servlet-api, jstl, commons-fileupload, MultipartFilter | 제거(Boot 3 기본) |
| `spring.config.use-legacy-processing` | 삭제 |
| compiler 1.8, "Java 8 API만" 규칙 | `java.version 17`, 송연에는 적용하지 않음 |
| `mysql-connector-java`, log4jdbc 1.2 | `mysql-connector-j` 또는 제거, p6spy·MyBatis 로거 |
| hibernate-validator 7 혼용 | `spring-boot-starter-validation` |
| `Globals.*` + `EgovProperties` 정적 로딩, dbcp2 수동 DataSource | `@ConfigurationProperties` + Hikari 자동 구성 |

## 8. 참조한 s-erp 경로

- 규칙: `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, `.claude/skills/skill-{impl,orm,view,reg-menu}/SKILL.md`, `.claude/commands/dev/crud-temp1.md`, `.github/instructions/*`, `.github/f1workflow/*`
- 백엔드: `backend/pom.xml`, `egovframework/com/{cmm/GlobalExceptionHandler, cmm/ResponseCode, cmm/service/ResultVO, cmm/util/ResultVoHelper, security/SecurityConfig, jwt/*, config/EgovConfigApp*}`, `egovframework/let/system/warehouses/**`, 매퍼 `EgovSystemWarehouse_SQL_postgresql.xml`, `backend/DATABASE/*`
- 프런트: `routes/AppRouter.tsx`, `shared/services/{apiClient,authService}.ts`, `pages/dashboard/{services/menuService.ts, components/DashboardContent.tsx}`, `pages/settings/system/warehouses/**`

### 정렬 이력

2026-09-17에 송연 프런트를 s-erp 규칙으로 정렬했다: `pages/Login`·`pages/Dashboard`·`pages/Product/index.tsx` → `pages/auth/LoginPage.tsx`·`pages/dashboard/DashboardPage.tsx`·`pages/sales/products/ProductRegistrationPage.tsx`, 공통 코드 → `shared/`, 화면 연결 → `routes/`, 제품등록 전용 UI는 기능 폴더 안으로 옮겼다. 제품등록의 `store/`(useReducer)는 s-erp에 없는 폴더지만 입력 상태 규칙을 모은 페이지 내부 reducer이므로 유지한다.
