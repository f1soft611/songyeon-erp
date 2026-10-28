# 20261002_001 송연 환경설정 메뉴 시드 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 시드 (스키마 변경 없음) |
| 적용 | 2026-10-02 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261002_001_rollback.sql` |

## 내용

S_ERP 환경설정(SETTINGS) 모듈을 송연 DB에 같은 구성으로 등록한다. 기준은 S_ERP 운영 DB(s-erp_central)를 2026-10-02에 읽기 전용으로 조회한 결과다.

| 표 | 넣은 행 |
|---|---|
| tb_tenant | `SONGYEON` / 송연 (메뉴·권한용 내부 테넌트. 로그인 화면에서 입력받지 않음) |
| tb_permission | READ·CREATE·UPDATE·DELETE·EXCEL·BOARD_VIEW·BOARD_WRITE·BOARD_DELETE·BOARD_UPLOAD (9) |
| tb_role | PLATFORM_ADMIN·ADMIN·ROLE_INFO_MANAGER·DEFAULT_USER (4) |
| tb_module | SETTINGS 환경설정 `/settings` (정렬 99) |
| tb_menu | ST_SYSTEM 시스템 관리 + 하위 ST_MODULE·ST_ROLES·ST_MENUS·ST_F1_GRID_TEST(사용안함)·ST_WAREHOUSE·ST_CUSTOMER (7) |
| tb_menu_permission | 하위 6개 메뉴 × READ·CREATE·UPDATE·DELETE·EXCEL (30) |
| tb_role_menu_permission | PLATFORM_ADMIN: 하위 6개 × READ·CREATE·UPDATE·EXCEL / ADMIN: ST_ROLES·ST_MENUS·ST_F1_GRID_TEST × EXCEL (27) |

## 로그인과의 관계 (2026-10-02 수정)

- 로그인 계정은 송연 `employees`를 그대로 쓴다. `tb_login_account`·`tb_user`에는 행을 넣지 않았다.
- 송연에는 역할·권한 개념이 없어 로그인 토큰에 역할을 넣지 않는다. 따라서 여기서 넣은 역할 4개와 역할별 메뉴 권한(27행)은 메뉴 표시·기능 허용에 쓰이지 않는다. 권한관리 화면은 S_ERP 그대로 두기로 해서 행은 남겨두었다.
- 테넌트 `SONGYEON`은 메뉴 표가 tenant_id 를 요구해서 둔 내부 값이며 로그인 화면에서 입력받지 않는다.

## 영향 범위

- 송연 변환본(`kr.co.songyeon.mes`)은 `tb_*` 표를 쓰지 않으므로 영향 없음.
- 적용 전 `tb_*` 표는 모두 비어 있었다.

## 참고

- `ST_CUSTOMER`(고객정보)는 S_ERP DB에 있는 메뉴지만 S_ERP 코드에 화면이 없다. 같은 구성을 위해 넣었고, 누르면 "준비 중" 화면이 나온다.
