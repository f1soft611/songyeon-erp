-- 20261002_007_add_employee_email_images.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 내 정보 관리 화면(S_ERP 화면)을 송연 employees 로 쓰기 위해 이메일·프로필 이미지·도장 이미지 칸을 더한다.
--       이미지는 S_ERP 와 같이 'data:image/png;base64,...' 글자로 넣는다(서버가 512px·1MB 이하로 줄여 저장).

BEGIN;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS stamp_image TEXT;

COMMENT ON COLUMN employees.email IS '이메일(내 정보 관리)';
COMMENT ON COLUMN employees.profile_image IS '프로필 이미지(data URL, 내 정보 관리)';
COMMENT ON COLUMN employees.stamp_image IS '도장 이미지(data URL, 내 정보 관리)';

COMMIT;
