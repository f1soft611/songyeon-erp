-- 20261022_006_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_006 되돌리기 — 송연 테넌트의 tb_user 줄을 지운다(적용 전 0건).
-- 주의
--   - 결재 · 결재선 · 기안양식 담당자가 tb_user 를 가리키기 시작한 뒤라면 결재 이력이 사람을 잃는다. 확인하고 돌린다.
--   - 로그인 매퍼(actionLoginEmployee)는 tb_user 가 없으면 사번을 uniqId 로 쓰므로 로그인은 계속된다.

BEGIN;

DELETE FROM tb_user u
USING tb_tenant t
WHERE t.tenant_id = u.tenant_id
  AND t.tenant_code = 'SONGYEON';

COMMIT;
