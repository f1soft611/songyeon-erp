-- 20261023_006_sub_category_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 부자재 분류를 공통코드 값으로 저장한다(2026-10-23 사용자 결정 "코드로 저장(거래처와 같게)").
--   사용자가 만든 공통코드 SUB_MATERIAL_CATEGORY(SONGYEON): 001 필름 · 002 파우치 · 003 박스
--   materials.sub_category 의 글자를 코드로 바꾼다: 필름 → 001, 파우치 → 002, 박스 → 003
--   (비어 있는 줄 = 원재료, 이미 코드인 줄 · 다른 값은 건드리지 않는다)
-- 화면 · 서버는 공통코드와 이어 이름(' — ' 앞부분, 예: 필름)으로 보여 주고 비교한다. 다시 돌려도 결과가 같다.
-- 주의: 같은 DB 를 쓰는 예전 송연 파이썬 프로그램이 sub_category 글자를 직접 보면 그쪽 필름 · 파우치 차감이 맞지 않는다.

BEGIN;

DO $$
BEGIN
    IF (SELECT count(*)
        FROM tb_common_code_item i
        JOIN tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'SUB_MATERIAL_CATEGORY'
        JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
        WHERE i.item_code IN ('001', '002', '003')) <> 3 THEN
        RAISE EXCEPTION '공통코드 SUB_MATERIAL_CATEGORY 에 001 · 002 · 003 이 모두 있어야 합니다';
    END IF;
END $$;

UPDATE public.materials
SET sub_category = CASE BTRIM(sub_category)
        WHEN '필름' THEN '001'
        WHEN '파우치' THEN '002'
        WHEN '박스' THEN '003'
    END
WHERE BTRIM(sub_category) IN ('필름', '파우치', '박스');

COMMIT;
