# DB 스키마 상세 정리

### 1-1. tb_tenant

| 컬럼                         | 타입      | 설명                                     |
| ---------------------------- | --------- | ---------------------------------------- |
| tenant_id                    | bigint    | 테넌트 PK                                |
| tenant_code                  | varchar   | 테넌트 식별 코드 (예: TENANT_2133453253) |
| tenant_nm                    | varchar   | 테넌트명                                 |
| admin_email                  | varchar   | 관리자 이메일                            |
| admin_name                   | varchar   | 관리자 이름                              |
| business_registration_number | varchar   | 사업자등록번호                           |
| corporate_number             | varchar   | 법인번호                                 |
| business_type                | varchar   | 업종                                     |
| business_category            | varchar   | 업태                                     |
| registration_date            | date      | 등록일                                   |
| logo_image                   | text      | 로고 이미지                              |
| onboarding_status            | varchar   | 온보딩 상태                              |
| use_at                       | char      | 사용 여부 (Y/N)                          |
| created_at                   | timestamp | 생성 일시                                |
| updated_at                   | timestamp | 수정 일시                                |
| created_by                   | bigint    | 생성자                                   |

역할:

- 테넌트 기본 정보 관리
- 플랫폼 다중 테넌트 식별의 기준

### 2-4. tb_login_account

| 컬럼                | 타입      | 설명               |
| ------------------- | --------- | ------------------ |
| login_id            | bigint    | 로그인 계정 PK     |
| tenant_id           | bigint    | 소속 테넌트        |
| login_code          | varchar   | 로그인 코드/아이디 |
| password_hash       | varchar   | 암호화 비밀번호    |
| profile_image       | text      | 프로필 이미지      |
| stamp_image         | text      | 도장 이미지        |
| login_attempt_count | int       | 실패 횟수          |
| locked_at           | timestamp | 잠금 시점          |
| password_changed_at | timestamp | 비밀번호 변경 시점 |
| use_at              | char      | 사용 여부          |
| created_at          | timestamp | 생성 일시          |
| updated_at          | timestamp | 수정 일시          |

역할:

- 실제 로그인 인증의 기준
- 사용자 식별과 비밀번호 검증 수행

### 2-5. tb_user

| 컬럼          | 타입      | 설명                  |
| ------------- | --------- | --------------------- |
| user_id       | bigint    | 사용자 PK             |
| tenant_id     | bigint    | 소속 테넌트           |
| login_id      | bigint    | 로그인 계정 FK        |
| user_nm       | varchar   | 사용자명              |
| email_addr    | varchar   | 이메일                |
| department_id | bigint    | 부서 FK               |
| level_id      | bigint    | 직급 공통코드 항목 FK |
| mobile_no     | varchar   | 휴대폰 번호           |
| use_at        | char      | 사용 여부             |
| created_at    | timestamp | 생성 일시             |
| updated_at    | timestamp | 수정 일시             |

역할:

- 사용자 프로필정보
- 로그인 계정과 사용자 실명/부서/직급 연결
- `level_id`는 `tb_common_code_item.common_code_item_id`를 참조하며 `LEVEL` 그룹 항목만 사용

### 2-6. tb_department

| 컬럼                 | 타입      | 설명                   |
| -------------------- | --------- | ---------------------- |
| department_id        | bigint    | 부서 PK                |
| tenant_id            | bigint    | 소속 테넌트            |
| department_nm        | varchar   | 부서명                 |
| parent_department_id | bigint    | 상위 부서 FK(자기참조) |
| sort_order           | int       | 정렬 순서              |
| use_at               | char      | 사용 여부              |
| created_at           | timestamp | 생성 일시              |
| updated_at           | timestamp | 수정 일시              |

역할:

- 테넌트별 부서 조직도 관리
- `tb_user.department_id`가 참조하는 대상

### 2-6-1. tb_common_code_item 직급 참조

- `tb_user.level_id`는 `tb_common_code_item.common_code_item_id`를 참조한다.
- 직급 항목은 `tb_common_code_group.group_code = 'LEVEL'`인 그룹에 속한 활성 항목을 사용한다.

### 2-7. tb_role

| 컬럼           | 타입      | 설명                                                  |
| -------------- | --------- | ----------------------------------------------------- |
| role_id        | bigint    | 역할 PK                                               |
| tenant_id      | bigint    | 소속 테넌트                                           |
| role_code      | varchar   | 역할 코드(PLATFORM_ADMIN/TENANT_ADMIN/TENANT_USER 등) |
| role_nm        | varchar   | 역할명                                                |
| role_dc        | varchar   | 역할 설명                                             |
| use_at         | char      | 사용 여부                                             |
| is_system_role | char      | 시스템 기본 역할 여부                                 |
| created_at     | timestamp | 생성 일시                                             |
| updated_at     | timestamp | 수정 일시                                             |

역할:

- 테넌트별 권한 역할 정의
- 로그인 시 `tb_login_account_role`을 통해 계정에 부여된 역할로 JWT의 `roleCode`/`groupNm`을 결정

### 2-8. tb_login_account_role

| 컬럼                  | 타입      | 설명           |
| --------------------- | --------- | -------------- |
| login_account_role_id | bigint    | 매핑 PK        |
| login_id              | bigint    | 로그인 계정 FK |
| role_id               | bigint    | 역할 FK        |
| created_at            | timestamp | 생성 일시      |

역할:

- 로그인 계정과 역할의 N:M 매핑
- 로그인 조회 시 계정에 부여된 역할(우선순위: PLATFORM_ADMIN > TENANT_ADMIN > TENANT_USER)을 결정하는 데 사용

### 2-9. tb_module

| 컬럼        | 타입      | 설명                      |
| ----------- | --------- | ------------------------- |
| module_id   | bigint    | 모듈 PK                   |
| tenant_id   | bigint    | 소속 테넌트               |
| module_code | varchar   | 모듈 코드(테넌트 내 유일) |
| module_nm   | varchar   | 모듈명                    |
| icon_nm     | varchar   | 아이콘명                  |
| module_url  | varchar   | 모듈 루트 경로            |
| sort_order  | int       | 정렬 순서                 |
| use_at      | char      | 사용 여부                 |
| created_at  | timestamp | 생성 일시                 |
| updated_at  | timestamp | 수정 일시                 |

역할:

- 대시보드 좌측 최상위 모듈(그룹웨어/환경설정 등) 정의
- 테넌트별로 별도 구성 가능

### 2-10. tb_menu

| 컬럼           | 타입      | 설명                               |
| -------------- | --------- | ---------------------------------- |
| menu_id        | bigint    | 메뉴 PK                            |
| tenant_id      | bigint    | 소속 테넌트                        |
| module_id      | bigint    | 소속 모듈 FK                       |
| parent_menu_id | bigint    | 상위 메뉴 FK(자기참조)             |
| menu_code      | varchar   | 메뉴 코드(테넌트 내 유일)          |
| menu_nm        | varchar   | 메뉴명                             |
| menu_dc        | varchar   | 메뉴 설명(페이지 헤더/설명 표시용) |
| menu_url       | varchar   | 라우팅 경로                        |
| icon_nm        | varchar   | 아이콘명                           |
| sort_order     | int       | 정렬 순서                          |
| use_at         | char      | 사용 여부                          |
| created_at     | timestamp | 생성 일시                          |
| updated_at     | timestamp | 수정 일시                          |

역할:

- 모듈 하위 메뉴 트리 구성(다단계, `parent_menu_id`로 자기참조)
- 메뉴명, 설명, 경로를 함께 관리해 실제 페이지 제목/설명과 대시보드 메뉴를 일관되게 표시
- `/api/v1/menus/my` 응답의 원천 데이터, `role_code` 기준 기본 권한 정책과 결합해 대시보드 좌측 메뉴 생성

