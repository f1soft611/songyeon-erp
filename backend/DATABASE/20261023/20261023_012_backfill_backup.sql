-- 20261023_012_backfill_backup.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_012 롤백용 백업 표 채우기(2026-10-23 적용 때 한 번 실행)
--   012 를 적용하기 직전에 products.storage 가 이미 코드(001 · 002 · 003)로 바뀌어 있었다(012 스크립트 밖에서 바뀜).
--   그래서 012 의 백업(INSERT ... WHERE 이름이 같은 것)이 0건이 되어 롤백이 이름으로 돌리지 못했다.
--   012 시험 실행 때 본 원래 값은 6건 모두 공통코드 이름과 똑같았다.
--   그 이름으로 백업을 채운다. 채운 뒤 롤백 스크립트를 돌리면 원래 값의 해시와 같았다(트랜잭션 안에서 확인 후 되돌림).
-- 다시 돌려도 결과가 같다(이미 있는 코드는 건너뛴다).

BEGIN;

INSERT INTO public.bak_20261023_012_product_storage (code, storage)
SELECT p.code, i.item_nm
FROM public.products p
JOIN public.tb_common_code_item i ON i.item_code = p.storage
JOIN public.tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'STORAGE_METHOD'
JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
ON CONFLICT (code) DO NOTHING;

COMMIT;
