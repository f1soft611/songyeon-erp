# 20261102_003 화면검수 테이블 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 테이블 삭제 · 생성(빈 테이블 4개 삭제, 테이블 3개 생성) |
| 대상 표 | 삭제: `tb_screen_review`(3단계 모양) · `tb_screen_review_history`(3단계) · `tb_screen_review_draft`(3단계) · `tb_screen_change_request` / 생성: `tb_screen_review` · `tb_screen_review_history` · `tb_screen_review_draft` |
| 적용 | 2026-11-02 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음, 다른 테이블 · 공통 파일 행 그대로 확인 후 적용) |
| 롤백 | `20261102_003_rollback.sql` |

## 내용

- 요청: "저장로직만들어줘 api까지". 사용자 결정은 지금 화면에 맞게 테이블을 바꾸고 바로 적용하는 것.
- 적용 전 상태: 설계서 2차(요구반영 · 기능점검 · 현업검수 3단계) 모양의 테이블 4개가 저장소 스크립트 없이 만들어져 있었다. 모두 0행이었다.
- 스크립트는 예전 모양 테이블에 한 줄이라도 있으면 멈춘다.
- 지금 화면은 화면당 상태 하나다. 흐름은 업체 수정요청 → 개발사 검수진행중 → 업체 검수완료.

| 테이블 | 한 줄 | 주요 컬럼 |
|---|---|---|
| `tb_screen_review` | 화면당 1줄 (`UNIQUE tenant_id, menu_id`) | `review_status`, `reviewer_user_id`, `review_date`, `request_date`, `developer_name`, `dev_completed_date` |
| `tb_screen_review_history` | 저장할 때마다 1줄, 고치거나 지우지 않음 | `from_status`, `to_status`, `review_comment`, `reviewer_user_id`, `review_date` |
| `tb_screen_review_draft` | 화면 + 작성자당 1줄 (`UNIQUE tenant_id, menu_id, writer_user_id`) | `review_comment` (상태 칸 없음) |

- 상태값: `NOT_STARTED` 미검수, `IN_PROGRESS` 검수진행중, `CHANGE_REQUESTED` 수정요청, `COMPLETED` 검수완료 (CHECK 제약).
- 검수자 · 작성자는 로그인 사용자 번호 `tb_user.user_id` (FK). 이름은 조회할 때 `tb_user.user_nm`.
- 요청일은 수정요청으로 바꾼 날을 서버가 넣는다. 개발담당 · 개발완료일은 개발사가 따로 넣는다(화면에서는 보기만).
- 첨부는 `tb_common_file`을 그대로 쓴다(컬럼 변경 없음): 이력 `SCREEN_REVIEW` + `history_id`, 임시저장 `SCREEN_REVIEW_DRAFT` + `draft_id`. 저장하면 서버가 임시저장 첨부를 이력으로 옮긴다.

## 같이 바뀐 코드

| 영역 | 위치 |
|---|---|
| API | `GET` · `POST /api/v1/system/screen-reviews/{화면ID}`, `PUT /api/v1/system/screen-reviews/{화면ID}/draft` |
| 백엔드 | `let/system/screenreview` (controller · service · DAO · VO), 매퍼 `mapper/let/system/screenreview/ScreenReview_SQL_postgresql.xml` |
| 프론트 | `shared/components/screen-review` (패널 · 서비스), `PageHeader`의 `screenReview` 속성, 포장유형 화면에서 켬 |

## 영향 범위

- 기존 화면 · 테이블에는 영향 없다. 예전 모양 테이블은 비어 있었고 쓰는 코드가 없었다.
- `tb_menu` · `tb_user` FK 때문에 검수 자료가 있는 메뉴 · 사용자는 지울 수 없다.
- 배포: DB(적용 완료) · war · 프론트를 함께 올려야 화면검수 저장이 된다.
- 첨부: 2026-11-02 시험 때 송연 백엔드의 MinIO 계정이 `document-attachments` 버킷에 쓰기 403 으로 막혀 업로드가 되지 않았다. 상태 · 의견 저장은 된다.
- 시험 자료(현황 1줄 · 이력 3줄)는 확인 뒤 지웠다.