### 2-11. tb_permission

| 컬럼            | 타입      | 설명                       |
| --------------- | --------- | -------------------------- |
| permission_id   | bigint    | 버튼/기능 권한 PK          |
| permission_code | varchar   | 전역 고유 권한 코드        |
| permission_nm   | varchar   | 권한 표시명                |
| sort_order      | int       | 메뉴 관리 화면의 표시 순서 |
| use_at          | char      | 활성 여부(Y/N)             |
| created_at      | timestamp | 생성 일시                  |
| updated_at      | timestamp | 수정 일시                  |

역할:

- 메뉴가 제공하는 버튼/기능 권한 마스터 관리
- 초기 권한: `READ`, `CREATE`, `UPDATE`, `DELETE`, `EXCEL`
- 권한 코드를 추가하면 메뉴 관리 화면이 활성 권한을 동적 열로 표시

### 2-12. tb_menu_permission

| 컬럼          | 타입      | 설명                                 |
| ------------- | --------- | ------------------------------------ |
| menu_id       | bigint    | 메뉴 FK, `tb_menu` 삭제 시 함께 삭제 |
| permission_id | bigint    | 버튼/기능 권한 FK                    |
| created_at    | timestamp | 생성 일시                            |
| updated_at    | timestamp | 수정 일시                            |

제약:

- 복합 PK: `(menu_id, permission_id)`
- 메뉴별 허용 가능한 기본 버튼/기능 권한만 저장하며, 역할별 선택 권한인 `tb_role_menu_permission`과 분리

역할:

- 리프 메뉴가 지원할 수 있는 권한 코드를 관리
- 역할 관리 화면에서 선택 가능한 기본 권한의 기준 제공

### 2-13. tb_role_menu_permission

| 컬럼          | 타입      | 설명              |
| ------------- | --------- | ----------------- |
| role_id       | bigint    | 역할 FK           |
| menu_id       | bigint    | 메뉴 FK           |
| permission_id | bigint    | 버튼/기능 권한 FK |
| created_at    | timestamp | 생성 일시         |
| updated_at    | timestamp | 수정 일시         |

제약:

- 복합 PK: `(role_id, menu_id, permission_id)`
- `tb_role(role_id)`, `tb_menu(menu_id)`, `tb_permission(permission_id)`를 모두 참조
- 역할별 실제 메뉴 활성화 여부 및 버튼 권한을 저장하는 실사용 매핑 테이블

역할:

- 선택된 역할(Role) 관점에서 어떤 메뉴를 노출할지와 어떤 버튼 권한을 활성화할지 저장
- 백엔드 `GET /api/v1/system/menus?moduleId={moduleId}&roleId={roleId}` 및 `PUT /api/v1/system/roles/{roleId}/menu-permissions`의 최종 저장소
- 대시보드 좌측 메뉴와 페이지 헤더 액션 버튼의 권한 계산이 이 테이블을 기준으로 동기화된다

### 2-14. tb_common_code_group

| 컬럼                 | 타입      | 설명                   |
| -------------------- | --------- | ---------------------- |
| common_code_group_id | bigint    | 공통코드 그룹 PK       |
| tenant_id            | bigint    | 소속 테넌트            |
| group_code           | varchar   | 그룹 코드              |
| group_nm             | varchar   | 그룹명                 |
| group_dc             | varchar   | 그룹 설명              |
| parent_group_id      | bigint    | 상위 그룹 FK(자기참조) |
| sort_order           | int       | 정렬 순서              |
| use_at               | char      | 사용 여부              |
| created_at           | timestamp | 생성 일시              |
| updated_at           | timestamp | 수정 일시              |
| created_by           | bigint    | 생성자                 |
| updated_by           | bigint    | 수정자                 |

역할:

- 공통코드 그룹 계층을 저장하는 기준 테이블
- 부모-자식 계층을 자기참조로 관리
- 공통코드 관리 화면의 그룹 트리 원천 데이터

### 2-15. tb_common_code_item

| 컬럼                | 타입      | 설명                       |
| ------------------- | --------- | -------------------------- |
| common_code_item_id | bigint    | 공통코드 상세 PK           |
| tenant_id           | bigint    | 소속 테넌트                |
| group_id            | bigint    | 그룹 FK                    |
| item_code           | varchar   | 상세코드                   |
| item_nm             | varchar   | 상세코드명                 |
| item_dc             | varchar   | 상세코드 설명              |
| parent_item_id      | bigint    | 상위 상세코드 FK(자기참조) |
| sort_order          | int       | 정렬 순서                  |
| use_at              | char      | 사용 여부                  |
| created_at          | timestamp | 생성 일시                  |
| updated_at          | timestamp | 수정 일시                  |
| created_by          | bigint    | 생성자                     |
| updated_by          | bigint    | 수정자                     |

역할:

- 그룹 하위 상세코드 데이터를 저장
- 자식 그룹의 상위코드 선택을 제한하는 기준 테이블
- F1Grid 상세 목록과 상위코드 선택 목록의 백엔드 원천 데이터

### 2-15-1. tb_id_sequence

| 컬럼              | 타입      | 설명                                                    |
| ----------------- | --------- | ------------------------------------------------------- |
| generator_key     | varchar   | 발번 종류 (예: `COMMON_CODE_ITEM_CODE`), PK              |
| scope_key_1       | varchar   | 범위 키 1 (공통코드 상세는 그룹 ID), PK                  |
| scope_key_2       | varchar   | 범위 키 2 (기본 `''`), PK                                |
| last_issued_value | bigint    | 마지막으로 내준 번호 (0 이상)                            |
| created_at        | timestamp | 생성 일시                                               |
| updated_at        | timestamp | 수정 일시                                               |

역할:

- 조건별 숫자 발번 카운터(S_ERP 와 같은 표). 공통코드 상세코드를 비워 저장하면 그룹별 다음 번호를 여기서 받는다.
- `tenant_id` 는 두지 않는다. 그룹 ID 를 범위 키로 쓰고, 공통코드 표 · API 의 테넌트 필터는 그대로다.

### 2-15-2. tb_box_type

| 컬럼              | 타입          | 설명                                                       |
| ----------------- | ------------- | ---------------------------------------------------------- |
| box_type_id       | bigserial     | 일련번호 PK                                                |
| factory_code      | varchar(10)   | 사업장코드 (송연은 `F001` 고정)                            |
| plant_code        | varchar(10)   | 사업부코드 (송연은 `P001` 고정)                            |
| box_type_cd       | varchar(20)   | 포장유형코드                                               |
| box_type_nm       | varchar(50)   | 포장유형명                                                 |
| pack_qty          | numeric(15,3) | 포장단위 수량 (> 0)                                        |
| pack_unit         | varchar(10)   | 포장단위 (KG/G/EA 등)                                      |
| fixed_margin_rate | numeric(7,3)  | 고정마진율(%) 0~100, 기본 0                                |
| loss_rate         | numeric(7,3)  | 로스율(%) 0~100, 기본 0                                    |
| labor_cost        | numeric(15,2) | 인건비(원) 0 이상                                          |
| packing_cost      | numeric(15,2) | 포장비(원) 0 이상                                          |
| logistics_cost    | numeric(15,2) | 물류비(원) 0 이상                                          |
| margin_amt        | numeric(15,2) | 마진(원) 0 이상                                            |
| total_cost        | numeric(15,2) | 부대비용 합계 = 인건비+포장비+물류비 (생성 칸)             |
| apply_start_dt    | date          | 적용시작일자 (기본 오늘, 송연은 관리하지 않음)             |
| apply_end_dt      | date          | 적용종료일자 (기본 9999-12-31, 송연은 관리하지 않음)       |
| sort_seq          | int           | 정렬순서                                                   |
| remark            | varchar(300)  | 비고                                                       |
| use_yn            | char(1)       | 사용여부 Y/N (삭제는 N)                                    |
| reg_dt · reg_user_id · upd_dt · upd_user_id | | 감사 칸. 등록자 · 수정자는 사번(`employees.id`), upd_dt 는 트리거 `tg_box_type_upd` 가 채움 |

