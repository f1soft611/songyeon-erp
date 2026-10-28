-- 20261016_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_004 되돌리기 — 조건형 ID 발번 카운터 표를 지운다(S_ERP 20261002_003_rollback.sql 과 같다).
-- 주의: 지우면 자동으로 매긴 상세코드 번호 기록이 사라진다. 다시 만들면 기존 숫자형 코드의 최댓값부터 이어서 매긴다.

BEGIN;

DROP TABLE IF EXISTS public.tb_id_sequence;

COMMIT;
