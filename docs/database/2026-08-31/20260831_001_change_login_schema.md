# 20260831*001*로그인*스키마*변경이력

## 변경 일자

2026-08-31

## 변경 내용

- `s-erp_central`(PostgreSQL) DB에 로그인/JWT 연동에 필요한 6개 테이블을 신규 생성
  - `tb_tenant`, `tb_department`, `tb_role`, `tb_login_account`, `tb_login_account_role`, `tb_user`
- 초기 테넌트/관리자 계정 시드 데이터 삽입
  - 테넌트코드 `T1358606250` / 사업자번호 `1358606250` / 테넌트명 `에프원소프트`
  - 로그인 계정 `admin` / `f1soft@611` (PLATFORM_ADMIN 역할)

## 적용 대상 테이블

- 신규: tb_tenant, tb_department, tb_role, tb_login_account, tb_login_account_role, tb_user

## 영향 범위

- 신규 DB(`s-erp_central`)에만 적용되며, 기존 운영 DB(`haccp_cloud_central`, `tenant_*` 등)에는 영향 없음.
- 백엔드 로그인 매퍼(backend/src/main/resources/egovframework/mapper/let/uat/uia/EgovLoginUsr_SQL_postgresql.xml)가 참조하는 테이블 구조와 일치하도록 작성함.

## 적용 스크립트

1. `20260831_001_create_login_schema.sql`
2. `20260831_002_seed_admin_tenant.sql`

## 롤백 여부

- 가능. `20260831_001_rollback.sql` 실행 시 신규 생성한 6개 테이블 전체 삭제(CASCADE).
