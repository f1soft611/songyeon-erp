# 20261001_001 HACCP 기안양식 기준정보 이관 이력

## 변경 상태

- 작성일: 2026-10-01
- 반영 상태: 미반영 SQL 초안
- 대상 DB: S-ERP PostgreSQL tenant schema
- 계획/사양: `docs/plan/20261001/20261001_001_전자결재_기안양식관리_계획서.md`, `docs/spec/20261001/20261001_001_전자결재_기안양식관리_사양서.md`

## 변경 내용

- HACCP 원본 `tb_drafting_work_category_group`, `tb_drafting_work_category`, `tb_drafting_work_category_authority` 구조 생성
- 원본 테이블명과 업무 컬럼, PK/FK, 기존 unique 제약 및 인덱스를 보존
- `tb_drafting_work_category.category_item_id`, `reg_term_id`를 추가해 공통코드 항목 ID를 보관
- `code_name`은 양식명으로 유지하며 `reg_term`은 `reg_term_id`가 가리키는 공통코드 `item_nm`과 동기화
- 테넌트별 `WF_FORM_CATEGORY`, `WF_FORM_CYCLE` 공통코드 그룹 seed 및 `DAY`, `WEEK`, `MONTH`, `EVENT` 등록주기 항목 seed
- 분류 항목은 seed하지 않고 기안양식 페이지의 공통코드 상세 도움창에서 추가/수정
- `cata_type_code`는 기존 `haccpBaseWorkCodeIdGnrService` eGov generator (3자리) 사용. 새 sequence는 만들지 않음

## 영향 범위

- 신규 테이블: `tb_drafting_work_category_group`, `tb_drafting_work_category`, `tb_drafting_work_category_authority`
- 변경 컬럼: `tb_drafting_work_category.category_item_id`, `tb_drafting_work_category.reg_term_id`
- 공통코드 테이블: `tb_common_code_group`, `tb_common_code_item`
- FK: tenant/user/work 원본 관계와 두 common-code item 참조
- SQL은 사용자/업무 테이블 행 데이터를 복사하지 않는다. PostgreSQL MCP로 S-ERP 공개 스키마 테이블 목록과 공통코드 테이블 구조만 확인했다.
- S-ERP의 실제 운영 스키마/tenant database 적용 대상은 배포 전 확인해야 한다. 현재 초안은 `public` qualification을 사용한다.

## 롤백

- 대응: `20261001_001_rollback.sql`
- 롤백 여부: 제공함
- category/work/authority 데이터가 존재하면 테이블 롤백을 중단한다.
- 작업에서 seed한 cycle item만 marker와 코드가 맞는 경우 제거한다.
- 사용자 생성 category item이 남아 있으면 `WF_FORM_CATEGORY` 그룹을 삭제하지 않고 보존한다.
- 공통코드 item 또는 원본 테이블을 다른 데이터가 참조하면 FK `RESTRICT`로 중단되어야 한다. 실제 적용 후 사용자 데이터가 생긴 DB에서는 영향 분석/백업/별도 승인 없이 rollback하지 않는다.
