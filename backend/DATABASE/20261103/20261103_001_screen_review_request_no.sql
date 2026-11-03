-- 20261103_001_screen_review_request_no.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 화면검수 이력에 요청 번호(request_no)를 둔다
--       (2026-11-03 사용자 결정: 한 화면에 여러 사람이 수정요청을 올리면 "요청 1, 요청 2"로 짚을 수 있게 번호를 저장)
--   1) tb_screen_review_history.request_no integer NULL 추가
--        수정요청(to_status = 'CHANGE_REQUESTED') 줄에만 값이 있다. 다른 줄은 NULL
--        번호는 화면(review_id)마다 1부터, 검수완료 뒤에도 이어서 매긴다. 저장할 때 서버가 매긴다
--   2) (review_id, request_no) 유일 제약: 한 화면 안에서 번호가 겹치지 않게
--   3) 이미 있는 수정요청 줄에 history_id 순서로 번호를 채운다(그 화면에 번호가 있으면 그 뒤로 이어서)
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 1) 칸
ALTER TABLE tb_screen_review_history
    ADD COLUMN IF NOT EXISTS request_no integer NULL;

COMMENT ON COLUMN tb_screen_review_history.request_no IS '요청 번호: 수정요청 줄에만, 화면(review_id)마다 1부터';

-- 2) 유일 제약
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_screen_review_history_request_no') THEN
        ALTER TABLE tb_screen_review_history
            ADD CONSTRAINT uk_screen_review_history_request_no UNIQUE (review_id, request_no);
    END IF;
END $$;

-- 3) 이미 있는 수정요청 줄 채우기
UPDATE tb_screen_review_history H
   SET request_no = N.request_no
  FROM (
        SELECT A.history_id
             , COALESCE(M.max_no, 0) + ROW_NUMBER() OVER (PARTITION BY A.review_id ORDER BY A.history_id) AS request_no
          FROM tb_screen_review_history A
          LEFT JOIN (SELECT review_id, MAX(request_no) AS max_no
                       FROM tb_screen_review_history
                      GROUP BY review_id) M
            ON M.review_id = A.review_id
         WHERE A.to_status = 'CHANGE_REQUESTED'
           AND A.request_no IS NULL
       ) N
 WHERE H.history_id = N.history_id;

COMMIT;