역할:

- 공통관리 > 기초정보 > 포장유형(화면ID BSBoxTypeView) 원천 표. 단가관리 · 견적 · 제품등록의 포장유형 목록도 여기서 읽는다.
- 유니크 `(factory_code, plant_code, box_type_cd, apply_start_dt)`. 수정은 `box_type_id` 로 그 줄을 덮어쓴다.
- 옛 `product_types` 를 대신한다(옛 표는 지우지 않았다).

### 2-15-3. tb_warehouse

| 컬럼               | 타입          | 설명                                                                 |
| ------------------ | ------------- | -------------------------------------------------------------------- |
| warehouse_id       | bigserial     | 일련번호 PK                                                          |
| factory_code       | varchar(10)   | 사업장코드 (송연은 `F001` 고정)                                      |
| plant_code         | varchar(10)   | 사업부코드 (송연은 `P001` 고정)                                      |
| warehouse_cd       | varchar(20)   | 창고코드, 표 전체에서 하나(`uq_warehouse`). 새 줄은 서버가 `WH001` … |
| warehouse_nm       | varchar(100)  | 창고명. 원재료 · 재고 · 입고 표가 이 이름으로 창고를 가리킨다         |
| upper_warehouse_cd | varchar(20)   | 상위창고코드 (자기 참조 `fk_wh_upper`)                               |
| warehouse_type     | varchar(20)   | 창고유형 원자재/부자재/재공/완제품/반품/보류/폐기/외부               |
| warehouse_div      | varchar(10)   | 창고구분 자가/외부 (기본 자가, 외부는 partner_cd 필수)               |
| temp_zone_type     | varchar(10)   | 온도대 상온/냉장/냉동/해동/가온 (기본 상온, 냉장 · 냉동은 온도 필수) |
| temp_min · temp_max · humidity_min · humidity_max | numeric(6,2) | 관리 온도 · 습도 범위 (상한 ≥ 하한)        |
| temp_monitor_yn · stock_avail_yn · hold_yn · minus_stock_yn · location_use_yn · lot_manage_yn | char(1) | Y/N 표시 (보류 Y 와 가용 Y 는 함께 못 둠) |
| ccp_cd             | varchar(20)   | 연계 CCP코드                                                         |
| default_yn         | char(1)       | 기본창고 Y/N. 표(`ux_wh_default`)는 유형마다 한 곳까지 허용, 송연은 전체에서 한 곳(서비스가 지킴) = 입고창고 |
| partner_cd · manager_nm · tel_no · zip_cd · addr1 · addr2 · area_size · barcode_prefix | | 외부창고 거래처 · 담당자 · 주소 · 면적 · 바코드 접두어 |
| sort_seq           | int           | 정렬순서 (기본 0, 새 줄은 최대+10)                                   |
| remark             | varchar(500)  | 비고 (화면의 '설명')                                                 |
| use_yn             | char(1)       | 사용여부 Y/N (삭제는 N)                                              |
| reg_dt · reg_user_id · upd_dt · upd_user_id | | 감사 칸. 등록자 · 수정자는 사번(`employees.id`), 트리거 없음(서비스가 upd_dt 를 넣음) |

역할:

- 공통관리 > 기초정보 > 창고등록(화면ID BSWarehouseView) 원천 표. 옛 송연 `warehouses` 를 대신한다(옛 표 · 자료는 남겼고 옮기지 않음).
- 입고창고 = 사용 중인 기본창고(전체 한 곳). 입고 · 재고조정 · 재고 현황이 창고 목록과 입고창고를 여기서 읽는다.
- 창고코드는 화면에 두지 않는다(서버가 매김).
- `tb_warehouse_location` 이 참조한다. 옛 S_ERP 창고관리 코드(`system/warehouses`)는 옛 칸을 읽어 이 표와 맞지 않는다(메뉴 없음).

### 2-16. tb_common_file

| 컬럼             | 타입      | 설명                                                       |
| ---------------- | --------- | ---------------------------------------------------------- |
| file_id          | bigint    | 공통 첨부 파일 PK                                          |
| tenant_id        | bigint    | 소속 테넌트                                                |
| owner_type       | varchar   | 소유자 타입 (`NOTICE`, `BOARD`, `APPROVAL`, `FEED`)        |
| owner_id         | bigint    | 소유 객체 PK                                               |
| file_name        | varchar   | 원본 파일명                                                |
| file_path        | varchar   | 파일 경로/URL                                              |
| object_key       | varchar   | MinIO object key                                           |
| bucket_name      | varchar   | MinIO 버킷명                                               |
| storage_provider | varchar   | 저장소 타입 (`minio`)                                      |
| file_size        | bigint    | 파일 크기                                                  |
| mime_type        | varchar   | MIME 타입                                                  |
| checksum_sha256  | varchar   | 파일 SHA-256 해시                                          |
| content_type     | varchar   | 파일 content type                                          |
| file_usage_type  | varchar   | 파일 용도 (`ATTACHMENT` 일반 첨부, `EMBEDDED` 본문 이미지) |
| uploaded_by      | varchar   | 업로더 ID                                                  |
| deleted_yn       | char      | 삭제 여부 (`Y`/`N`)                                        |
| created_at       | timestamp | 생성 일시                                                  |
| updated_at       | timestamp | 수정 일시                                                  |

역할:

- 공통 첨부 파일 메타데이터를 저장하는 범용 테이블
- notice, board, approval, feed 등 여러 도메인이 동일한 첨부 API를 공유하도록 설계
- 실제 바이너리는 MinIO에 저장하고 DB에는 경로와 메타만 보관

### 2-17. tb_common_comment

| 컬럼                  | 타입      | 설명                                        |
| --------------------- | --------- | ------------------------------------------- |
| comment_id            | bigint    | 공통 댓글 PK                                |
| tenant_id             | bigint    | 소속 테넌트                                 |
| owner_type            | varchar   | 소유자 타입 (`NOTICE`, `BOARD`, `APPROVAL`) |
| owner_id              | bigint    | 소유 객체 PK                                |
| parent_comment_id     | bigint    | 상위 댓글 FK(대댓글)                        |
| content               | text      | 댓글 내용                                   |
| writer_id             | varchar   | 작성자 ID                                   |
| writer_name           | varchar   | 작성자 이름                                 |
| deleted_yn            | char      | 삭제 여부 (`Y`/`N`)                         |
| last_modified_by      | varchar   | 마지막 행위자 ID                            |
| last_modified_by_name | varchar   | 마지막 행위자 이름                          |
| created_at            | timestamp | 생성 일시                                   |
| updated_at            | timestamp | 수정 일시                                   |
| comment_type          | varchar   | 댓글 구분 (`USER` 기본, 결재 이벤트는 `SYSTEM`) |
| event_type            | varchar   | 시스템 댓글 이벤트 (승인 · 반려 · 상신 등, USER 는 NULL) |

- 제약: `uq_tb_common_comment_tenant_comment UNIQUE (tenant_id, comment_id)`, `chk_tb_common_comment_event_type`(2026-10-22 `20261022_004`)

### 2-17-1. tb_common_comment_like

