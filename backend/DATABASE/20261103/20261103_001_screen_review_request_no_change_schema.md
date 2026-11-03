# 20261103_001 화면검수 요청 번호 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-03 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 컬럼 추가 · 제약 추가 · 데이터 채우기 |
| 대상 표 | `tb_screen_review_history` |
| 적용 | 2026-11-03 적용 완료 (트랜잭션 시험 실행: 기존 수정요청 2줄에 1 · 2, 다시 적용해도 같음, 같은 번호는 막힘, 롤백하면 처음과 같음 확인 후 적용) |
| 롤백 | `20261103_001_rollback.sql` |

## 내용

- 요청: 한 화면에 여러 사람이 수정요청을 올렸을 때 이력에서 요청을 짚을 수 있게 "요청등록은 시간으로 하던가 순번을 먹이던가". 사용자 결정: 요청 번호를 이력에 저장(B).
- 설계: [20261103_001_화면검수_요청번호_설계서.md](../../spec/20261103/20261103_001_화면검수_요청번호_설계서.md)

| 변경 | 내용 |
|---|---|
| 칸 | `request_no integer NULL`: 수정요청(`to_status = 'CHANGE_REQUESTED'`) 줄에만 값, 다른 줄은 NULL |
| 제약 | `uk_screen_review_history_request_no UNIQUE (review_id, request_no)`: 한 화면 안에서 번호가 겹치지 않게 |
| 채우기 | 이미 있는 수정요청 줄에 `history_id` 순서로 화면마다 1부터 (번호가 있으면 그 뒤로 이어서) |

- 번호는 화면마다 1부터, 검수완료 뒤에 다시 수정요청이 들어와도 이어서 매긴다.
- 새 번호는 저장할 때 서버가 검수현황 줄을 잠근 뒤 `max(request_no) + 1`로 매긴다.

## 같이 바뀐 코드

| 영역 | 위치 |
|---|---|
| 백엔드 | `ScreenReviewServiceImpl.save` (수정요청이면 번호 매김), `ScreenReviewDAO.selectNextRequestNo`, 매퍼 `insertHistory` · `selectHistoryList` · `selectNextRequestNo`, `ScreenReviewHistoryVO.requestNo` |
| 프론트 | `shared/components/screen-review` 검수 이력 머리줄: `요청 N` · 일시 · `수정요청 추가` |

## 영향 범위

- `tb_screen_review_history` 만 바뀐다. 다른 칸 · 줄은 그대로.
- 배포: DB · war · 프론트를 함께 올려야 한다. DB만 먼저 올려도 예전 서버는 이 칸을 쓰지 않아 동작한다(새 수정요청 줄에 번호가 비어 남는다 — 그 경우 이 스크립트를 다시 돌리면 채워진다).
