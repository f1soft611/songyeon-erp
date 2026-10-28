-- 20260918_007 롤백

ALTER TABLE tb_common_file
    DROP CONSTRAINT IF EXISTS ck_tb_common_file_usage_type;

ALTER TABLE tb_common_file
    DROP COLUMN IF EXISTS file_usage_type;
