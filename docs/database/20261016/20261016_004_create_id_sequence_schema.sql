-- 20261016_004_create_id_sequence_schema.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 조건별 숫자 발번 카운터(tb_id_sequence) 추가 및 기존 숫자형 공통코드 카운터 초기화.
--       공통코드 관리의 상세코드 자동 번호(S_ERP 최신판)에 필요하다. S_ERP backend/DATABASE/20261002/20261002_003_create_id_sequence_schema.sql 과 같은 SQL 이다.

BEGIN;


CREATE TABLE IF NOT EXISTS public.tb_id_sequence (
    generator_key VARCHAR(100) NOT NULL,
    scope_key_1 VARCHAR(100) NOT NULL,
    scope_key_2 VARCHAR(100) NOT NULL DEFAULT '',
    last_issued_value BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_id_sequence PRIMARY KEY (generator_key, scope_key_1, scope_key_2),
    CONSTRAINT chk_id_sequence_last_issued_value CHECK (last_issued_value >= 0)
);

INSERT INTO public.tb_id_sequence (
    generator_key,
    scope_key_1,
    scope_key_2,
    last_issued_value
)
SELECT
    'COMMON_CODE_ITEM_CODE',
    item.group_id::VARCHAR,
    '',
    MAX(
        CASE
            WHEN item.item_code ~ '^[0-9]+$' THEN
                CASE
                    WHEN item.item_code::NUMERIC <= 9223372036854775807
                        THEN item.item_code::NUMERIC
                END
        END
    )::BIGINT
FROM public.tb_common_code_item item
GROUP BY item.group_id
HAVING MAX(
    CASE
        WHEN item.item_code ~ '^[0-9]+$' THEN
            CASE
                WHEN item.item_code::NUMERIC <= 9223372036854775807
                    THEN item.item_code::NUMERIC
            END
    END
) IS NOT NULL
ON CONFLICT (generator_key, scope_key_1, scope_key_2) DO UPDATE
SET last_issued_value = GREATEST(
        public.tb_id_sequence.last_issued_value,
        EXCLUDED.last_issued_value
    ),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
