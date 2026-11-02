BEGIN;

ALTER TABLE public.tb_electronic_approval_main
    ADD COLUMN document_no VARCHAR(40);

WITH numbered_documents AS (
    SELECT
        tenant_id,
        electronic_approval_id,
        created_at::date AS issue_date,
        ROW_NUMBER() OVER (
            PARTITION BY tenant_id, created_at::date
            ORDER BY created_at, electronic_approval_id
        ) AS sequence_value
    FROM public.tb_electronic_approval_main
)
UPDATE public.tb_electronic_approval_main AS document
SET document_no = 'EA-' || TO_CHAR(numbered.issue_date, 'YYYYMMDD') || '-'
    || LPAD(
        numbered.sequence_value::text,
        GREATEST(4, LENGTH(numbered.sequence_value::text)),
        '0'
    )
FROM numbered_documents AS numbered
WHERE document.tenant_id = numbered.tenant_id
  AND document.electronic_approval_id = numbered.electronic_approval_id;

INSERT INTO public.tb_id_sequence (
    generator_key,
    scope_key_1,
    scope_key_2,
    last_issued_value
)
SELECT
    'ELECTRONIC_APPROVAL_NO',
    tenant_id::varchar,
    SUBSTRING(document_no FROM 4 FOR 8),
    MAX(SPLIT_PART(document_no, '-', 3)::bigint)
FROM public.tb_electronic_approval_main
GROUP BY tenant_id, SUBSTRING(document_no FROM 4 FOR 8)
ON CONFLICT (generator_key, scope_key_1, scope_key_2) DO UPDATE
SET last_issued_value = GREATEST(
        public.tb_id_sequence.last_issued_value,
        EXCLUDED.last_issued_value
    ),
    updated_at = CURRENT_TIMESTAMP;

ALTER TABLE public.tb_electronic_approval_main
    ALTER COLUMN document_no SET NOT NULL;

ALTER TABLE public.tb_electronic_approval_main
    ADD CONSTRAINT uq_tb_electronic_approval_main_tenant_document_no
    UNIQUE (tenant_id, document_no);

COMMIT;
