-- 20260911_003_create_common_code_schema_rollback.sql
-- 목적: 공통코드 그룹/상세코드 테이블 제거

DROP TABLE IF EXISTS tb_common_code_item CASCADE;
DROP TABLE IF EXISTS tb_common_code_group CASCADE;
