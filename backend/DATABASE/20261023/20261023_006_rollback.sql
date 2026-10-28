-- 20261023_006_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_006 되돌리기 — 부자재 분류 코드를 예전 글자로 돌린다: 001 → 필름, 002 → 파우치, 003 → 박스
-- 주의: 서버 · 화면이 분류를 코드로 읽고 쓰므로, 롤백할 때는 그 코드도 20261023_006 이전으로 함께 돌린다.

BEGIN;

UPDATE public.materials
SET sub_category = CASE sub_category
        WHEN '001' THEN '필름'
        WHEN '002' THEN '파우치'
        WHEN '003' THEN '박스'
    END
WHERE sub_category IN ('001', '002', '003');

COMMIT;
