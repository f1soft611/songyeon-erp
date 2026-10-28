-- 20260831_001_rollback.sql
-- 목적: 20260831_001_create_login_schema.sql / 20260831_002_seed_admin_tenant.sql 롤백
-- 주의: s-erp_central 전용. 다른 DB(haccp_cloud_central 등)에는 실행하지 말 것.

DROP TABLE IF EXISTS tb_user CASCADE;
DROP TABLE IF EXISTS tb_login_account_role CASCADE;
DROP TABLE IF EXISTS tb_login_account CASCADE;
DROP TABLE IF EXISTS tb_role CASCADE;
DROP TABLE IF EXISTS tb_department CASCADE;
DROP TABLE IF EXISTS tb_tenant CASCADE;
