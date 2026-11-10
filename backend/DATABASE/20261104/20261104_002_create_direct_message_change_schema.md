# 20261104_002 쪽지 표 만들기 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 새 테이블 |
| 대상 표 | `tb_direct_message_thread`(새로), `tb_direct_message`(새로) |
| 적용 | 2026-11-04 적용 완료(시험 실행 통과: 다시 적용해도 같음, 사번으로 대화방 · 쪽지 · 쪽지 알림 넣기, 순서 거꾸로 · 없는 사번 · 나에게 보내기 · 빈 내용 · 없는 대화방 막힘, 대화방을 지우면 쪽지도 지워짐, 롤백하면 표 · 쪽지 알림 없음) |
| 롤백 | `20261104_002_rollback.sql` |

## 내용

- 요청: S_ERP 알림함 · 쪽지함을 송연에 넣는다(2단계: 쪽지함).
- S_ERP `20261030_005`(쪽지 두 표) · `20261030_009`(대화방 숨김 시각 `participant_a_hidden_at` · `participant_b_hidden_at`)을 합친 구조.
- 송연에 맞춘 점: 사람 칸 4개(`participant_a_user_id` · `participant_b_user_id` · `sender_user_id` · `recipient_user_id`)를 S_ERP 의 `bigint → tb_user` 대신 `varchar(20) → employees.id`(사번, ON DELETE CASCADE).
- 두 사람 대화방은 하나: 참여자 a < b(사번 글자 순서)로 저장한다.

| 표 | 칸 | 설명 |
|---|---|---|
| `tb_direct_message_thread` | thread_id · tenant_id · participant_a/b_user_id · subject · created_at · updated_at · participant_a/b_hidden_at | 대화방. 숨김 시각 이전 쪽지는 그 사람에게 안 보인다 |
| `tb_direct_message` | message_id · tenant_id · thread_id · sender/recipient_user_id · content(1~5000자) · created_at · read_at | 쪽지. 대화방을 지우면 함께 지워진다 |

## 영향 범위

- 새 표라 기존 화면 · 데이터에 영향 없음. 서버(war) · 프론트와 함께 배포해야 쪽지를 쓸 수 있다.
- 쪽지를 받으면 알림(`tb_notification`, `DIRECT_MESSAGE_RECEIVED`)이 쌓인다(20261104_001 의 종류 그대로).
- 롤백: 쪽지 표와 쪽지 알림을 지운다.
