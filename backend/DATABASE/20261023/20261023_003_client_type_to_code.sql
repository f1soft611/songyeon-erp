-- 20261023_003_client_type_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 거래처 분류를 공통코드 값으로 저장한다(계획 · 사양서 20261023_006 3절).
--   사용자가 만든 공통코드 CUSTOMER_CATEGORY(SONGYEON): 001 매입거래처 · 002 매출거래처 · 003 매입+매출 거래처
--   clients.client_type 의 예전 글자를 코드로 바꾼다: 매입 → 001, 매출 → 002, 매입+매출 → 003
--   (이미 코드인 줄 · 다른 값은 건드리지 않는다)
-- 화면 · 서버는 공통코드와 이어 이름으로 보여 준다. 다시 돌려도 결과가 같다.

BEGIN;

DO $$
BEGIN
    IF (SELECT count(*)
        FROM tb_common_code_item i
        JOIN tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'CUSTOMER_CATEGORY'
        JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
        WHERE i.item_code IN ('001', '002', '003')) <> 3 THEN
        RAISE EXCEPTION '공통코드 CUSTOMER_CATEGORY 에 001 · 002 · 003 이 모두 있어야 합니다';
    END IF;
END $$;

UPDATE public.clients
SET client_type = CASE BTRIM(client_type)
        WHEN '매입' THEN '001'
        WHEN '매출' THEN '002'
        WHEN '매입+매출' THEN '003'
    END
WHERE BTRIM(client_type) IN ('매입', '매출', '매입+매출');

COMMIT;
