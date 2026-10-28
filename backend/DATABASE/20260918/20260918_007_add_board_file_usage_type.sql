-- 20260918_007 공지사항 본문 이미지 용도 구분
-- 본문 임베드 이미지와 일반 첨부파일을 구분한다.

ALTER TABLE tb_common_file
    ADD COLUMN IF NOT EXISTS file_usage_type varchar(20) NOT NULL DEFAULT 'ATTACHMENT';

ALTER TABLE tb_common_file
    DROP CONSTRAINT IF EXISTS ck_tb_common_file_usage_type;

ALTER TABLE tb_common_file
    ADD CONSTRAINT ck_tb_common_file_usage_type
    CHECK (file_usage_type IN ('ATTACHMENT', 'EMBEDDED'));

COMMENT ON COLUMN tb_common_file.file_usage_type IS '파일 사용 용도: ATTACHMENT 일반 첨부, EMBEDDED 본문 임베드 이미지';
