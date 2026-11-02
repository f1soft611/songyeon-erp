BEGIN;

DELETE FROM public.tb_id_sequence
WHERE generator_key = 'ELECTRONIC_APPROVAL_NO';

ALTER TABLE public.tb_electronic_approval_main
    DROP CONSTRAINT uq_tb_electronic_approval_main_tenant_document_no;

ALTER TABLE public.tb_electronic_approval_main
    DROP COLUMN document_no;

COMMIT;
