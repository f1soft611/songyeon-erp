# 20261104_001 알림 표 만들기 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 새 테이블 |
| 대상 표 | `tb_notification`(새로) |
| 적용 | 2026-11-04 적용 완료(시험 실행 통과: 다시 적용해도 같음, 사번으로 넣기 · 같은 알림 한 번만, 없는 사번 · 맞지 않는 종류 · 빈 제목 막힘, 롤백하면 표 없음) |
| 롤백 | `20261104_001_rollback.sql` |

## 내용

- 요청: S_ERP 알림함 · 쪽지함을 송연에 넣는다(1단계: 알림함 + 결재 댓글 멘션).
- S_ERP `20261030_005`(tb_notification) · `20261030_008`(archived_at · 인덱스 2개)을 합친 구조.
- 송연에 맞춘 점: 받는 사람 `recipient_user_id` 를 S_ERP 의 `bigint → tb_user` 대신 `varchar(20) → employees.id`(사번, ON DELETE CASCADE). 20261103_003 사번 통일과 같은 기준.
- 알림 종류(CHECK): `APPROVAL_COMMENT_MENTION`/`APPROVAL_COMMENT`, `DIRECT_MESSAGE_RECEIVED`/`DIRECT_MESSAGE` (S_ERP 와 같음). 같은 원본 · 같은 사람 알림은 한 번만(UNIQUE).

| 칸 | 형식 | 설명 |
|---|---|---|
| notification_id | bigserial PK | 알림 번호 |
| tenant_id | bigint → tb_tenant | 회사(SONGYEON) |
| recipient_user_id | varchar(20) → employees | 받는 사람 사번 |
| event_type · source_type | varchar(40) · varchar(30) | 알림 종류 · 원본 종류 |
| source_id | bigint | 원본 ID(결재 댓글 · 쪽지) |
| title · summary | varchar(200) · varchar(500) | 제목 · 요약(빈 값 안 됨) |
| read_at · archived_at · created_at | timestamp | 읽은 · 지운 · 만든 시각 |

## 영향 범위

- 새 표라 기존 화면 · 데이터에 영향 없음. 서버(war) · 프론트와 함께 배포해야 알림이 쌓인다.
- 사원 줄을 지우면 그 사람 알림도 지워진다(CASCADE).
- 롤백: 표를 지운다(쌓인 알림도 지워짐).