| 컬럼            | 타입      | 설명                                  |
| --------------- | --------- | ------------------------------------- |
| comment_like_id | bigserial | PK                                    |
| tenant_id       | bigint    | 소속 테넌트 FK (CASCADE)              |
| comment_id      | bigint    | 댓글 FK `(tenant_id, comment_id)` (CASCADE) |
| user_id         | varchar   | 좋아요 누른 사용자 ID                 |
| created_at      | timestamp | 생성 일시                             |

- 고유: `(tenant_id, comment_id, user_id)` — 사용자 한 명당 댓글마다 좋아요 하나

역할:

- 댓글/답글을 범용적으로 보관하는 공통 테이블
- 도메인별 댓글이 서로 다른 API에 묶이지 않도록 `owner_type + owner_id` 기준으로 조회
- DB를 통해 공통 댓글 API의 목록/등록/수정/삭제를 영속화한다

### 2-18. tb_board_type

| 컬럼             | 타입      | 설명                                            |
| ---------------- | --------- | ----------------------------------------------- |
| board_type_code  | varchar   | 게시판 유형 코드 (`NOTICE`, `BOARD`, `ARCHIVE`) |
| board_name       | varchar   | 게시판 이름                                     |
| menu_id          | bigint    | 커뮤니티 메뉴 FK                                |
| board_kind       | varchar   | 게시판 종류 (`notice`, `board`, `archive`)      |
| read_auth_level  | varchar   | 읽기 권한 레벨                                  |
| write_auth_level | varchar   | 쓰기 권한 레벨                                  |
| file_upload_yn   | char      | 첨부파일 업로드 허용 여부                       |
| use_yn           | char      | 사용 여부                                       |
| sort_order       | int       | 정렬 순서                                       |
| created_at       | timestamp | 생성 일시                                       |
| updated_at       | timestamp | 수정 일시                                       |

역할:

- 공지사항/게시판/자료실 유형을 통합 관리
- 게시글 API에서 `board_type_code`를 기준으로 조회 범위 분기

### 2-17. tb_board_post

| 컬럼                  | 타입      | 설명                         |
| --------------------- | --------- | ---------------------------- |
| post_id               | bigint    | 게시글 PK                    |
| board_type_code       | varchar   | 게시판 유형 코드             |
| title                 | varchar   | 제목                         |
| contents              | text      | legacy 본문 호환용           |
| contents_html         | text      | 렌더링용 HTML 본문           |
| contents_json         | json      | Tiptap JSON 본문             |
| contents_text         | text      | 검색/요약용 평문             |
| writer_id             | varchar   | 작성자 ID                    |
| writer_name           | varchar   | 작성자 명                    |
| notice_gubun_code     | varchar   | 공지 구분 공통코드 상세 코드 |
| view_count            | int       | 조회수                       |
| is_pinned             | char      | 상단 고정 여부 (`Y`/`N`)     |
| is_deleted            | char      | 삭제 여부 (`Y`/`N`)          |
| created_at            | timestamp | 생성 일시                    |
| updated_at            | timestamp | 수정 일시                    |
| last_modified_by      | varchar   | 마지막 수정자 ID             |
| last_modified_by_name | varchar   | 마지막 행위자 이름           |
| last_comment_count    | int       | 마지막 댓글 수               |

역할:

- 공지사항/게시판/자료실 게시글의 원본 데이터 저장
- 목록/상세 조회와 삭제 처리의 기본 테이블

### 2-18. tb_board_file

| 컬럼             | 타입      | 설명                     |
| ---------------- | --------- | ------------------------ |
| board_file_id    | bigint    | 첨부 PK                  |
| post_id          | bigint    | 게시글 FK                |
| file_name        | varchar   | 원본 파일명              |
| file_path        | varchar   | legacy 저장 경로(호환용) |
| file_size        | bigint    | 파일 크기                |
| mime_type        | varchar   | MIME 타입                |
| object_key       | varchar   | MinIO object key         |
| bucket_name      | varchar   | MinIO 버킷명             |
| storage_provider | varchar   | 저장소 타입 (`minio`)    |
| checksum_sha256  | varchar   | 파일 해시                |
| content_type     | varchar   | 파일 컨텐츠 타입         |
| uploaded_by      | varchar   | 업로더 ID                |
| deleted_yn       | char      | 삭제 여부 (`Y`/`N`)      |
| created_at       | timestamp | 생성 일시                |
| updated_at       | timestamp | 수정 일시                |

역할:

- 첨부 파일 메타데이터를 보관
- 실제 파일 바이너리는 MinIO에 저장하고 DB에는 경로/메타정보를 기록

### 2-19. tb_board_post_view_history

| 컬럼            | 타입      | 설명           |
| --------------- | --------- | -------------- |
| view_history_id | bigserial | 조회 이력 PK   |
| tenant_id       | bigint    | 테넌트 FK      |
| post_id         | bigint    | 게시글 FK      |
| login_id        | bigint    | 로그인 계정 FK |
| viewed_at       | timestamp | 최초 조회 일시 |

제약:

- 복합 유니크: `(tenant_id, post_id, login_id)`
- `tb_tenant`, `tb_board_post`, `tb_login_account`를 참조

역할:

- 인증 사용자별 공지사항 최초 조회를 기록
- 동일 사용자의 반복·동시 조회로 인한 조회수 중복 증가 방지

### 2-20. tb_drafting_work_category_group

| 컬럼                            | 타입        | 설명                   |
| ------------------------------- | ----------- | ---------------------- |
| drafting_work_category_group_id | bigserial   | 분류 그룹 PK           |
| tenant_id                       | bigint      | 소속 테넌트 FK         |
| cata_code                       | varchar(3)  | 분류 그룹 코드         |
| cata_name                       | varchar(20) | 분류 그룹명            |
| view_seq                        | integer     | 표시 순서              |
| use_at                          | char(1)     | 사용 여부 (`Y`/`N`)    |
| delete_status                   | varchar     | 삭제 상태              |
| created_by / updated_by         | bigint      | 생성/수정 로그인 ID FK |
| created_at / updated_at         | timestamp   | 생성/수정 시각         |

제약/역할:

- `tb_tenant`, `tb_login_account` 참조, 테넌트별 `cata_code` unique
- HACCP 원본 호환용 분류 그룹 테이블. 신규 화면의 분류 옵션은 공통코드 `WF_FORM_CATEGORY`에서 조회

### 2-21. tb_drafting_work_category

| 컬럼                            | 타입         | 설명                                |
| ------------------------------- | ------------ | ----------------------------------- |
| drafting_work_category_id       | bigserial    | 기안양식 기준정보 PK                |
| tenant_id                       | bigint       | 소속 테넌트 FK                      |
| drafting_work_category_group_id | bigint       | 원본 분류 그룹 FK                   |
| category_item_id                | bigint       | 분류 공통코드 항목 ID FK (추가)     |
| cata_type_code                  | varchar(3)   | 양식 구분코드                       |
| code_name                       | varchar(50)  | 양식명                              |
| view_seq                        | integer      | 표시 순서                           |
| type_cnt                        | text         | 원본 업무 텍스트                    |
| reviewer_id / approver_id       | bigint       | 검토/승인 로그인 ID FK              |
| user_type                       | varchar(10)  | 원본 사용자 유형                    |
| haccp_cp_status                 | varchar(10)  | 원본 HACCP 상태                     |
| reg_term                        | varchar(6)   | 등록주기 표시명 호환 컬럼           |
| reg_term_id                     | bigint       | 등록주기 공통코드 항목 ID FK (추가) |
| drafting_work_template_json     | jsonb        | 문서 템플릿 JSON                    |
| drafting_work_template_html     | text         | 문서 템플릿 HTML                    |
| duty_charge_code                | varchar(10)  | 원본 담당 코드                      |
| cata_code                       | varchar(3)   | 원본 분류코드 호환 컬럼             |
| use_at / delete_status          | char/varchar | 사용/삭제 상태                      |
| created_by / updated_by         | bigint       | 생성/수정 로그인 ID FK              |
| created_at / updated_at         | timestamp    | 생성/수정 시각                      |

