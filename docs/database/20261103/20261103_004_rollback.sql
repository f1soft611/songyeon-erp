-- 20261103_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261103_004_screen_review_completed_reset.sql 되돌리기
--   마지막 이력이 검수완료인 미검수 현황을 검수완료로, 요청일은 마지막으로 수정요청으로 바꾼 날(수정요청 추가 제외)로 되돌린다
--   서버 코드도 함께 돌려야 한다(아니면 다음 검수완료부터 다시 미검수가 된다)

BEGIN;

UPDATE tb_screen_review r
   SET review_status = 'COMPLETED'
     , request_date  = (SELECT max(h.review_date)
                          FROM tb_screen_review_history h
                         WHERE h.review_id = r.review_id
                           AND h.to_status = 'CHANGE_REQUESTED'
                           AND h.from_status <> 'CHANGE_REQUESTED')
     , updated_at    = now()
 WHERE r.review_status = 'NOT_STARTED'
   AND (SELECT h.to_status
          FROM tb_screen_review_history h
         WHERE h.review_id = r.review_id
         ORDER BY h.history_id DESC
         LIMIT 1) = 'COMPLETED';

COMMIT;
