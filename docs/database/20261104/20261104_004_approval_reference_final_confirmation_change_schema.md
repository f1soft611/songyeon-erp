# 20261104_004 전자결재 참조자 확인 · 참조 추가 · 기안자 최종확인 제약 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 제약 · 인덱스 변경(새 표 · 칸 · 데이터 변경 없음) |
| 대상 표 | `tb_electronic_approval_line_info`, `tb_common_comment` |
| 적용 | 2026-11-04 적용 완료(시험 실행 통과 뒤 사용자 승인) |
| 롤백 | `20261104_004_rollback.sql` |

## 내용

- 요청: S_ERP 결재 기능(참조자 확인 · 참조 추가 · 기안자 최종확인)을 송연에 넣는다.
- 송연 결재 DB 는 S_ERP 10-28 수준이라 S_ERP `20261029_001`(참조자 `CONFIRMED` · `REFERENCE_CONFIRMED`), `20261030_006`(`REFERENCE_ADDED`), `20261102_003`(`FINAL_CONFIRMATION`)이 모두 빠져 있다. 마지막 `20261102_003` 이 두 CHECK 를 최종 모양으로 다시 만들므로 그 내용을 한 번에 쓴다.
- 송연에 맞춘 점: 다시 적용해도 같도록 참여자 유일 인덱스를 먼저 지우고 만든다. 사람 칸은 이미 사번(varchar)이라 바꾸지 않는다.

| 대상 | 바뀌는 것 |
|---|---|
| `chk_electronic_approval_line_participant_type` | `FINAL_CONFIRMATION` 추가 |
| `chk_electronic_approval_line_action` | 참조자 `CONFIRMED`(확인 시각 필수), 최종확인 `WAITING` · `PENDING` · `CONFIRMED` 조합 추가 |
| `uq_electronic_approval_line_participant` | 유일 제약 → 최종확인 줄을 뺀 유일 인덱스(기안자가 결재자이면서 최종확인자일 수 있음) |
| `uq_electronic_approval_line_final_confirmation` | 새 유일 인덱스: 문서당 최종확인 1줄 |
| `chk_tb_common_comment_event_type` | `REFERENCE_CONFIRMED` · `REFERENCE_ADDED` · `FINAL_CONFIRMATION_CONFIRMED` 추가 |

## DB 확인 근거

- 읽기 전용으로 두 표의 CHECK · UNIQUE 정의와 인덱스를 확인했다(행 데이터는 보지 않음). 참조자는 상태 칸이 모두 비어야 하고, 이벤트 목록에 참조 · 최종확인 이벤트가 없으며, 참여자 유일 제약 때문에 기안자 최종확인 줄을 넣을 수 없는 상태였다.
- 시험 실행(한 트랜잭션, 끝에 ROLLBACK): 다시 적용해도 같음, 결재자와 같은 사람의 최종확인 줄 들어감, 같은 문서 최종확인 두 번 · 같은 사람 일반 결재 두 번 막힘(23505), 확인 시각 없는 최종확인 · 참조자 확인 막힘(23514), 참조자 확인 들어감, 새 줄이 있으면 롤백이 멈춤, 롤백하면 처음 제약과 같음.

## 영향 범위

- 허용 범위만 넓어지므로 기존 결재 · 댓글 데이터와 화면에 영향 없음. 새 기능은 서버(war) · 프론트와 함께 배포해야 쓸 수 있다.
- 롤백: 참조자 확인 · 최종확인 줄이나 해당 이력이 남아 있으면 아무것도 지우지 않고 멈춘다(데이터 정리 방침을 먼저 정해야 함).
