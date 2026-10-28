# 05. 목표 구조 — Spring Boot·React 설계 기준

최종 정리: 2026-09-18

이 문서는 **앞으로 코드를 쓸 때 따를 기준**이다. 참조 프로젝트 `D:\workspace\s-erp-main`의 구조·규칙을 송연 스택(Boot 3.5 / Java 17 / 세션 인증)에 맞게 옮겼다. s-erp를 분석한 상세 내용은 [09. s-erp-main 분석·비교](09-s-erp-reference.md)에 있다.

상태 표시: **확정** = 이미 적용했거나 사용자가 정함 · **권장** = 이 문서의 제안(결정 필요) · **미정** = 정보가 부족해 결정 보류

## 1. 결정 사항 요약

| # | 항목 | 결정 | 상태 | 근거 |
|---|---|---|---|---|
| 1 | 백엔드 | Spring Boot 3.5.16 + Java 17 (jakarta) | 확정 | 구현됨 |
| 2 | 프런트엔드 | React 19 + TypeScript + Vite, `pages/<업무>/<기능>/XxxPage.tsx` | 확정 | s-erp 기준으로 정렬함 |
| 3 | s-erp 코드 재사용 | **구조·명명·계층만** 따른다. 코드는 복사하지 않는다 | 권장 | s-erp는 eGov 4.3 / Boot 2.7.18 / javax / Java 8 문법이라 Boot 3에서 그대로 동작하지 않음 |
| 4 | 인증 | **세션 쿠키 + CSRF 유지** (s-erp JWT를 따르지 않음) | 권장 | 이미 구현·검증됨, HttpOnly가 localStorage JWT보다 안전, 사내 단일 서버. s-erp JWT에는 refresh 토큰이 access로 통과하는 등 결함이 있음 |
| 5 | 응답 형식 | 업무 API 공통 봉투 `{success, message, data}` | **적용(2026-09-18)** | 3장 참고 |
| 6 | JSON 키 | 전역 `SNAKE_CASE` 해제 → **camelCase** | 권장 | 봉투·MyBatis(`mapUnderscoreToCamelCase`)·s-erp 스킬과 충돌. 현재 인증 응답 키 5개를 함께 변경 |
| 7 | DB 접근 | **MyBatis** (`mybatis-spring-boot-starter` 3.0.x) + XML 매퍼 | 권장 | 레거시 SQL 집계가 많음, s-erp 관례와 일치 |
| 8 | DB 종류 | **PostgreSQL** — DB를 생성하면 기존 SQLite 자료를 옮긴다 | **확정** (2026-09-18) | s-erp와 같음, `numeric`, 부분 인덱스 지원. 생성 전 과도기는 4-4 참고 |
| 9 | 스키마 관리 | 버전별 SQL 마이그레이션(Flyway) + `backend/DATABASE/YYYYMMDD/` 변경 기록 | 권장 | 레거시의 "기동 시 보정"을 대체 |
| 10 | 전자정부 실행환경 | 적용한다면 **5.0 계열**. 적용 여부는 미정 | 미정 | [08 문서 6장](08-run-guide.md#6-전자정부프레임워크egovframe-사용) |
| 11 | 화면 전환 방식 | **탭 작업공간 + `pageRegistry` 유지** (s-erp의 URL 라우팅·if 사다리를 따르지 않음) | 권장 | 레거시 UX 재현. 활성 탭 URL 동기화는 미정 |
| 12 | UI 라이브러리 | 순수 CSS 유지 vs **MUI + F1-Grid** 도입 | **시범 적용(2026-09-22)**: 생산현황(PD0003)만 F1-Grid, 전체 적용은 [12 문서](12-f1-grid-review.md) 결정 사항에 따름 | 편집 그리드가 많은 MES라 F1-Grid 도입 검토를 권장. 5-5 참고 |
| 13 | 메뉴·권한 | 1단계: 코드 정의(navigation) + **서버 권한 검사 필수**. 2단계: DB 메뉴 모델 | 권장 | 6장 |
| 14 | 운영 배포 | 사내 PC/서버, 동시 접속 수, 백업 | 미정 | [07 문서](07-migration-status.md) 결정 목록 |

## 2. 백엔드 목표 구조

### 2-1. 패키지 트리

패키지 루트는 `egovframework.let`이 아니라 **`kr.co.songyeon.mes`를 유지**한다. s-erp의 `egovframework.let`은 eGov 템플릿 샘플의 네임스페이스일 뿐이고(트랜잭션 pointcut이 그 이름에 묶여 있을 뿐), 송연에는 템플릿 코드가 없다. 하위 계층과 클래스 명명은 s-erp와 **같게** 한다.

```text
kr.co.songyeon.mes
├─ MesApplication
├─ common/
│  ├─ config/        WebConfig(권한 검사기 등록), (OpenApiConfig)
│  ├─ security/      @RequirePermission, @LoginOnly, PermissionInterceptor, PermissionChecker (+ 이관 예정: SecurityConfig, SessionUser …)
│  ├─ web/           ApiResponse (공통 응답 봉투)
│  ├─ exception/     GlobalExceptionHandler, BizException
│  └─ util/          수량·날짜·반올림 유틸
├─ controller/sa/     SA0001Controller … SA0006Controller      (업무코드 소문자 폴더: sa, cm, pd, lg, sl, pu, qm, rd, ha)
├─ service/sa/        SA0001Service … SA0006Service            (클래스 하나, 인터페이스 없음)
├─ dao/sa/            SA0001DAO … SA0006DAO                    (@Mapper 인터페이스, SQL은 resources/mapper의 XML)
├─ dto/sa/            SA0001DTO … SA0006DTO                    (화면당 DTO 클래스 하나 — 그 화면이 쓰는 필드를 모두 담음)
├─ auth/             로그인·세션(지금 구조 그대로. 옮길 때 controller/·service/·dao/ 계층으로)
└─ (앞으로) controller/cm·service/pd … 처럼 계층 폴더 아래 업무코드 폴더. 여러 업무가 쓰는 재고 원장 등은 service/common(가칭)
resources/
├─ application.yml
├─ db/migration/V{n}__*.sql          (Flyway)
└─ mapper/<업무코드 소문자>/<화면코드>.xml   (예: mapper/sa/SA0001.xml)
```

**계층 우선 + 화면 단위 (사용자 결정 2026-09-18)**: 계층 폴더(`controller`·`service`·`dao`·`dto`)를 먼저 두고 그 아래를 업무코드(`sa` …)로 나눈다. 화면 하나는 계층마다 파일 하나다(`SA0001Controller`·`SA0001Service`·`SA0001DAO`·`SA0001DTO` + `mapper/sa/SA0001.xml`). 화면이 부르는 API는 선택 목록(원재료·포장유형·거래처 등)까지 모두 그 화면 파일에 둔다.
- 여러 화면이 함께 쓰는 공통 조회 패키지(예: `sales/lookup`, `sales/common`)는 만들지 않는다. 같은 SELECT가 여러 화면 XML에 있어도 된다.
- 권한은 그 화면의 권한 키로 검사한다.
- DB를 쓰지 않는 순수 계산·문구만 `common/util`(`SimilarText`, `ClientNameUtil`, `NumberUtil`)에 둔다.
- 한 화면의 저장이 다른 테이블까지 바꾸면 그 화면 서비스가 한 트랜잭션으로 처리한다(예: 제품등록의 견적 확정).

**업무코드·화면코드 (사용자 결정 2026-09-18)** — 사내 다른 프로젝트(`BAHQ10034` 같은 화면 ID)처럼 화면을 코드로 부른다.

| 메뉴 분류 | 업무코드 | 백엔드 패키지 / API / XML 폴더 | 프런트 `pages/` 폴더 |
|---|---|---|---|
| 영업관리 | **SA** | `controller/sa`·`service/sa`·`dao/sa`·`dto/sa` / `/api/sa/…` / `mapper/sa` | `sa` |
| 공통관리 | **CM** | `cm` | `cm` |
| 생산관리 | **PD** | `pd` | `pd` |
| 물류관리 | **LG** | `lg` | `lg` |
| 판매관리 | **SL** | `sl` | `sl` |
| 구매관리 | **PU** | `pu` | `pu` |
| 품질관리 | **QM** | `qm` | `qm` |
| 상품개발 | **RD** | `rd` | `rd` |
| 인사회계 | **HA** | `ha` | `ha` |
| 대시보드 · 메신저·AI | (미정) | 지금 이름 유지 | `dashboard` |

화면코드 = 업무코드 + 4자리 번호(메뉴 순서). 영업관리:

| 화면코드 | 화면 | 백엔드 | API | XML | 프런트 | 권한 키(그대로) |
|---|---|---|---|---|---|---|
| SA0001 | 제품등록 | `controller/sa/SA0001Controller` · `service/sa/SA0001Service` · `dao/sa/SA0001DAO` · `dto/sa/SA0001DTO` | `/api/sa/sa0001` | `mapper/sa/SA0001.xml` | `pages/sa/SA0001/SA0001Page.tsx` | `product` |
| SA0002 | 단가관리 | `SA0002Controller` … `SA0002DTO` | `/api/sa/sa0002` | `SA0002.xml` | `pages/sa/SA0002/SA0002Page.tsx` | `pricing` |
| SA0003 | 견적 | `SA0003Controller` … `SA0003DTO` | `/api/sa/sa0003` | `SA0003.xml` | `pages/sa/SA0003/SA0003Page.tsx` | `quote` |
| SA0004 | 수주등록 | `SA0004Controller` … `SA0004DTO` | `/api/sa/sa0004` | `SA0004.xml` | `pages/sa/SA0004/SA0004Page.tsx` | `order` |
| SA0005 | 출하등록 | `SA0005Controller` … `SA0005DTO` | `/api/sa/sa0005` | `SA0005.xml` | `pages/sa/SA0005/SA0005Page.tsx` | `shipment` |
| SA0006 | 생산가능확인 | `SA0006Controller` … `SA0006DTO` | `/api/sa/sa0006` | `SA0006.xml` | `pages/sa/SA0006/SA0006Page.tsx` | `prod-check` |

- 자바 패키지·API 주소·XML 폴더는 소문자(`controller/sa`, `/api/sa/sa0001`, `mapper/sa`), 클래스·파일·프런트 폴더는 대문자(`SA0001Controller`, `SA0001.xml`, `pages/sa/SA0001`).
- **DTO 는 화면당 클래스 하나**(`dto/sa/SA0001DTO`)다(사용자 결정 2026-09-18). 요청·응답·DB 결과에 쓰는 필드를 한 클래스에 모두 담고, 안에 다른 DTO 클래스를 만들지 않는다. 목록·하위 줄은 같은 클래스의 목록으로 둔다(예: BOM 줄 `List<SA0001DTO> bom`). Lombok `@Getter @Setter`, 응답에는 값이 있는 칸만 나간다(`@JsonInclude(NON_NULL)`).
- 요청의 숫자 칸은 기존 `float()`처럼 너그럽게 읽는다(글자·빈 값·잘못된 값 → 숫자 또는 null, true/false → 1/0) — `common/config/JacksonConfig`. 단가 저장처럼 '보낸 칸만 고치는' 요청은 필드로는 안 보낸 칸을 구별할 수 없어 `Map`으로 받는다.
- XML 은 일반 MyBatis 방식대로 전체 클래스 경로: `resultType="kr.co.songyeon.mes.dto.sa.SA0001DTO"`, namespace `kr.co.songyeon.mes.dao.sa.SA0001DAO`.
- **SQL 작성 모양**(`mapper/sa/SA0001.xml`이 기준, 사용자 결정 2026-09-18): 키워드는 대문자, 절(`SELECT`·`FROM`·`JOIN`·`WHERE`·`GROUP BY`·`ORDER BY`)마다 한 줄, 컬럼은 한 줄에 하나(`SELECT` 아래 8칸 들여쓰기, 둘째부터 앞쉼표 `      , 컬럼`), 조건은 `WHERE a = 1` 다음 줄 `      AND b = 2`. `UPDATE`는 `SET` 아래 `        컬럼 = #{값}` / `      , 컬럼 = #{값}`, `INSERT`는 컬럼 목록과 `VALUES`를 각각 괄호 줄로 감싸 한 줄에 하나(`    , 컬럼`). 짧은 하위 쿼리(`(SELECT COUNT(*) FROM …)`)는 한 줄로 둔다.
- 메뉴 id(`product`, `pricing` …)는 **권한 키**라 바꾸지 않는다(직원 계정에 저장된 값). `navigation.ts`의 메뉴에 `code: 'SA0001'`을 붙이고, 화면 연결표(`pageRegistry`)는 화면코드로 찾는다. 분류 id는 업무코드(`SA`, `CM` …)다.
- 업무코드 목록은 서버 `common/web/BusinessApi`(로그인 필수·응답 봉투 적용 범위)와 프런트 `navigation.ts` 두 곳에 있다. 업무를 추가하면 둘 다 고친다.

재고 원장(`move_product_stock`, 원재료 증감)처럼 여러 업무가 쓰는 규칙은 `inventory` 패키지의 서비스로 한 곳에 두고, 다른 업무 서비스가 호출한다. 그 날짜 뒤 재고 증감(`productDeltaAfter`, 기존 product_delta_after)과 로트별 출하량(`lotShippedMap`, 기존 _lot_shipped_map)도 여기 있다 — 재고금액·재고조정 확정·출하 로트선택이 같은 숫자를 써야 한다.
제품 라벨 조회(버전·양식·마크·회사 고정정보·배합표·알러지)도 라벨출력·생산확정·라벨등록이 함께 쓰므로 `label` 패키지(`controller/service/dao/dto/label` + `mapper/label/Label.xml`)에 두고, 주소는 라벨 소관 업무(품질관리) 아래 `/api/qm/label/…` 로 한다(업무 API 규칙 `/api/<업무코드>/**` 안에 들어가야 로그인 검사·응답 봉투가 걸린다). 프런트는 `shared/components/LabelForm`(라벨 창) · `shared/utils/labelHtml.ts`(라벨 그리기·인쇄) · `shared/services/labelService.ts` · `shared/types/label.ts`.

### 2-2. 클래스 명명 (s-erp 규칙)

| 역할 | 이름 | 비고 |
|---|---|---|
| Controller | `SA0001Controller` | `@RestController`, `@RequestMapping("/api/sa/sa0001")` |
| Service | `service/sa/SA0001Service` (`@Service` 클래스 하나, 인터페이스 없음) | 생성자 주입(Lombok `@RequiredArgsConstructor` + `private final`), 변경 메서드에 `@Transactional`. 메서드 `listXxx / getXxx / createXxx / updateXxx / deleteXxx` |
| DAO | `dao/sa/SA0001DAO` (`@Mapper` 인터페이스) | 메서드 `selectXxxList / selectXxxById / insertXxx / updateXxx / deleteXxx` — XML의 id와 1:1. s-erp의 `domain/repository` 대신 `dao` 패키지를 쓴다(사용자 결정 2026-09-18) |
| DTO | `dto/sa/SA0001DTO` (화면당 하나, 요청·응답·DB 결과 필드 모두) | s-erp의 `domain/model` VO 대신 `dto` 패키지와 DTO 이름을 쓴다 |
| 권한 | 컨트롤러 클래스에 `@RequirePermission("화면권한")`, 로그인만 필요한 메서드는 `@LoginOnly` | 컨트롤러는 세션을 받지 않는다. 로그인한 사람 정보가 정말 필요한 메서드만 `@AuthenticationPrincipal SessionUser user` |
| 응답 | `ApiResponse<T>` (`ApiResponse.ok(…)`) | 3-1 공통 봉투. 컨트롤러에 try/catch 두지 않음 |

- 클래스 이름은 **화면코드 + 역할**이다(`SA0001Controller`·`SA0001Service`·`SA0001DAO`·`SA0001DTO`). 코드와 `DAO`·`DTO`는 대문자.
- (이전 결정 `ProductRegistration…` 화면 이름 방식은 화면코드 방식으로 대체됨, 2026-09-18)
- REST 경로는 `/api/<업무코드>/<화면코드>`다(예: `/api/sa/sa0001`, 하위 기능은 `/api/sa/sa0001/materials`). 레거시 경로를 유지할지는 3-3 참고.

### 2-3. 트랜잭션·동시성

- Service의 변경 메서드에 **`@Transactional`만** 붙인다(s-erp의 AOP + 어노테이션 이중 방식은 쓰지 않음).
- **검증 실패는 예외로 처리한다.** 오류 응답을 return하면 앞선 쓰기가 commit된다(레거시는 "commit 없이 close"로 롤백되는 구조였음).
- 재고는 원자적 UPDATE(`stock_qty = stock_qty + #{delta}`)로 갱신하고, 같은 트랜잭션에서 원장을 기록한다.
- 상태 전이는 조건부 UPDATE(`WHERE id=? AND ship_confirmed=0`) 후 영향받은 행 수로 확인한다.
- 채번(lot_no, 바코드, sort_order, 코드)은 DB 시퀀스·잠금 + UNIQUE 제약으로 한다.
- 예약 단가 반영은 요청 훅이 아니라 `@Scheduled`(매일 00:00 KST) + 기동 시 1회로 실행한다.
- 조회 집계(수불대장, 시점재고)는 `@Transactional(readOnly = true)` 하나 안에서 수행한다.

## 3. API 계약

### 3-1. 응답 봉투 (적용 2026-09-18, 사내 다른 프로젝트의 `ResultResponse` 방식 참고)

업무 API(`/api/sa/**`)는 성공이든 실패든 같은 모양으로 답한다(`common/web/ApiResponse`).

```jsonc
// 성공 (HTTP 200)
{ "success": true,  "message": null, "data": [ ... ] }                       // 목록
{ "success": true,  "message": null, "data": { "product_code": "000012", "material_cost": 936.9 } }   // 등록 결과
{ "success": true,  "message": null, "data": null }                          // 수정·삭제

// 실패 (HTTP 400/403/404/409 — 상태는 실제 오류에 맞춘다)
{ "success": false, "message": "제품명은 필수입니다", "data": null }
```

- 컨트롤러는 `return ApiResponse.ok(서비스 결과)`만 한다. 메서드마다 `try/catch`를 두지 않는다. 오류는 서비스가 `BizException`을 던지고 `ApiErrors`가 한곳에서 실패 봉투와 로그를 만든다.
- 참고 프로젝트는 실패에도 HTTP 200을 보내고 `bSuccessFlag`로만 가른다. 송연은 **HTTP 상태를 실제 오류에 맞추고** 봉투에는 사람이 읽을 문구를 `message`에 넣는다(메시지 ID 체계는 아직 없음).
- 로그인 API(`/api/login`·`/api/me`·`/api/logout`·`/api/csrf`)는 이미 화면과 연결돼 있어 **기존 모양(`{error}`) 그대로**다. 화면을 업무 API에 연결할 때 로그인도 봉투로 맞출지 정한다.
- 요청은 Map이 아니라 기능별 DTO로 받는다(어떤 값이 오는지 코드에 드러나고, 오타를 컴파일러가 잡는다).
- 페이징이 필요한 목록(수불대장, 판매현황 등)은 `XxxSearchDTO`에 `page/size`를 두고 `data`에 `{rows, total_count}`로 돌려준다.

### 3-2. 예외 처리

| 예외 | HTTP | 비고 |
|---|---|---|
| `BizException(ResponseCode, message)` | 코드에 따름(400/404/409) | 업무 규칙 위반 |
| `IllegalArgumentException`, Bean Validation 실패 | 400 | 입력 오류 |
| 인증 없음 / 권한 없음 / CSRF | 401 / 403 | SecurityConfig 핸들러가 봉투로 응답 |
| `DataAccessException`, 기타 | 500 | 일반화된 메시지, 스택은 로그에만 |

현재 `auth/ApiErrors`는 `IllegalStateException`을 모두 "로그인 정보를 조회할 수 없습니다"(503)로 바꾼다. **업무 API를 추가하기 전에 `common/exception/GlobalExceptionHandler`로 교체해야 한다.**

### 3-3. 경로 규칙

- **권장**: 새 경로 `/api/<업무>/<기능복수>` + REST 메서드(GET/POST/PUT/DELETE). 레거시는 수정도 POST이고, id를 본문에 넣는 upsert와 본문 있는 DELETE가 섞여 있어 그대로 옮기면 규칙이 흐려진다.
- 레거시와 비교 테스트를 하려면 [reference/api-inventory.md](reference/api-inventory.md)의 기존 경로 ↔ 새 경로 매핑을 추적표로 관리한다(04 문서의 화면별 "주요 API" 열).
- 인증 API(`/api/login`, `/api/me`, `/api/logout`, `/api/csrf`, `/api/health`)는 현재 경로를 유지한다.

### 3-4. 자료형 규칙

| 레거시 | 신규 |
|---|---|
| `REAL` 금액·단가 | `numeric` + `BigDecimal`. 매입 금액 반올림은 `RoundingMode.HALF_EVEN`(Python `round`와 동일) |
| `TEXT` 수량(`100kg`) | `numeric` 수량 + 단위 컬럼. 이관할 때만 레거시 파싱 규칙을 적용하고, 해석 실패 목록을 보고서로 남긴다 |
| `TEXT` 날짜 `YYYY-MM-DD` | `date` / `LocalDate` |
| `TEXT` 시각(ISO, 시간대 없음) | `timestamp` / `LocalDateTime`, 서버 시간대 `Asia/Seoul` 고정 |
| 정수 플래그 0/1 | `boolean` 또는 `char(1) 'Y'/'N'`(s-erp `use_at`) — 하나로 통일 |
| JSON 문자열(권한 목록, 라벨 layout·extra, BOM 스냅샷) | 권한 목록은 관계 테이블, 라벨 layout은 `jsonb` + 참조 테이블(사용 여부 검사용) |
| 이름 문자열 연결(거래처명, 창고명, 제품 표시명) | FK(id). 이관할 때 이름 매칭 실패 목록을 사람이 확정 |

## 4. 데이터베이스

### 4-1. 명명 (s-erp 규칙, tenant 제외)

| 규칙 | 예 |
|---|---|
| 테이블 `tb_<단수 snake>` | `tb_product`, `tb_material_receiving` |
| PK `<단수>_id bigint GENERATED BY DEFAULT AS IDENTITY` | `product_id` |
| 이름 `_nm`, 코드 `_code`, 설명 `_dc`, 사용 여부 `use_at`, 정렬 `sort_order` | `product_nm`, `product_code` |
| 감사 컬럼 `created_at / updated_at / created_by / updated_by` | 모든 업무 테이블 |
| INSERT는 `RETURNING <pk>` | |

레거시 테이블 ↔ 신규 테이블 매핑표는 기능을 옮길 때마다 `docs/database/` 아래에 누적한다.

### 4-2. 변경 기록 (s-erp 규칙)

```text
backend/DATABASE/YYYYMMDD/
├─ YYYYMMDD_NNN_create_<대상>.sql
├─ YYYYMMDD_NNN_create_<대상>_change.md     변경 이유·영향
└─ YYYYMMDD_NNN_create_<대상>_rollback.sql
```
Flyway 파일(`db/migration`)과 이 기록 중 **원본은 하나**로 정한다(s-erp는 `docs/database`에 미러를 둬서 폴더명이 어긋났다). 누적 스키마 문서는 `docs/database/db-schema.md`로 관리한다.

### 4-3. MyBatis 설정

- `mybatis.mapper-locations=classpath:mapper/**/*_postgresql.xml`, `map-underscore-to-camel-case=true`
- `jdbc-type-for-null`은 기본값(NULL)으로 둔다. s-erp의 `VARCHAR` 설정은 nullable bigint 바인딩 오류의 원인이었다.
- INSERT는 `<select resultType="long"> INSERT … RETURNING id`(s-erp 관례) 또는 `useGeneratedKeys` 중 하나로 통일한다.
- 동적 조건은 `<if test="x != null and x != ''">`. tenant가 없으므로 `<where>` 사용을 허용한다.

### 4-4. 이관 전 과도기

PostgreSQL DB를 생성하기 전까지(과도기):
- 두 시스템(Flask·Spring)이 **같은 SQLite에 동시에 쓰지 않게 한다.** Spring 은 SQLite 를 쓰지 않는다(로그인 계정도 2026-09-22 부터 PostgreSQL 에서 읽는다).
- 화면을 먼저 옮기고 조회 API만 SQLite에서 읽는 단계는 가능하다. 쓰기 기능은 DB를 확정하고 이관한 뒤 연다.
- 이관 절차: 운영 DB 확정 → 백업 사본 → 품질 조사(형식 오류·중복 코드·고아 참조·로트 잔량) → 기준정보 → 업무기록 → 이력·첨부 순 적재 → 행 수·재고·로트·금액·세액 대조 → `uploads/`, `chat_files/` 파일 이관 → Fernet 자료 재암호화.

## 5. 프런트엔드 목표 구조

### 5-1. 폴더 규칙 (s-erp `frontend/AGENTS.md` 기준)

```text
src/
├─ main.tsx · App.tsx
├─ routes/        AppRouter, AuthenticatedRoute, pageRegistry(메뉴ID → 페이지)
├─ pages/<업무>/<화면코드>/
│  ├─ <화면코드>Page.tsx           화면 조립 (예: SA0001Page.tsx)
│  ├─ components/                 이 화면 전용 UI. **파일·컴포넌트 이름은 화면코드로 시작한다**
│  │                              (예: SA0001ProductForm, SA0002PricingTable) — 2026-09-21 결정
│  │                              탭이 있는 화면은 기존 화면의 탭 차례대로 번호를 붙인다
│  │                              (CM0001Tab01 포장유형 … CM0001Tab06 거래처BOM, 창은 CM0001Tab05Modal).
│  │                              여러 탭이 같이 쓰는 부품은 번호 없이(CM0001NameListTab)
│  ├─ hooks/use<화면코드>.ts       재사용되거나 복잡할 때만 (예: useSA0001)
│  ├─ store/<화면코드>Store.ts     복합 입력 상태(useReducer)가 필요할 때만 — 송연 추가 규칙
│  ├─ utils/<화면코드>Util.ts      그 화면에서만 쓰는 계산 (예: SA0005Util)
│  ├─ services/<화면코드>Service.ts  API 호출 — 반드시 shared/services/apiClient 경유
│  └─ types/<화면코드>.types.ts     Row(엄격) / SavePayload(백엔드 DTO와 같은 필드명)
│  ※ components/ 를 뺀 나머지는 **화면코드 + 역할**만 쓴다(2026-09-21 결정). 백엔드가 화면마다
│    Controller·Service·DAO·DTO 를 하나씩 두는 것과 같은 모양이다 — 역할마다 파일 하나,
│    둘째 훅·계산이 생기면 이름을 늘리지 말고 그 파일 안에 함께 둔다.
│    내보내는 함수·타입 이름까지 바꾸지는 않는다 — 도메인 이름(computeQuote·allocationStatus 등)이
│    뜻을 더 잘 알려준다. 화면코드가 없는 화면(로그인·대시보드)은 그대로 둔다.
├─ shared/        여러 업무에서 실제로 재사용할 때만 승격
│  ├─ components/ Dialog·Modal, layout/MainLayout, PageHeader, PageSearchArea, PageMessageArea, DataGrid …
│  ├─ hooks/      useSession, usePermission, useDialog …
│  ├─ services/   apiClient.ts, authService.ts
│  ├─ config/     navigation.ts
│  ├─ utils/      format(수량·금액), date(로컬 날짜), excel
│  └─ types/
└─ styles/        CSS 는 이 폴더에만 둔다(화면·부품 폴더에 .css 를 만들지 않는다) — 2026-09-18 결정
   ├─ global.css      기본(글꼴·box-sizing)
   ├─ auth.css        로그인
   ├─ layout.css      테마 색(밝게·어둡게)·사이드바·탭
   ├─ common.css      여러 화면이 같이 쓰는 모양: btn-primary/btn-ghost, row-btn(accent·danger), toolbar/toolbar-group/search(narrow),
   │                  table-panel(flush·clip)/data-table(hoverable), tag(ok·low), section-title, modal-title/-hint,
   │                  form-grid/form-pair/form-row, label-hint, dropzone, computed-hint, save-msg(error), 줄 상태 prod-confirmed/-unconfirmed
   ├─ components.css  shared/components 부품(Modal·Dialog·AppAlert·Picker·BomRowsTable·AutosuggestInput·LabelForm)
   ├─ dashboard.css   대시보드
   └─ <업무코드>.css   그 업무 화면에만 있는 모양, 화면코드별 구역(예: sa.css 의 SA0001~SA0006)
```

- CSS 는 `main.tsx` 에서 위 순서(공용 → 부품 → 화면)로 한 번에 부른다. 새 화면은 공용 클래스를 먼저 쓰고, 그 화면에만 있는 것만 `<업무코드>.css` 에 `.<공용클래스>.<화면클래스>` 모양으로 덧붙인다.

- 이름: 페이지·컴포넌트는 PascalCase(`SA0002Page`), 서비스는 camelCase 파일(`pricing.service.ts`)과 함수 `fetchXxx / createXxx / updateXxx / deleteXxx`.
- 반응형: 375 / 768 / 1280px에서 가로 스크롤 없이 동작해야 한다(s-erp 규칙, 현재 360px 테스트 있음).
- 한 기능 전용 코드는 shared에 두지 않는다. 다른 페이지 내부(store·components)를 직접 import하지 않는다.

### 5-2. 화면 연결

- 현재 방식 유지: `navigation.ts`(분류·메뉴·표시 권한) + `pageRegistry.tsx`(메뉴ID → 컴포넌트) + `MainLayout`의 탭 작업공간.
- s-erp는 DB 메뉴 → URL → `DashboardContent`의 if 사다리 방식이다. 송연은 레거시 탭 UX를 재현하므로 따르지 않는다. 다만 **새로고침하면 열린 탭이 사라지므로**, 활성 탭을 URL(`/?tab=SA0002` 또는 `/sa/SA0002`)에 동기화할지 결정이 필요하다(미정).
- 운영 배포 시 SPA fallback(모든 경로 → `index.html`)과 `/api` 리버스 프록시가 필요하다.

### 5-3. apiClient (신설, `shared/services/apiClient.ts`)

```ts
export const apiGet    = <T>(path: string) => request<T>(path);
export const apiPost   = <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const apiPut    = <T>(path: string, data?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) });
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });
```
- s-erp와 같은 공개 함수 이름을 쓴다 → s-erp 기능 서비스 패턴을 그대로 따를 수 있다.
- `credentials: 'same-origin'`, 15초 타임아웃(현재 authService 유지), 상대 경로 `/api`.
- POST/PUT/DELETE에 CSRF 헤더. 토큰은 캐시하고 403(CSRF)이면 한 번 다시 받아 재시도, 로그인·로그아웃 후 캐시 무효화. (현재는 변경 요청마다 `/api/csrf`를 먼저 호출)
- JSON이 아니거나 `!ok`이거나 `resultCode !== 200`이면 `ApiError(status, resultCode, resultMessage, result)`를 던지고, 성공하면 `result`만 반환한다.
- 401이면 `/login`으로 이동하고, 403이면 권한 안내, 429면 `lockedSeconds`를 사용한다.
- `authService.ts`는 이 위에서 login·me·logout만 담당하게 줄인다.

### 5-4. 공용 부품 도입 목록

| 우선 | 부품 | 출처 |
|---|---|---|
| 필수 | `apiClient`, `useDialog`(alert/confirm/prompt Promise), `toast` | 레거시 01-core, s-erp NotificationContext |
| 필수 | `PageHeader`(제목·설명·권한별 액션 버튼), `PageSearchArea`, `PageMessageArea` | s-erp |
| 필수 | `UnsavedChangesConfirmDialog` (탭 닫기·전환 시) | s-erp — 탭 UX에 특히 필요 |
| 필수 | `Modal`(ESC, 스택, 최대화) — 현재 `Dialog` 확장 | 레거시 01:517-628 |
| 필수 | `DataGrid`(정렬·열 크기 저장·그룹 병합·행 펼치기·엑셀) 또는 F1-Grid | 레거시 01:204-430 / s-erp |
| 필수 | `Autocomplete`, `ClientSelect(strict)`, `MultiPicker` | 레거시 01:78, 726-878 |
| 필수 | `format`(수량 소수 2자리, 금액 소수 4자리), 로컬 날짜 유틸, 엑셀 다운로드 | 레거시 01, 02:685 |
| 후속 | BOM 편집기 공용화, BOM 엑셀 파서, 인쇄 인프라 | 레거시 04 |
| 완료 | 라벨 렌더러(`shared/utils/labelHtml.ts`)·라벨 창(`shared/components/LabelForm`, 지금은 인쇄 전용)·바코드(`jsbarcode` 3.12.3, 기존과 같은 판) | 레거시 07·15 |

### 5-5. UI 라이브러리 (미정)

| 선택지 | 장점 | 단점 |
|---|---|---|
| 순수 CSS 유지 (현재) | 레거시 디자인 그대로, 의존성 적음 | 편집 그리드·검증·엑셀을 직접 구현 |
| MUI 9 + F1-Grid (s-erp) | 편집 그리드(변경 추적·검증·병합·가상화·엑셀)를 바로 사용, s-erp와 공통 부품 공유 | 약 9,300줄 복사, TS 7 빌드 검증과 `F1-GRID.md` 동반 필요, 레거시 모양과 달라짐 |

발주·입고·수불대장·BOM·재고조정처럼 **표에서 편집하는 화면이 많으므로** F1-Grid 도입 검토를 권장한다. 결정 전에는 새 화면에 라이브러리 종속 코드를 넣지 않는다.

## 6. 권한 설계

1. **서버 권한 검사는 필수다.** 현재 신규 서버는 `/api/me`만 있고, 메뉴 표시는 프런트에서만 거른다. 업무 API를 추가할 때마다 서버에서 검사한다(s-erp도 이 부분이 약하다).
2. 1단계 — 레거시 권한 키 호환:
   - `SessionUser.permissions`(레거시 키 54개)를 그대로 쓴다.
   - 컨트롤러 클래스에 `@RequirePermission("product")`를 붙이면 `PermissionInterceptor`가 메서드 실행 전에 **any-of + 관리자 통과**로 검사한다(적용 2026-09-18). 로그인만 필요한 메서드는 `@LoginOnly`. 컨트롤러는 세션(`SessionUser`)을 받지 않는다 — 로그인한 사람 정보가 정말 필요한 메서드만 받는다. 레거시 `permissions.py` RULES를 화면별로 옮긴다.
   - SecurityConfig는 기본 `denyAll`을 유지하고(이미 그렇다), HEAD도 GET과 같은 권한으로 본다.
   - 회계 kind별 검사, 문서·레시피 개체 단위 검사는 서비스 계층에서 한다.
   - `/api/me`에 `sharedRecipeCount`, `sharedDocumentCount`를 추가하고 별칭 규칙을 서버와 프런트가 공유한다(서버가 `GET /api/menus/my`로 계산된 메뉴를 내려주는 방식 권장).
3. 2단계 — PostgreSQL 이관 후: s-erp 모델을 단순화해 `tb_module`(=분류 11개), `tb_menu`, `tb_permission`(READ·CREATE·UPDATE·DELETE·EXCEL)을 쓰고, 레거시가 **사용자별 권한**이므로 `tb_user_menu_permission`(또는 새 역할 정의)을 둔다. 메뉴 seed는 s-erp skill-reg-menu 방식(멱등 INSERT + rollback)을 쓴다.
4. 권한·부서 변경을 즉시 반영하려면 요청마다 권한을 다시 조회하거나 변경 시 세션을 무효화한다(레거시는 다음 로그인 때 반영됨). 퇴사자(`resign_date`) 로그인을 차단한다.

## 7. 테스트·문서·작업 규칙

| 항목 | 기준 |
|---|---|
| 백엔드 테스트 | 계산 규칙 = 단위 테스트, DB·트랜잭션 = 실제 대상 DB 통합 테스트. 레거시 테스트 49개의 기대 결과를 옮긴다 |
| 프런트 테스트 | **Vitest 추가**(권한 필터 `visibleCategories`, reducer, apiClient, 포맷 유틸) + Playwright E2E 유지 |
| 작업 문서 (s-erp 방식) | `docs/directions/YYYYMMDD/` 작업지시서 → `plan/` 계획 → `spec/` 사양 → 구현 → `result/YYYYMMDD/<slug>/` 결과·스크린샷. 스크린샷 경로에 한글 금지 |
| 규칙 문서 | 송연용 `AGENTS.md` 3종(루트·backend·frontend) 작성 — s-erp 규칙을 송연 스택으로 번역(세션 인증, 탭 UX, 레거시 재현 원칙 포함) |
| 자동화 | 첫 업무 기능(제품+BOM)을 정본으로 만든 뒤 송연판 `skill-impl / skill-orm / skill-view / skill-reg-menu` 작성 |
| API 문서 | `springdoc-openapi-starter-webmvc-ui` 2.x 도입 검토 |
