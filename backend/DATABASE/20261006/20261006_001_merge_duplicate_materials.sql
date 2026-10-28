-- 20261006_001_merge_duplicate_materials.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 같은 이름·규격으로 두 번 등록된 원재료를 먼저 등록된 쪽으로 합친다(사용자 요청).
--   MSG(L-글루탐산나트륨) 25kg : 000014 → 000004 (단가는 000004 의 2,650원 — 사용자 선택)
--   흑후추분말 20kg            : 000015 → 000005 (둘 다 7,500원)
-- 지울 쪽은 제품 배합비(김치찌개분말 000003)에만 쓰였고 재고·입고·생산 기록은 없다(적용 전 확인).
-- 바뀌는 줄은 모두 bak_20261006_001_* 표에 남긴다(롤백용).

BEGIN;

-- ===== 백업 =====
CREATE TABLE IF NOT EXISTS bak_20261006_001_materials AS
SELECT * FROM materials WHERE code IN ('000014', '000015');

CREATE TABLE IF NOT EXISTS bak_20261006_001_bom AS
SELECT * FROM bom WHERE material_code IN ('000014', '000015');

CREATE TABLE IF NOT EXISTS bak_20261006_001_material_price_log AS
SELECT * FROM material_price_log WHERE material_code IN ('000014', '000015');

CREATE TABLE IF NOT EXISTS bak_20261006_001_pricing AS
SELECT * FROM pricing
WHERE product_code IN (SELECT product_code FROM bom WHERE material_code IN ('000014', '000015'));

-- ===== 배합비: 남길 원재료로 바꾸고 단가·적용단가를 남길 원재료 기준으로 다시 계산 =====
UPDATE bom b
SET material_code = keep.code,
    material_name = keep.name,
    unit_price_per_kg = keep.unit_price,
    amount_per_kg = CASE WHEN b.ratio_percent IS NULL OR keep.unit_price IS NULL THEN NULL ELSE b.ratio_percent * keep.unit_price END
FROM (VALUES ('000014', '000004'), ('000015', '000005')) AS m(dup_code, keep_code)
JOIN materials keep ON keep.code = m.keep_code
WHERE b.material_code = m.dup_code;

-- ===== 바뀐 제품의 단가표: 원재료비 = 배합비 적용단가 합, 제품단가 = 모든 원가 항목의 합 =====
UPDATE pricing p
SET material_cost = s.material_cost,
    total_price = s.material_cost
                + COALESCE(p.loss_cost, 0) + COALESCE(p.markup_cost, 0) + COALESCE(p.labor_cost, 0)
                + COALESCE(p.packaging_cost, 0) + COALESCE(p.logistics_cost, 0) + COALESCE(p.margin, 0)
                + COALESCE(p.other_cost1, 0) + COALESCE(p.other_cost2, 0) + COALESCE(p.other_cost3, 0) + COALESCE(p.other_cost4, 0)
FROM (
    SELECT product_code, COALESCE(SUM(amount_per_kg), 0) AS material_cost
    FROM bom
    WHERE product_code IN (SELECT product_code FROM bak_20261006_001_pricing)
    GROUP BY product_code
) s
WHERE p.product_code = s.product_code;

-- ===== 지울 원재료와 그 단가 변경 이력 =====
DELETE FROM material_price_log WHERE material_code IN ('000014', '000015');
DELETE FROM materials WHERE code IN ('000014', '000015');

COMMIT;
