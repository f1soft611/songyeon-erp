-- 20261019_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_002 되돌리기 — 백업 표의 값으로 등록자 · 수정자를 되돌리고 백업 표를 지운다. 수정일시는 그대로 둔다(트리거를 잠시 끈다).
-- 주의: 코드는 사번을 넣고 사번으로 이름을 찾는다. 값만 되돌리면 그 줄은 화면에 로그인 아이디가 그대로 보인다.

BEGIN;

ALTER TABLE tb_box_type DISABLE TRIGGER tg_box_type_upd;

UPDATE tb_box_type b
SET reg_user_id = k.reg_user_id,
    upd_user_id = k.upd_user_id
FROM bak_20261019_002_box_type_user k
WHERE k.box_type_id = b.box_type_id;

ALTER TABLE tb_box_type ENABLE TRIGGER tg_box_type_upd;

DROP TABLE IF EXISTS bak_20261019_002_box_type_user;

COMMIT;