제약/역할:

- `tb_tenant`, 원본 분류 그룹, `tb_common_code_item`, reviewer/approver 및 감사 사용자 참조
- `category_item_id`는 `WF_FORM_CATEGORY`, `reg_term_id`는 `WF_FORM_CYCLE` 그룹 항목을 서비스에서 검증
- `code_name`은 양식명이다. `reg_term`은 `reg_term_id`가 가리키는 항목명과 동기화
- `cata_type_code`는 기존 `haccpBaseWorkCodeIdGnrService`로 3자리 생성

### 2-22. tb_drafting_work_category_authority

| 컬럼                                | 타입         | 설명                   |
| ----------------------------------- | ------------ | ---------------------- |
| drafting_work_category_authority_id | bigserial    | 담당자 매핑 PK         |
| tenant_id                           | bigint       | 소속 테넌트 FK         |
| drafting_work_category_id           | bigint       | 기안양식 FK            |
| cata_type_code                      | varchar(3)   | 원본 양식 구분코드     |
| employee_no                         | varchar(10)  | 담당 사용자 식별값     |
| use_at / delete_status              | char/varchar | 사용/삭제 상태         |
| created_by / updated_by             | bigint       | 생성/수정 로그인 ID FK |
| created_at / updated_at             | timestamp    | 생성/수정 시각         |

제약/역할:

- `tb_tenant`, `tb_drafting_work_category`, `tb_login_account`를 참조
- `(tenant_id, drafting_work_category_id, employee_no)` unique
- 양식 담당자 매핑을 보존하는 HACCP 원본 테이블

---

## 변경 이력

