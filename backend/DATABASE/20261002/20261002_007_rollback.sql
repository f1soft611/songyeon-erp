-- 20261002_007_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_007 되돌리기 — employees 의 이메일·프로필 이미지·도장 이미지 칸을 지운다(넣어 둔 값도 함께 지워짐).

BEGIN;

ALTER TABLE employees DROP COLUMN IF EXISTS stamp_image;
ALTER TABLE employees DROP COLUMN IF EXISTS profile_image;
ALTER TABLE employees DROP COLUMN IF EXISTS email;

COMMIT;
