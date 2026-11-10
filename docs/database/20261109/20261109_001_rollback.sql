-- 20261109_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261109_001 되돌리기 — 품질 서류 표 다섯 개를 지운다(쓴 점검표 · 답 · 기본 양식이 함께 지워진다).
-- 지우기 전에 남길 자료가 있는지 확인한다. 화면(pages/qm/haccp/prerequisite) · 서버(let/qm/haccp/prerequisite)도 함께 돌린다.

BEGIN;

DROP TABLE IF EXISTS public.qdoc_answer;
DROP TABLE IF EXISTS public.qdoc_record;
DROP TABLE IF EXISTS public.qdoc_item;
DROP TABLE IF EXISTS public.qdoc_version;
DROP TABLE IF EXISTS public.qdoc_form;

COMMIT;