- 2026-10-22: 그룹웨어 이관 0단계 — GROUPWARE 모듈 아래 S_ERP 와 같은 메뉴 7개(종합현황 / 문서관리 > 문서작성 · 문서현황 / 커뮤니티 > 공지사항 · 자료실), 기능 권한 30 · ADMIN 역할 권한 30, 게시판 종류 `tb_board_type` NOTICE · ARCHIVE 를 넣었다. `20261022_003` 참고.
- 2026-10-22: 그룹웨어 이관 1단계 — S_ERP 공통 댓글 매퍼에 맞춰 `tb_common_comment` 에 `comment_type` · `event_type` · 고유키 · 검사 제약을 더하고 `tb_common_comment_like` 를 만들었다(S_ERP DB 정의와 같음). `20261022_004` 참고.
- 2026-10-22: 그룹웨어 메뉴관리를 S_ERP 와 같게 — 게시판(`GW_BOARD`, 사용안함) 메뉴 · 게시판 종류 `BOARD` 추가, 그룹웨어 기능 권한을 게시판 권한만으로, 일반 사용자 · 플랫폼 관리자 · 커뮤니티 관리자 역할 권한을 S_ERP 값으로 넣었다(ADMIN 은 그대로). `20261022_005` 참고.
- 2026-10-22: 그룹웨어 전자결재 사용자 — 송연 로그인 계정마다 `tb_user` 줄을 만들었다(사원 이름 · 이메일 · 퇴사 여부). 로그인 `uniqId` 는 `tb_user.user_id`, `id` 는 계정 `login_code`(사번)이다(S_ERP 와 같음). 인사관리 등록 · 수정이 `tb_user` 를 맞춘다. `20261022_006` 참고.
- 2026-10-22: 기준정보 > 전자결재 관리 > 기안양식관리(`CO_WORKFLOW` · `CO_WF_FORM`) 메뉴 · 역할 권한을 추가하고, 공지사항 구분 `ALL` · `IMPORTANT` 를 S_ERP 처럼 사용안함으로 했다. `20261022_007` 참고.
- 2026-10-23: 거래처 표 `clients` 에 `client_code VARCHAR(6)`(거래처코드, 서버 6자리 자동번호 · 가장 큰 번호 + 1, 없으면 000001)와 고유 인덱스 `uq_clients_client_code`(코드가 있는 줄만)를 더했다. 있는 거래처는 등록 순서대로 000001 부터 매겼다. `20261023_001` 참고.
- 2026-10-23: 거래처 표 `clients` 에 `use_yn CHAR(1) NOT NULL DEFAULT 'Y'`(사용여부, `ck_clients_use_yn` Y/N)를 더했다. 포장유형 · 창고와 같은 정의이고, 있는 거래처는 모두 Y. 화면 · 서버 연결은 이어서 한다. `20261023_002` 참고.
- 2026-10-23: 거래처 분류 `clients.client_type` 를 공통코드 `CUSTOMER_CATEGORY`(SONGYEON) 코드로 바꿨다(매입 → 001, 매출 → 002, 매입+매출 → 003). 화면은 공통코드와 이어 이름으로 보여 주고, 분류로 거르던 쿼리는 공통코드 이름으로 거른다. 고르는 거래처 목록은 사용 중(`use_yn = 'Y'`)만. `20261023_003` 참고.
- 2026-10-23: 제품 표 `products` 에 `reg_user_id` · `reg_dt` · `upd_user_id` · `upd_dt`(등록자 · 등록일시 · 수정자 · 수정일시, 포장유형과 같은 형식)를 더했다. 제품등록이 등록자를, 제품마스터 제품 창 · 사용여부 저장이 수정자를 남긴다. 있는 제품은 빈칸. `20261023_004` 참고.
- 2026-10-23: 거래처 표 `clients` 에 `reg_user_id` · `upd_user_id` · `upd_dt`(등록자 · 수정자 · 수정일시)를 더했다. 등록일시는 기존 `created_at` 을 쓴다. 거래처 등록 · 엑셀 새 거래처가 등록자를, 창 저장 · 엑셀 덮어쓰기 · 사용여부 저장이 수정자를 남긴다. `20261023_005` 참고.
- 2026-10-23: 부자재 분류 `materials.sub_category` 를 공통코드 `SUB_MATERIAL_CATEGORY`(SONGYEON) 코드로 바꿨다(필름 → 001, 파우치 → 002, 박스 → 003, 원재료는 빈 값 그대로). 이름은 공통코드 이름의 ' — ' 앞부분. `20261023_006` 참고.
- 2026-10-23: 원재료 · 부자재 단위 `materials.unit` 을 공통코드 `UNIT`(SONGYEON) 코드로 바꿨다(kg/KG → 001, EA → 002, 빈 값 그대로). 롤백용으로 바꾸기 전 값을 `bak_20261023_007_material_unit` 에 남겼다. `20261023_007` 참고.
- 2026-10-23: 원재료 · 부자재 표 `materials` 에 `reg_user_id` · `reg_dt` · `upd_user_id` · `upd_dt`(등록자 · 등록일시 · 수정자 · 수정일시, 포장유형과 같은 형식)를 더했다. 신규 등록이 등록자를, 원재료 · 부자재 창의 기본정보 · 바로 반영한 단가 저장이 수정자를 남긴다. 있는 원재료 · 부자재는 빈칸. `20261023_008` 참고.
- 2026-10-23: 원재료 · 부자재 표 `materials` 에 `use_yn CHAR(1) NOT NULL DEFAULT 'Y'`(사용여부, 검사 제약 `ck_materials_use_yn`)를 더했다. 있는 53건은 모두 Y. 원재료마스터 · 부자재마스터의 체크박스 + [저장]이 바꾸고 수정자도 남긴다. `20261023_009` 참고.
- 2026-10-23: 기안양식 `tb_drafting_work_category` 에 부분 고유 인덱스 `uq_drafting_work_category_tenant_cata_type`(tenant_id, cata_type_code, 삭제 안 된 것만)를 더했다. 등록 쿼리의 ON CONFLICT 에 맞는 인덱스가 없어 기안양식 [저장]이 늘 실패했다(S_ERP 20261002_002 가 이관 때 빠졌다). `20261023_010` 참고.
- 2026-10-23: 프로필 · 도장 이미지를 S_ERP 와 같이 `tb_login_account.profile_image` · `stamp_image` 에 두기로 하고, `employees` 에 있던 이미지(프로필 1 · 도장 1)를 같은 사번 계정으로 복사했다. 롤백용 백업 표 `bak_20261023_011_login_images`. `employees` 이미지 칸은 더 쓰지 않는다. `20261023_011` 참고.
- 2026-10-23: 제품 보관방법 `products.storage` 를 공통코드 `STORAGE_METHOD`(SONGYEON) 코드로 바꿨다(실온 → 001, 냉장 → 002, 냉동 → 003). 롤백용 백업 표 `bak_20261023_012_product_storage`(적용 직전에 이미 코드로 바뀌어 있어 `012_backfill_backup` 으로 채움). 견적 · 라벨 표는 그대로. `20261023_012` 참고.
- 2026-10-23: 제품 거래처를 거래처코드로 저장한다. `products` 맨 끝의 `client_code`(손으로 더한 칸)를 지우고, `client_name`(5번째)의 거래처명을 `clients.client_code` 로 바꿔 칸 이름을 `client_code`(text)로 바꿨다(사용자가 직접 적용, 스크립트는 기록 · 재현용). 화면에는 거래처마스터 이름. `20261023_013` 참고.
- 2026-10-23: 견적 `quotes` 의 거래처를 거래처코드로(`client_name` → `client_code`, text), 보관방법을 공통코드 STORAGE_METHOD 코드로 바꿨다(사용자가 직접 적용, 스크립트는 기록 · 재현용). 화면에는 이름. `20261023_014` 참고.
- 2026-10-23: 원재료 납품업체 `materials.supplier`(거래처 id 배열 `[3,5]`)를 `client_code`(거래처코드 배열 `["000003","000005"]`, 여러 곳 유지)로 바꿨다. 22건 변환, 롤백용 백업 표 `bak_20261023_015_material_supplier`. `20261023_015` 참고.
- 2026-10-23: 수주 `sales_order` 에 `use_yn`(사용여부)을 더했다가 같은 날 사용자 결정으로 롤백했다(지금은 칸 없음, 잃은 값 없음). 수주는 진짜 삭제하고, 생산확정 · 출하등록에서 가져간 수주는 지우지 못한다. `20261023_016` 참고.
- 2026-10-26: 생산확정 `production_schedule` 의 `product_name` 을 사용자가 지웠다(품목은 `product_code` 로만 남는다). 표를 다시 만들어 `product_code` 를 `client_name` 바로 뒤로 옮겼다(시퀀스 · 기본값 · 기본키 · 인덱스 그대로, 5건). 백업 표 `bak_20261026_001_production_schedule`. `20261026_001` 참고.
- 2026-10-26: 생산확정 `production_schedule.client_name`(거래처명)을 `client_code`(거래처코드)로 바꿨다. 5건 변환, 롤백용 백업 표 `bak_20261026_002_production_schedule_client`. `20261026_002` 참고.
- 2026-10-26: 수주 `sales_order` 를 생산확정과 같은 모양으로 바꿨다. `client_name` → `client_code`(거래처코드), `product_name` 삭제, `product_code` 를 거래처 바로 뒤로(표 다시 만들기, 시퀀스 · 기본값 · 기본키 · 인덱스 그대로). 7건, 백업 표 `bak_20261026_003_sales_order`. `20261026_003` 참고.
- 2026-10-26: 출하등록 `logistics_schedule` 을 같은 모양으로 바꿨다. `client_name` → `client_code`(거래처코드), `product_name` 삭제, `product_code` 를 거래처 바로 뒤로(표 다시 만들기, 시퀀스 · 기본값 · 기본키 · 인덱스 그대로, id 그대로). 4건, 백업 표 `bak_20261026_004_logistics_schedule`. `20261026_004` 참고.
- 2026-10-26: 출하확정 배차(`logistics_schedule.vehicle` · `production_schedule.ship_vehicle`, 공통코드 VEHICLE_INFO) · 포장방법(`packing_method` · `ship_packing_method`, PACKING_TYPE)을 공통코드 이름이 아니라 코드로 저장한다. 칸은 그대로. 송연 DB 는 바꿀 값이 0건이라 스크립트를 적용하지 않았다(기록 · 다른 DB 용). `20261026_005` 참고.
- 2026-10-26: 출하확정 운행자 `driver_name`(직원 이름)을 `driver_id`(사번 `employees.id`)로 바꿨다(`logistics_schedule` · `production_schedule`, 자리 그대로). 직원만 저장한다. 1건 변환, 롤백용 백업 표 `bak_20261026_006_ship_driver`. `20261026_006` 참고.
- 2026-10-26: 판매 `sales_record` 의 `client_name` → `client_code`(거래처코드), `product_name` → `product_code`(제품코드), `created_by` 값을 등록자 이름 → 사번으로 바꿨다(칸 자리 그대로). 마스터에 있는 것만 저장한다. 2건 변환, 롤백용 백업 표 `bak_20261026_007_sales_record`. `20261026_007` 참고.
- 2026-10-26: 발주 `material_purchase_order.client_name`(거래처명)을 사용자가 `client_code`(거래처코드)로 바꿨다(자리 그대로, 2건). 서버는 거래처코드로 저장하고 이름은 거래처마스터에서 붙인다. 기록용 스크립트 · 롤백 `20261026_008` 참고.
- 2026-10-26: 입고 `material_receiving` 의 `client_name` → `client_code`(거래처코드) · `warehouse` → `warehouse_cd`(창고코드), `tax_type` 값은 공통코드 TAX_CATEGORY 코드(001 과세 · 002 면세). 창고 칸도 모두 창고코드로: `materials.warehouse` → `warehouse_cd`, `material_stock_schedule.warehouse` → `warehouse_cd`, `material_warehouse_move.from_warehouse` · `to_warehouse` → `from_warehouse_cd` · `to_warehouse_cd`(자리 그대로). 입고 3건 변환, 롤백용 백업 표 `bak_20261026_009_code_values`. `20261026_009` 참고.
- 2026-10-26: '누가' 칸을 직원 이름 → 사번으로: `product_stock_movement.created_by_name` → `created_by`, `material_warehouse_move.moved_by` · `production_material_substitution.created_by` · `attachment.uploaded_by` · `document_folder.created_by` · `lock_by`(칸 이름 그대로). 제품 입출고 `product_stock_movement.client_name` → `client_code`(거래처코드). 제품 입출고 21건 변환, 롤백용 백업 표 `bak_20261026_010_by_values`. `20261026_010` 참고.
- 2026-10-26: 라벨 버전 `product_label_versions.created_by` · `updated_by`, 라벨 요청 `label_requests.updated_by` 를 직원 이름 → 사번으로 저장한다(칸 그대로). v1 자동 생성 때 비던 `created_by` 도 채운다. 1건 변환, 롤백용 백업 표 `bak_20261026_011_label_by`. `20261026_011` 참고.
- 2026-10-26: 라벨 버전 `product_label_versions.storage` · 라벨 요청 `label_requests.storage` 를 라벨 글자 대신 공통코드 STORAGE_METHOD 코드로 저장한다(칸 그대로, 라벨에는 이름을 찍는다). 송연 DB 는 이미 코드라 스크립트를 적용하지 않았다(기록 · 다른 DB 용). `20261026_012` 참고.
- 2026-10-22: 모듈관리 화면에서 지워진 메신저·AI(COMM) 모듈 · 메뉴 2개(메신저 · AI 분석) · 권한 줄을 처음 값대로 되살리고, 모듈 순서를 송연 파이썬 원본 사이드바 순서로 맞췄다(대시보드 · 메신저·AI · 영업 · 공통 · 생산 · 물류 · 판매 · 구매 · 품질 · 상품개발 · 인사·회계 · 환경설정). 백업 표 `bak_20261022_002_module_order`. `20261022_002` 참고.
- 2026-10-22: `20261022_001` 을 같은 날 롤백했다(사용자 요청 원복). 이름은 다시 '대시보드'. 메신저·AI(COMM) 모듈 · 메뉴 2개는 그 사이 모듈관리 화면에서 지워져 표에 없다.
- 2026-10-22: 왼쪽 메뉴 '대시보드'(DASH 모듈 · dashboard 메뉴)를 '홈'으로, 메신저·AI(COMM) 모듈을 `use_at = 'N'` 으로 바꿨다(데이터만). 홈 메모·공지는 기존 `dashboard_memos` 표를 쓴다(새 API `/api/v1/dash/memos`). `20261022_001` 참고.
- 2026-10-21: 송연 직원을 S_ERP 계정 표로 이어 권한관리를 S_ERP 와 같이 쓴다(데이터만, 표 구조 그대로). 계정 있는 직원마다 `tb_login_account` 한 줄(`login_code` = 사번), 역할 연결(`is_admin` = 1 → ADMIN, 그 밖 → DEFAULT_USER), ADMIN 에 SONGYEON 메뉴 권한 전체(`tb_role_menu_permission`). 롤백용 백업 표 `bak_20261021_001_admin_role_menu_permission`. 로그인 · 역할 판정 · 인사관리 계정 · 비밀번호 코드도 바꿨다. `20261021_001` 참고.
- 2026-10-20: 창고 · 포장유형 자동 코드를 번호표 대신 '표에 있는 가장 큰 자동 번호 + 1' 로 매기게 바꿨다(자료를 지우면 다시 001 부터). 창고 `WH-002` 를 `WH-001` 로 맞췄다. `20261020_003` 참고.
- 2026-10-20: 창고 자동 코드가 `WH-001` 부터 나오게, 새로 받은 `WH-004` 를 `WH-001` 로 바꾸고 번호표(`WAREHOUSE_CODE`)를 1로 맞췄다. `20261020_002` 참고.
- 2026-10-20: 포장유형 자동 코드 번호표(`tb_id_sequence` 키 `BOX_TYPE_CODE`)를 0으로 돌려 `PACK-001` 부터 매기게 했다. 자동 번호는 사용안함 줄의 코드도 건너뛴다. `20261020_001` 참고.
- 2026-10-19: 스케줄관리 두 화면의 화면ID 를 `SCProductionScheduleView` · `SCLogisticsScheduleView` 로 바꿨다(menu_code · menu_url). `20261019_016` 참고.
- 2026-10-19: 공통관리에 분류 '스케줄관리'(`schedule`, `/co/schedule`, 순서 2)를 만들고 생산스케줄 · 물류스케줄을 그 아래로 옮겼다(`/co/schedule/production` · `/co/schedule/logistics`). `20261019_015` 참고.
- 2026-10-19: 지워진 공통관리 분류 '기초정보'(`master`)와 그 아래 화면 메뉴 8개 · 권한 행을 복구했다(하위 메뉴 · 권한 행은 FK CASCADE 로 함께 지워졌었다). `20261019_014` 참고.
- 2026-10-19: 공통관리 > 기초정보 아래에 부자재마스터 화면 메뉴(`BSSubMaterialMasterView`, 순서 90)를 추가하고(`20261019_012`), 탭을 모두 화면으로 뺀 기초정보 화면 메뉴(`settings`)를 지웠다(`20261019_013`, 백업 표 `bak_20261019_013_*`). 서버관리 화면 · 수정 API 는 지웠고 값 표 `external_api_settings` 는 그대로다.
- 2026-10-19: 공통관리 > 기초정보 아래에 원재료마스터 화면 메뉴(`tb_menu.menu_code = 'BSMaterialMasterView'`, `/co/master/BSMaterialMasterView`, 순서 80)와 권한 행을 추가했다(데이터 변경). 기초정보의 원재료BOM 탭은 지웠다. `20261019_011` 참고.
- 2026-10-19: 공통관리 > 기초정보 아래에 거래처별 제품조회 화면 메뉴(`tb_menu.menu_code = 'BSPartnerItemView'`, `/co/master/BSPartnerItemView`, 순서 70)와 권한 행을 추가했다(데이터 변경). 기초정보의 거래처별 제품조회 탭은 지웠다. `20261019_010` 참고.
- 2026-10-19: 공통관리 > 기초정보 아래에 거래처마스터 화면 메뉴(`tb_menu.menu_code = 'BSPartnerMasterView'`, `/co/master/BSPartnerMasterView`, 순서 60)와 권한 행을 추가했다(데이터 변경). 기초정보의 거래처BOM 탭은 지웠다. `20261019_009` 참고.
- 2026-10-19: 공통관리 > 기초정보 아래에 제품마스터 화면 메뉴(`tb_menu.menu_code = 'BSItemMasterView'`, `/co/master/BSItemMasterView`, 순서 50)와 권한 행을 추가했다(데이터 변경). 기초정보의 제품BOM 탭은 지웠다. `20261019_008` 참고.
- 2026-10-19: `employees.id` 를 숫자 자동번호에서 사번(`varchar(20)`, 예: `0000`)으로 바꾸고 `emp_no` 칸 · 자동번호 시퀀스를 지웠다. 새 사원은 8자리 자동 사번(번호표 키 `EMPLOYEE_ID`). 사원 번호를 담는 칸 16개(채팅 · 문서함 · 연차 · 레시피 등)도 `varchar(20)` 로 바꿨다(자료 0줄). 옛 번호 짝은 `bak_20261019_007_employees_id`. `20261019_007` 참고.
- 2026-10-19: 기본창고를 유형마다 한 곳에서 전체 한 곳으로 바꿨다(기본창고 = 입고창고, 서비스 규칙). 창고등록 화면에서 창고코드 칸을 뺐다. 정리 스크립트는 DB 가 이미 한 곳이라 적용하지 않고 남겼다. `20261019_006` 참고.
- 2026-10-19: 창고등록이 옛 `warehouses` 대신 `tb_warehouse`(테이블 설계자가 새 모양으로 만든 표)를 쓴다. 입고창고 = 원자재 기본창고, 창고코드 자동 `WH001`(번호표 키 `WAREHOUSE_CODE`), 삭제는 `use_yn = 'N'`. 입고 · 재고조정 · 재고 현황의 창고 목록도 이 표로 바꿨다. 표 정의는 바꾸지 않았고 기록만 남겼다. 옛 `warehouses` 6줄은 옮기지 않았다. `20261019_005` 참고.
- 2026-10-19: 공통관리 > 기초정보 아래에 창고등록 화면 메뉴(`tb_menu.menu_code = 'BSWarehouseView'`, `/co/master/BSWarehouseView`)와 권한 행을 추가했다(데이터 변경). 기초정보의 창고등록 탭은 지웠다. `20261019_004` 참고.
- 2026-10-19: 기초정보의 포장방법 · 차량정보 탭과 코드를 지우고, 그 자료(3 · 2건)를 공통코드 `PACKING_TYPE` · 새 그룹 `VEHICLE` 상세로 옮겼다(데이터 변경, 백업 표 `bak_20261019_003_common_code`). 옛 표 `packing_methods` · `vehicles` 는 남겼고 이제 읽는 코드가 없다. `20261019_003` 참고.
- 2026-10-19: `tb_box_type` 등록자 · 수정자를 로그인 아이디에서 사번(`employees.emp_no`)으로 바꿨다(데이터 1줄, 백업 표 `bak_20261019_002_box_type_user`). 조회는 사원 표와 사번으로 이어 붙여 이름을 보여준다. `20261019_002` 참고.
- 2026-10-19: 포장유형 마스터 `tb_box_type` · 함수 `fn_set_upd_dt` · 트리거 `tg_box_type_upd` 추가(테이블 설계자 스크립트로 직접 적용, 기록은 다시 돌려도 안전하게 정리). 포장유형 화면이 옛 `product_types` 대신 이 표를 쓴다. [backend/DATABASE/20261019](../../backend/DATABASE/20261019) 및 [docs/database/20261019](20261019) 참고.
- 2026-10-16: 공통관리 모듈 코드 · 주소를 `cm` → `co`(`tb_module.module_code = 'CO'`, `/co`)로, 공통관리 메뉴 주소를 `/co/...` 로 바꿨다(데이터 변경). `20261016_006` 참고.
- 2026-10-16: 공통코드 관리(S_ERP 최신판) 상세코드 자동 번호를 위해 `tb_id_sequence` 를 추가했다(S_ERP `20261002_003` 과 같은 SQL). 적용 스크립트는 [backend/DATABASE/20261016](../../backend/DATABASE/20261016) 및 [docs/database/20261016](20261016) 의 `20261016_004` 참고.
- 2026-10-16: 공통관리 기준정보 분류 아래에 공통코드 관리 메뉴(`tb_menu.menu_code = 'cmncodes'`, `/cm/master/cmncodes`)와 권한 행을 추가했다(데이터 변경). `20261016_005` 참고.
- 2026-10-16: 공통관리 기준정보 분류의 코드 · 주소를 S_ERP 처럼 `standard` → `master`(`/cm/master`, 아래 화면 `/cm/master/*`)로 바꿨다(데이터 변경, 스키마 변경 없음). 적용 스크립트는 [backend/DATABASE/20261016](../../backend/DATABASE/20261016) 및 [docs/database/20261016](20261016) 참고.
- 2026-10-16: 공통관리 > 기준정보 아래에 포장유형 화면 메뉴(`tb_menu.menu_code = 'BSBoxTypeView'`, `/cm/standard/BSBoxTypeView`)와 권한 행을 추가하고 기초정보 설명에서 포장유형을 뺐다(데이터 변경, 스키마 변경 없음). 적용 스크립트는 [backend/DATABASE/20261016](../../backend/DATABASE/20261016) 및 [docs/database/20261016](20261016) 참고.
- 2026-10-16: 공통관리 메뉴에 분류 '기준정보'(`tb_menu.menu_code = 'standard'`)를 추가하고 기초정보를 그 아래(`/cm/standard/settings`)로 옮겼다(데이터 변경, 스키마 변경 없음). 적용 스크립트는 [backend/DATABASE/20261016](../../backend/DATABASE/20261016) 및 [docs/database/20261016](20261016) 참고.
- 2026-10-01: HACCP 기안양식 기준정보 테이블 3종을 이관하고 `category_item_id`, `reg_term_id` 및 테넌트별 분류/주기 공통코드 seed를 정의했다. 적용 스크립트는 [backend/DATABASE/20261001](../../backend/DATABASE/20261001) 및 [docs/database/20261001](20261001) 참고. (미반영 SQL 초안)
- 2026-09-16: 공통 첨부/댓글 스키마 추가로 `tb_common_file`, `tb_common_comment` 신규 테이블 생성. 공통 서비스는 `owner_type + owner_id` 기준으로 notice, board, approval, feed를 모두 재사용할 수 있도록 정리. 적용 스크립트는 [backend/DATABASE/20260916](../../backend/DATABASE/20260916) 및 [docs/database/2026-09-16](2026-09-16) 참고.
- 2026-09-18: 공지사항 본문 이미지와 일반 첨부파일을 구분하기 위해 `tb_common_file.file_usage_type` 컬럼 및 허용값 제약을 추가. 적용 스크립트는 [backend/DATABASE/20260918](../../backend/DATABASE/20260918) 및 [docs/database/20260918](20260918) 참고.
- 2026-09-16: 공지사항 본문은 `contents_html`/`contents_json`/`contents_text` 3중 저장 구조로 정교화하고, MinIO 첨부 메타 연동을 위해 `tb_board_file` 및 `tb_board_post` 보강, NOTICE 타입 보장. 적용 스크립트는 [backend/DATABASE/20260916](../../backend/DATABASE/20260916) 및 [docs/database/2026-09-16](2026-09-16) 참고.
- 2026-09-18: 공지사항 구분 코드와 게시글/댓글 최신 행위자 감사 컬럼을 추가했다. 적용 스크립트는 [backend/DATABASE/20260918](../../backend/DATABASE/20260918) 및 [docs/database/20260918](20260918) 참고.
- 2026-09-21: 공지사항 사용자별 최초 조회수 중복 방지를 위해 `tb_board_post_view_history`를 추가했다. 적용 스크립트는 [backend/DATABASE/20260921](../../backend/DATABASE/20260921) 및 [docs/database/20260921](20260921) 참고.
- 2026-09-15: 그룹웨어 커뮤니티 게시판 스키마 추가로 `tb_board_type`, `tb_board_post`, `tb_board_file` 신규 테이블 생성. 적용 스크립트는 [backend/DATABASE/20260915](../../backend/DATABASE/20260915) 및 [docs/database/2026-09-15](2026-09-15) 참고.
- 2026-09-11: 공통코드 관리 기능을 위한 `tb_common_code_group`, `tb_common_code_item` 신규 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260911](../../backend/DATABASE/20260911) 및 [docs/database/2026-09-11](2026-09-11) 참고.
- 2026-09-01: 메뉴 설명 연동 작업으로 `tb_menu.menu_dc` 컬럼 추가. 적용 스크립트는 [backend/DATABASE/20260901](../../backend/DATABASE/20260901) 참고.
- 2026-08-31: 로그인/JWT 연동 작업(`docs/directions/20260831/20260831_001_로그인_JWT_백엔드_연동_작업지시서.md`)으로 `tb_department`, `tb_role`, `tb_login_account_role` 3개 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260831](../../backend/DATABASE/20260831) 참고.
- 2026-08-31: 모듈/메뉴/권한관리 백엔드 연동 작업(`docs/directions/20260831/20260831_002_모듈_메뉴_권한관리_백엔드_연동_작업지시서.md`)으로 `tb_module`, `tb_menu` 2개 테이블 추가. 적용 스크립트는 [backend/DATABASE/20260831](../../backend/DATABASE/20260831) 참고.
- 2026-08-31: 모듈별 메뉴 버튼 권한 관리 작업으로 `tb_permission`, `tb_menu_permission` 2개 테이블과 `READ`/`CREATE`/`UPDATE`/`DELETE`/`EXCEL` 초기 권한을 추가. 적용 스크립트는 [20260831_004_create_menu_permission_schema.sql](../../backend/DATABASE/20260831/20260831_004_create_menu_permission_schema.sql) 참고.
- 2026-08-31: 역할별 메뉴-버튼 권한 매핑 생성 작업으로 `tb_role_menu_permission` 테이블을 별도 신규 추가. 적용 스크립트는 [20260831_005_create_role_menu_permission_schema.sql](../../backend/DATABASE/20260831/20260831_005_create_role_menu_permission_schema.sql) 참고.
